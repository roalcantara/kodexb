import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Profile } from '@kb/workflow-core'
import {
  autoFillValues,
  canAutoFill,
  dedupQuestions,
  ENVELOPE_SCHEMA_VERSION,
  type Envelope,
  evaluateEvidence,
  persistMachineSnapshot,
  type SnapshotIO,
  workflowMachine
} from '@kb/workflow-core'
import { createActor } from 'xstate'
import { loadInsights, mergeInsightsIntoStageMemory } from './agent_memory.script.ts'
import { readSharedMemory, writeSharedMemory, writeStageMemory } from './memory.script.ts'
import { orchestratedRunProviders } from './orchestrator_providers.script.ts'
import { readEnvelopeFile, seedDispatchedKeys } from './orchestrator_resume.script.ts'
import { writeRunRetrospective } from './orchestrator_retro.script.ts'
import { ensureRunDir, type PersistenceConfig, readStateSnapshot, writeStateSnapshot } from './persistence.script.ts'
import { spawnTeardownFireAndForget, type TeardownHandle } from './teardown_runner.script.ts'
import { invokeWithTelemetry } from './workflow_invoker.script.ts'
import { generateRunId, slugFromFeatureDir, WorkflowRunWriter } from './workflow_run.script.ts'

const ALL_QUESTIONS_ID = '__all__'

const HEX_RADIX = 16
const DEFAULT_TEARDOWN_TIMEOUT_MS = 30000

function loadInsightsSafe(catalogPath: string): ReturnType<typeof loadInsights> {
  try {
    return loadInsights(catalogPath)
  } catch {
    return []
  }
}

export type StageCommandMap = Record<string, string>

export type OrchestratorConfig = {
  profile: Profile
  stageCommands: StageCommandMap
  featureDir: string
  persistenceConfig: PersistenceConfig
  runId?: string
  dateStr?: string
  continueOnBlocked?: boolean
  catalogPath?: string
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
  readonly catalogPath: string
  readonly catalogInsights: ReturnType<typeof loadInsights>
  private dispatchedKeys = new Set<string>()
  private teardownHandles: TeardownHandle[] = []

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
    this.catalogPath =
      config.catalogPath ??
      (config.persistenceConfig.metricsDir
        ? path.join(config.persistenceConfig.metricsDir, '..', '..', 'assets', 'catalog', 'agent_memory.yaml')
        : path.resolve('assets/catalog/agent_memory.yaml'))

    this.catalogInsights = loadInsightsSafe(this.catalogPath)
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

  private seedDispatchedKeysFromDisk(): void {
    seedDispatchedKeys(this.runDir, this.runId, this.config.stageCommands, key => this.dispatchedKeys.add(key))
  }

  dispatchStageCommand(stage: string): Envelope | null {
    const command = this.config.stageCommands[stage]
    if (!command) return null

    const envPath = this.envelopePath(stage)
    const existingEnvelope = readEnvelopeFile(envPath)
    const idempotencyKey = existingEnvelope?.idempotency_key ?? `${this.runId}:${stage}:${command}`

    if (this.dispatchedKeys.has(idempotencyKey)) {
      return existingEnvelope
    }

    if (existingEnvelope) {
      this.dispatchedKeys.add(idempotencyKey)
      return existingEnvelope
    }

    this.dispatchedKeys.add(idempotencyKey)

    const stageDef = this.profile.stages.find(s => s.id === stage)
    const sandbox = stageDef?.sandbox

    const result = invokeWithTelemetry(
      { command, cwd: process.cwd() },
      this.allowedPrefixes,
      'trigger.pre',
      stage,
      {
        writer: this.writer,
        featureDir: this.config.featureDir
      },
      sandbox
    )

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

    if (!existsSync(envPath)) return null

    return readEnvelopeFile(envPath)
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
      contentHash: (c: string) => Bun.hash(c).toString(HEX_RADIX)
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
    const io: SnapshotIO = {
      readSnapshot: readStateSnapshot,
      writeSnapshot: writeStateSnapshot
    }
    persistMachineSnapshot(
      this.actor,
      this.config.persistenceConfig,
      io,
      this.runId,
      this.dateStr,
      this.profile.name,
      this.profile.schema_version,
      this.startedAt,
      shared
    )
  }

  runProviders(t0: number): boolean {
    return orchestratedRunProviders(
      this.profile,
      this.allowedPrefixes,
      this.writer,
      this.config.featureDir,
      this.runId,
      t0,
      this.config.persistenceConfig.rootDir,
      this.dateStr
    )
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, refactor deferred
  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: pre-existing large function, refactor deferred
  run(): void {
    this.actor = createActor(workflowMachine, { input: {} })
    this.actor.start()

    this.seedDispatchedKeysFromDisk()

    const t0 = performance.now()
    const stageOrder = this.stageOrder()

    const sigHandler = (signal: string) => {
      this.shutdown(signal).catch(() => {
        /* fire-and-forget */
      })
      this.shutdownRequested = true
    }
    const onSigInt = () => sigHandler('SIGINT')
    const onSigTerm = () => sigHandler('SIGTERM')
    process.on('SIGINT', onSigInt)
    process.on('SIGTERM', onSigTerm)

    if (this.catalogInsights.length > 0) {
      for (const stageId of stageOrder) {
        writeStageMemory(
          this.config.persistenceConfig.rootDir,
          this.dateStr,
          this.runId,
          stageId,
          mergeInsightsIntoStageMemory(this.catalogInsights, {})
        )
      }
    }

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

      if (stageDef.triggers?.post) {
        const postResult = invokeWithTelemetry(
          { command: stageDef.triggers.post, cwd: process.cwd() },
          this.allowedPrefixes,
          'trigger.post',
          stageId,
          { writer: this.writer, featureDir: this.config.featureDir },
          stageDef.sandbox
        )
        this.writer.emit({
          type: 'task.completed',
          run_id: this.runId,
          ts: new Date().toISOString(),
          feature_dir: this.config.featureDir,
          command: stageDef.triggers.post,
          role: 'trigger.post',
          stage: stageId,
          exit_code: postResult.exitCode ?? undefined,
          status: postResult.exitCode === 0 ? 'ok' : 'fail',
          duration_ms: postResult.durationMs
        })
      }

      if (stageDef.teardown && stageDef.teardown.length > 0) {
        this.actor.send({ type: 'TEARDOWN.QUEUED', tasks: stageDef.teardown })
        const timeout = stageDef.teardown_timeout_ms ?? DEFAULT_TEARDOWN_TIMEOUT_MS
        for (const tdCmd of stageDef.teardown) {
          const handle = spawnTeardownFireAndForget(
            { command: tdCmd, cwd: process.cwd(), timeout_ms: timeout },
            this.allowedPrefixes,
            { writer: this.writer, featureDir: this.config.featureDir },
            stageId,
            timeout,
            () => {
              this.actor?.send({ type: 'TEARDOWN.COMPLETED', task_id: tdCmd })
            }
          )
          this.teardownHandles.push(handle)
        }
      }

      this.writer.emit({
        type: 'stage.exited',
        run_id: this.runId,
        ts: new Date().toISOString(),
        feature_dir: this.config.featureDir,
        duration_ms: performance.now() - t0,
        stage: stageId
      })
    }

    const ciPassed = this.runProviders(t0)

    // Terminal outcome: if the state machine is terminal, emit the summary.
    // When CI fails (ciPassed === false), force terminal_failure regardless of
    // machine state — CI gate failure overrides non-terminal snapshots.
    const finalSnapshot = this.actor.getSnapshot()
    if (finalSnapshot.matches('terminal_success') || finalSnapshot.matches('terminal_failure') || !ciPassed) {
      const outcome =
        ciPassed && finalSnapshot.matches('terminal_success')
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

    const terminated =
      finalSnapshot.matches('terminal_success') ||
      finalSnapshot.matches('terminal_failure') ||
      finalSnapshot.matches('blocked')
    if (terminated || !ciPassed)
      writeRunRetrospective(
        this.writer.currentPath,
        this.runId,
        this.dateStr,
        this.config.persistenceConfig,
        this.catalogPath
      )

    this.persistSnapshot()

    process.off('SIGINT', onSigInt)
    process.off('SIGTERM', onSigTerm)
  }

  async shutdown(signal: string): Promise<void> {
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
    for (const handle of this.teardownHandles) handle.abort()
    await Bun.sleep(this.profile.shutdown.grace_ms)
    this.writer.emit({
      type: 'shutdown.completed',
      run_id: this.runId,
      ts: new Date().toISOString(),
      feature_dir: this.config.featureDir,
      duration_ms: 0,
      grace_ms: this.profile.shutdown.grace_ms
    })
  }
}
