#!/usr/bin/env bun
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { Value } from '@sinclair/typebox/value'
import { createActor } from 'xstate'
import { evaluateEvidence } from './evidence.script.ts'
import { autoFillValues, canAutoFill, dedupQuestions } from './intervention.script.ts'
import { workflowMachine } from './machine.script.ts'
import { readSharedMemory, writeSharedMemory } from './memory.script.ts'
import { ensureRunDir, type PersistenceConfig } from './persistence.script.ts'
import { ENVELOPE_SCHEMA_VERSION, type Envelope, EnvelopeSchema } from './schemas/envelope.schema.ts'
import type { Profile } from './schemas/profile.schema.ts'
import { persistMachineSnapshot } from './snapshot.script.ts'
import { invokeWithTelemetry } from './workflow_invoker.script.ts'
import { generateRunId, slugFromFeatureDir, WorkflowRunWriter } from './workflow_run.script.ts'

const ALL_QUESTIONS_ID = '__all__'

export type StageCommandMap = Record<string, string>

export type OrchestratorConfig = {
  profile: Profile
  stageCommands: StageCommandMap
  featureDir: string
  persistenceConfig: PersistenceConfig
  runId?: string
  dateStr?: string
  continueOnBlocked?: boolean
}

export class Orchestrator {
  readonly config: OrchestratorConfig
  readonly profile: Profile
  readonly runId: string
  readonly dateStr: string
  readonly writer: WorkflowRunWriter
  readonly runDir: string
  readonly allowedPrefixes: string[]
  readonly startedAt: string

  actor: ReturnType<typeof createActor<typeof workflowMachine>> | null = null
  private shutdownRequested = false

  constructor(config: OrchestratorConfig) {
    this.config = config
    this.profile = config.profile
    this.allowedPrefixes = config.profile.execution_policy.allowed_prefixes
    this.dateStr = config.dateStr ?? new Date().toISOString().slice(0, 10)
    this.runId = config.runId ?? generateRunId(slugFromFeatureDir(config.featureDir))
    this.startedAt = new Date().toISOString()
    this.writer = new WorkflowRunWriter(this.runId, config.featureDir, config.persistenceConfig.rootDir)
    this.runDir = ensureRunDir(config.persistenceConfig, this.dateStr)
  }

  stageOrder(): string[] {
    return this.profile.stages.map(s => s.id)
  }

  terminalStages(): string[] {
    return this.profile.terminal
  }

  envelopePath(stage: string): string {
    return path.join(this.runDir, `${this.runId}.envelope.${stage}.json`)
  }

  dispatchStageCommand(stage: string): Envelope | null {
    const command = this.config.stageCommands[stage]
    if (!command) return null

    const result = invokeWithTelemetry({ command, cwd: process.cwd() }, this.allowedPrefixes, 'trigger.pre', stage, {
      writer: this.writer,
      featureDir: this.config.featureDir
    })

    if (result.exitCode !== 0) {
      this.writer.emit({
        type: 'task.completed',
        run_id: this.runId,
        ts: new Date().toISOString(),
        feature_dir: this.config.featureDir,
        command,
        role: 'trigger.pre',
        stage,
        exit_code: result.exitCode,
        status: result.rejected ? 'fail' : result.exitCode === 0 ? 'ok' : 'fail',
        duration_ms: result.durationMs
      })
    }

    const envPath = this.envelopePath(stage)
    if (!existsSync(envPath)) return null

    try {
      const raw = JSON.parse(readFileSync(envPath, 'utf-8'))
      if (!Value.Check(EnvelopeSchema, raw)) return null
      return raw as Envelope
    } catch {
      return null
    }
  }

  evidenceContext() {
    return {
      fileExists: (p: string) => existsSync(path.resolve(p)),
      readFile: (p: string) => {
        try {
          return readFileSync(p, 'utf-8')
        } catch {
          return null
        }
      },
      contentHash: (c: string) => Bun.hash(c).toString(16)
    }
  }

  runEvidenceCheck(envelope: Envelope): void {
    const context = this.evidenceContext()
    const results = evaluateEvidence(envelope, context)
    this.actor?.send({ type: 'EVIDENCE.CHECKED', results })
  }

  persistSnapshot(): void {
    if (!this.actor) return
    const shared = this.actor.getSnapshot().context.shared_memory
    writeSharedMemory(this.config.persistenceConfig.rootDir, this.dateStr, this.runId, shared)
    persistMachineSnapshot(
      this.actor,
      this.config.persistenceConfig,
      this.runId,
      this.dateStr,
      this.profile.name,
      this.profile.schema_version,
      this.startedAt,
      shared
    )
  }

  run(): void {
    this.actor = createActor(workflowMachine, { input: {} })
    this.actor.start()

    const t0 = performance.now()
    const stageOrder = this.stageOrder()

    for (const [i, stageId] of stageOrder.entries()) {
      if (this.shutdownRequested) break

      const stageDef = this.profile.stages.find(s => s.id === stageId)
      if (!stageDef) continue

      const isHumanGated = stageDef.human_gated === true

      this.writer.emit({
        type: 'stage.entered',
        run_id: this.runId,
        ts: new Date().toISOString(),
        feature_dir: this.config.featureDir,
        duration_ms: performance.now() - t0,
        stage: stageId
      })

      this.actor.send({
        type: 'STAGE.START',
        stage_id: stageId,
        stage_index: i,
        is_human_gated: isHumanGated
      })

      const envelope = this.dispatchStageCommand(stageId)

      if (!envelope) {
        this.actor.send({
          type: 'STAGE.COMPLETE',
          envelope: {
            schema_version: ENVELOPE_SCHEMA_VERSION,
            stage: stageId,
            status: 'BLOCKED',
            artifacts_created: [],
            evidence: [],
            diagnostics: [
              {
                code: 'ENVELOPE_MISSING',
                message: `envelope file not found: ${this.envelopePath(stageId)}`,
                severity: 'error'
              }
            ],
            retry_count: 0,
            elapsed_ms: 0
          }
        })
        this.persistSnapshot()

        if (!this.config.continueOnBlocked) break
        continue
      }

      this.actor.send({ type: 'STAGE.COMPLETE', envelope })

      const snapshot = this.actor.getSnapshot()
      if (snapshot.matches('evidence_pending')) {
        this.runEvidenceCheck(envelope)
      } else if (snapshot.matches('need_input')) {
        const env = snapshot.context.envelope
        const questions = env?.questions ?? []
        const rawShared = readSharedMemory(this.config.persistenceConfig.rootDir, this.dateStr, this.runId)
        const shared: Record<string, string> = {}
        for (const [k, v] of Object.entries(rawShared)) {
          shared[k] = typeof v === 'string' ? v : String(v ?? '')
        }
        const pending = dedupQuestions(questions, shared)

        if (pending.length === 0) {
          this.actor?.send({ type: 'INPUT.ANSWERED', question_id: ALL_QUESTIONS_ID, value: '' })
          this.persistSnapshot()
          continue
        }

        if (canAutoFill(pending, shared)) {
          const values = autoFillValues(pending, shared)
          const ts = new Date().toISOString()
          for (const q of pending) {
            const val = values[q.id] ?? ''
            shared[q.id] = val
            this.writer.emit({
              type: 'decision.defaulted',
              run_id: this.runId,
              ts,
              feature_dir: this.config.featureDir,
              duration_ms: 0,
              question_id: q.id,
              source: 'auto-fill',
              rationale: `auto-filled from shared memory: ${val}`
            })
          }
          writeSharedMemory(this.config.persistenceConfig.rootDir, this.dateStr, this.runId, shared)
          this.actor?.send({ type: 'INPUT.ANSWERED', question_id: ALL_QUESTIONS_ID, value: '' })
          this.persistSnapshot()
          continue
        }

        this.persistSnapshot()
        if (!this.config.continueOnBlocked) break
        continue
      } else if (snapshot.matches('blocked')) {
        this.persistSnapshot()
        if (!this.config.continueOnBlocked) break
        continue
      }

      this.persistSnapshot()

      this.writer.emit({
        type: 'stage.exited',
        run_id: this.runId,
        ts: new Date().toISOString(),
        feature_dir: this.config.featureDir,
        duration_ms: performance.now() - t0,
        stage: stageId
      })
    }

    const finalSnapshot = this.actor.getSnapshot()
    if (finalSnapshot.matches('terminal_success') || finalSnapshot.matches('terminal_failure')) {
      const outcome = finalSnapshot.matches('terminal_success')
        ? ('terminal_success' as const)
        : ('terminal_failure' as const)
      this.writer.emit({
        type: 'run.summary',
        run_id: this.runId,
        ts: new Date().toISOString(),
        feature_dir: this.config.featureDir,
        duration_ms: performance.now() - t0,
        outcome,
        lead_time_ms: performance.now() - t0,
        stage_durations_ms: {},
        interventions: 0,
        retries: 0
      })
    }

    this.persistSnapshot()
  }

  shutdown(signal: string): void {
    this.shutdownRequested = true
    this.writer.emit({
      type: 'shutdown.requested',
      run_id: this.runId,
      ts: new Date().toISOString(),
      feature_dir: this.config.featureDir,
      duration_ms: 0,
      signal
    })

    if (this.actor) {
      this.actor.send({ type: 'SHUTDOWN.REQUESTED', signal })
      this.persistSnapshot()
    }

    this.writer.emit({
      type: 'shutdown.completed',
      run_id: this.runId,
      ts: new Date().toISOString(),
      feature_dir: this.config.featureDir,
      duration_ms: 0
    })
  }
}
