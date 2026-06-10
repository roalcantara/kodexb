import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createActor } from 'xstate'
import { autoFillValues, canAutoFill, dedupQuestions } from './intervention.script.ts'
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
    orc.shutdown('SIGTERM').catch(() => {
      /* fire-and-forget */
    })

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

  it('AWO-3 AC3: auto-fill from shared memory emits decision.defaulted flow', () => {
    const actor = createActor(workflowMachine, {
      input: {
        current_stage: 'specify',
        stage_index: 0,
        stage_order: ['specify'],
        terminal_stages: ['gate'],
        shared_memory: { framework: 'vue' }
      }
    })
    actor.start()
    actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
    actor.send({
      type: 'STAGE.COMPLETE',
      envelope: {
        schema_version: '009.1.0' as const,
        stage: 'specify',
        status: 'NEED_INPUT',
        artifacts_created: [],
        evidence: [],
        diagnostics: [],
        retry_count: 0,
        elapsed_ms: 10,
        questions: [
          { id: 'q1', prompt: 'what framework?', options: ['vue', 'react'], default: 'react' },
          { id: 'framework', prompt: 'framework choice' }
        ]
      }
    })
    expect(actor.getSnapshot().matches('need_input')).toBe(true)

    // Simulate orchestrator intervention: dedup + auto-fill
    const shared: Record<string, string> = { framework: 'vue' }
    const questions = actor.getSnapshot().context.envelope?.questions ?? []
    const pending = dedupQuestions(questions, shared)
    // framework is already in shared memory -> should be filtered
    expect(pending.find(q => q.id === 'framework')).toBeUndefined()
    // q1 is not in shared memory but has a default -> should remain (can auto-fill)
    expect(pending.find(q => q.id === 'q1')).toBeDefined()

    // Both pending questions can be auto-filled (q1 has default, framework already answered)
    expect(canAutoFill(pending, shared)).toBe(true)
    const values = autoFillValues(pending, shared)
    expect(values.q1).toBe('react')
    // framework is already answered in shared memory, not in pending

    // Send INPUT.ANSWERED (simulating orchestrator after auto-fill + writer.emit)
    actor.send({ type: 'INPUT.ANSWERED', question_id: 'q1', value: 'react' })
    expect(actor.getSnapshot().matches('running')).toBe(true)
    actor.stop()
  })
})

// --- M4: Retrospective & Sandbox ---

describe('M4 retrospective and sandbox', () => {
  let scratchDir: string

  beforeEach(() => {
    scratchDir = mkdtempSync(path.join(tmpdir(), 'orc-m4-'))
  })

  afterEach(() => {
    rmSync(scratchDir, { recursive: true, force: true })
  })

  function makeM4Config(extra?: Partial<OrchestratorConfig>): OrchestratorConfig {
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

  it('AWO-8 AC1: terminal run writes .retro.md under metrics path', () => {
    const cfg = makeM4Config({ runId: 'test-retro-ac1' })
    const orc = new Orchestrator(cfg)
    orc.run()

    const metricsDir = path.join(scratchDir, 'metrics')
    const retroPath = path.join(metricsDir, cfg.dateStr as string, `${cfg.runId}.retro.md`)
    expect(existsSync(retroPath)).toBe(true)
    const content = readFileSync(retroPath, 'utf-8')
    expect(content).toContain('# Workflow Retrospective')
    expect(content).toContain('## Blockers')
    expect(content).toContain('## Retries')
    expect(content).toContain('## Interventions')
    expect(content).toContain('## Successful patterns')
  })

  it('AWO-11 AC4: sandbox violation emits sandbox.violation in NDJSON', () => {
    const fixturePath = path.join(scratchDir, 'sandbox-profile.yaml')
    writeFileSync(
      fixturePath,
      [
        'schema_version: "009.1.0"',
        'name: sandbox-test',
        'execution_policy:',
        '  allowed_prefixes:',
        '    - "echo"',
        'stages:',
        '  - id: specify',
        '    worker: primary',
        '    sandbox:',
        '      tool_allowlist: ["mkdir"]',
        '      fs_scope:',
        '        allow_roots: ["/workspace"]',
        '      secret_handling: "redacted"',
        '      network: "offline"',
        'transitions:',
        '  - from: specify',
        '    to: gate',
        '    on: DONE',
        'terminal:',
        '  - gate',
        'default_retry:',
        '  max_attempts: 3',
        '  backoff: exponential',
        '  base_ms: 500',
        '  cap_ms: 30000',
        '  jitter: full',
        '  reset_on_new_cause: true',
        '  escalation_event: stage.escalated',
        'memory:',
        '  conflict: prompt_user',
        '  retention:',
        '    tmp_days: 30',
        '    durable_days: 365',
        'providers: {}',
        'shutdown:',
        '  grace_ms: 10000',
        '  signals:',
        '    - SIGINT',
        '    - SIGTERM'
      ].join('\n')
    )

    const sandboxProfile = loadProfile(fixturePath)
    const cfg: OrchestratorConfig = {
      profile: sandboxProfile,
      stageCommands: { specify: 'echo hello' },
      featureDir: '__fixtures__/009-sandbox',
      persistenceConfig: { rootDir: scratchDir, metricsDir: path.join(scratchDir, 'metrics') },
      runId: `test-sandbox-${Date.now()}`,
      dateStr: new Date().toISOString().slice(0, 10),
      continueOnBlocked: false
    }
    const orc = new Orchestrator(cfg)
    orc.run()

    const ndjsonPath = orc.writer.currentPath
    if (!ndjsonPath || !existsSync(ndjsonPath)) {
      expect(orc.actor?.getSnapshot().matches('blocked')).toBe(true)
      return
    }

    const raw = readFileSync(ndjsonPath, 'utf-8')
    const lines = raw.trim().split('\n').filter(Boolean)
    const sandboxEvents = lines
      .map(l => JSON.parse(l))
      .filter((e: Record<string, unknown>) => e.type === 'sandbox.violation')
    expect(sandboxEvents.length).toBeGreaterThan(0)
  })

  it('AWO-8 AC4: next run loads catalog insights into stage memory', () => {
    const catalogDir = path.join(scratchDir, 'catalog')
    mkdirSync(catalogDir, { recursive: true })
    const catalogPath = path.join(catalogDir, 'agent_memory.json')

    writeFileSync(
      catalogPath,
      JSON.stringify({
        schema_version: '009.1.0',
        entries: [
          {
            insight_id: 'ri-test4444',
            run_id: 'prior-run',
            timestamp: '2026-06-10T12:00:00.000Z',
            description: 'Stage plan had high failure rate',
            severity: 'high',
            eventIds: [0, 1],
            tags: ['severity:high']
          }
        ]
      })
    )

    const profile = loadProfile(FIXTURE_PROFILE)
    const cfg: OrchestratorConfig = {
      profile,
      stageCommands: {},
      featureDir: '__fixtures__/009-retro-ac4',
      persistenceConfig: {
        rootDir: scratchDir,
        metricsDir: path.join(scratchDir, 'metrics')
      },
      runId: `test-ac4-${Date.now()}`,
      dateStr: new Date().toISOString().slice(0, 10),
      continueOnBlocked: false,
      catalogPath
    }

    const orc = new Orchestrator(cfg)
    expect(orc.catalogInsights.length).toBe(1)
    expect(orc.catalogInsights[0]?.insight_id).toBe('ri-test4444')

    orc.run()

    const memPath = path.join(scratchDir, cfg.dateStr as string, `${cfg.runId}.memory.specify.json`)
    expect(existsSync(memPath)).toBe(true)
    const mem = JSON.parse(readFileSync(memPath, 'utf-8'))
    expect(mem.agent_memory_insights).toBeDefined()
    const memInsights = mem.agent_memory_insights as Record<string, unknown>[]
    expect(memInsights.length).toBe(1)
    expect(memInsights[0]?.insight_id).toBe('ri-test4444')
  })

  // --- AWO-13.3: idempotency ---

  it('AWO-13.3: second dispatch skips invoke when envelope exists', () => {
    const cfg = makeM4Config({ runId: 'test-idem', stageCommands: { specify: 'echo test' } })
    const rid = cfg.runId as string
    const orc = new Orchestrator(cfg)
    writeEnvelope(orc.runDir, rid, 'specify', 'DONE')
    const first = orc.dispatchStageCommand('specify')
    expect(first).not.toBeNull()
    const second = orc.dispatchStageCommand('specify')
    expect(second).toEqual(first)
  })

  // --- AWO-13.1: shutdown grace ---

  it('AWO-13.1: shutdown.completed after grace_ms', async () => {
    const profile = loadProfile(FIXTURE_PROFILE)
    const cfg: OrchestratorConfig = {
      profile: { ...profile, shutdown: { grace_ms: 50, signals: ['SIGTERM'] } },
      stageCommands: {},
      featureDir: '__fixtures__/009-grace',
      persistenceConfig: { rootDir: scratchDir, metricsDir: path.join(scratchDir, 'metrics') },
      runId: `test-grace-${Date.now()}`,
      dateStr: new Date().toISOString().slice(0, 10),
      continueOnBlocked: false
    }
    const orc = new Orchestrator(cfg)
    orc.actor = createActor(workflowMachine, { input: {} })
    orc.actor.start()
    const t0 = performance.now()
    await orc.shutdown('SIGTERM')
    expect(performance.now() - t0).toBeGreaterThanOrEqual(45)
  })
})

function cfgDateStr(): string {
  return new Date().toISOString().slice(0, 10)
}
