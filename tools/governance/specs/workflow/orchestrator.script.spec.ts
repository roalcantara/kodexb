import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createActor } from 'xstate'
import { workflowMachine } from './machine.script.ts'
import { Orchestrator, type OrchestratorConfig } from './orchestrator.script.ts'
import { loadProfile } from './profile_loader.script.ts'
import { hydrateMachineActor, persistMachineSnapshot } from './snapshot.script.ts'

const FIXTURE_PROFILE = 'tools/__tests__/fixtures/workflow/fixture-profile.yaml'

function writeEnvelope(dir: string, runId: string, stage: string, status: string, extra?: Record<string, unknown>) {
  const envelope = {
    schema_version: '009.1.0',
    stage,
    status,
    artifacts_created: [],
    evidence: [{ kind: 'marker', ref: `${stage}-done.md` }],
    diagnostics: [],
    retry_count: 0,
    elapsed_ms: 10,
    ...extra
  }
  const filePath = path.join(dir, `${runId}.envelope.${stage}.json`)
  writeFileSync(filePath, JSON.stringify(envelope))
}

function makeOrchestratorConfig(scratchDir: string, extra?: Partial<OrchestratorConfig>): OrchestratorConfig {
  const profile = loadProfile(FIXTURE_PROFILE)
  return {
    profile,
    stageCommands: {},
    featureDir: '__fixtures__/009-workflow-orch',
    persistenceConfig: {
      rootDir: scratchDir,
      metricsDir: path.join(scratchDir, 'metrics')
    },
    runId: `test-${Date.now()}`,
    dateStr: new Date().toISOString().slice(0, 10),
    continueOnBlocked: false,
    ...extra
  }
}

describe('orchestrator integration', () => {
  let scratchDir: string

  beforeEach(() => {
    scratchDir = mkdtempSync(path.join(tmpdir(), 'orc-test-'))
  })

  afterEach(() => {
    rmSync(scratchDir, { recursive: true, force: true })
  })

  it('AWO-5 AC1: missing envelope file → BLOCKED, not crash', () => {
    const cfg = makeOrchestratorConfig(scratchDir, { runId: 'test-missing-env' })
    const orc = new Orchestrator(cfg)
    orc.run()
    const snap = orc.actor?.getSnapshot()
    expect(snap?.matches('blocked')).toBe(true)
    expect(snap?.context.error_message).toBeTruthy()
  })

  it('AWO-4 AC2: snapshot persist and hydrate', () => {
    const cfg = makeOrchestratorConfig(scratchDir, { runId: 'test-snapshot-cycle' })
    const rid = cfg.runId as string
    const dStr = cfg.dateStr as string
    writeEnvelope(scratchDir, rid, 'specify', 'DONE')
    const orc = new Orchestrator(cfg)
    orc.run()

    const snapPath = path.join(scratchDir, dStr, `${rid}.state.json`)
    expect(existsSync(snapPath)).toBe(true)

    const raw = JSON.parse(readFileSync(snapPath, 'utf-8'))
    expect(raw.run_id).toBe(rid)
    expect(raw.schema_version).toBe('009.1.0')
    expect(raw.xstate_snapshot).toBeTruthy()

    const hydrated = hydrateMachineActor(workflowMachine, cfg.persistenceConfig, rid, dStr)
    expect(hydrated).not.toBeNull()
    if (hydrated) {
      expect(hydrated.state.run_id).toBe(rid)
      hydrated.actor.start()
      expect(hydrated.actor.getSnapshot().context).toBeTruthy()
      hydrated.actor.stop()
    }
  })

  it('AWO-13 AC1: SHUTDOWN.REQUESTED from running transitions to blocked', () => {
    const actor = createActor(workflowMachine, { input: {} })
    actor.start()
    actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
    actor.send({ type: 'SHUTDOWN.REQUESTED', signal: 'SIGINT' })
    expect(actor.getSnapshot().matches('blocked')).toBe(true)
    expect(actor.getSnapshot().context.shutdown_requested).toBe(true)
    actor.stop()
  })

  it('orchestrator shutdown persists snapshot', () => {
    const cfg = makeOrchestratorConfig(scratchDir, { runId: 'test-orc-shutdown' })
    const rid = cfg.runId as string
    const dStr = cfg.dateStr as string
    const orc = new Orchestrator(cfg)
    orc.actor = createActor(workflowMachine, { input: {} })
    orc.actor.start()
    orc.actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
    orc.shutdown('SIGTERM')

    const snapPath = path.join(scratchDir, dStr, `${rid}.state.json`)
    expect(existsSync(snapPath)).toBe(true)
  })

  it('teardown tracking does not gate transitions', () => {
    const actor = createActor(workflowMachine, { input: {} })
    actor.start()
    actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
    actor.send({ type: 'TEARDOWN.QUEUED', tasks: ['cleanup'] })
    expect(actor.getSnapshot().context.teardown_remaining).toEqual(['cleanup'])
    actor.send({
      type: 'STAGE.COMPLETE',
      envelope: {
        schema_version: '009.1.0',
        stage: 'specify',
        status: 'DONE',
        artifacts_created: [],
        evidence: [],
        diagnostics: [],
        retry_count: 0,
        elapsed_ms: 10
      }
    })
    expect(actor.getSnapshot().matches('evidence_pending')).toBe(true)
    actor.stop()
  })

  it('persist then hydrate preserves context values', () => {
    const actor = createActor(workflowMachine, {
      input: {
        current_stage: 'specify',
        stage_index: 0,
        stage_order: ['specify'],
        terminal_stages: ['gate'],
        shared_memory: { testKey: 'testVal' }
      }
    })
    actor.start()
    actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })

    persistMachineSnapshot(
      actor,
      { rootDir: scratchDir, metricsDir: path.join(scratchDir, 'metrics') },
      'test-persist',
      cfgDateStr(),
      'fixture-test',
      '009.1.0',
      new Date().toISOString()
    )
    const hydrated = hydrateMachineActor(
      workflowMachine,
      { rootDir: scratchDir, metricsDir: path.join(scratchDir, 'metrics') },
      'test-persist',
      cfgDateStr()
    )
    expect(hydrated).not.toBeNull()
    if (hydrated) {
      hydrated.actor.start()
      expect(hydrated.actor.getSnapshot().context.shared_memory).toEqual({ testKey: 'testVal' })
      hydrated.actor.stop()
    }
    actor.stop()
  })
})

function cfgDateStr(): string {
  return new Date().toISOString().slice(0, 10)
}
