import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createActor } from 'xstate'
import { workflowMachine } from './workflow/machine.script.ts'
import { hydrateMachineActor, persistMachineSnapshot } from './workflow/snapshot.script.ts'
import { applyResumeAnswer, parseWorkflowArgs } from './workflow_run.script.ts'

const RUN_ID = 'test-resume-001'
const DATE_STR = '2026-06-10'
const FIXTURE_RUN_DIR = 'tmp/workflow-runs'

describe('parseWorkflowArgs', () => {
  let origExit: typeof process.exit

  beforeEach(() => {
    origExit = process.exit
    process.exit = (() => {
      throw new Error('exit')
    }) as typeof process.exit
  })

  afterEach(() => {
    process.exit = origExit
  })

  it('parses --answer qid=value', () => {
    const args = parseWorkflowArgs(['resume', '--answer', 'q1=react'])
    expect(args.answer).toBe('q1=react')
  })

  it('parses --run-id with value', () => {
    const args = parseWorkflowArgs(['resume', '--run-id', 'test-run-001'])
    expect(args.runId).toBe('test-run-001')
  })

  it('parses --approve with stage', () => {
    const args = parseWorkflowArgs(['resume', '--approve', 'specify'])
    expect(args.approve).toBe('specify')
  })

  it('infers name from first non-flag arg', () => {
    const args = parseWorkflowArgs(['resume'])
    expect(args.name).toBe('resume')
  })

  it('exits when --answer is missing its value', () => {
    expect(() => parseWorkflowArgs(['resume', '--answer', '--run-id'])).toThrow()
  })

  it('exits when --run-id is missing its value', () => {
    expect(() => parseWorkflowArgs(['resume', '--run-id', '--approve'])).toThrow()
  })

  it('exits when --approve is missing its value', () => {
    expect(() => parseWorkflowArgs(['resume', '--approve', '--run-id'])).toThrow()
  })
})

describe('applyResumeAnswer', () => {
  let scratch: string
  let runDir: string

  beforeEach(() => {
    scratch = mkdtempSync(path.join(tmpdir(), 'resume-test-'))
    runDir = path.join(scratch, FIXTURE_RUN_DIR)
  })

  afterEach(() => {
    try {
      rmSync(scratch, { recursive: true, force: true })
    } catch {
      /* best-effort */
    }
  })

  function makeNeedInputFixture() {
    const dateDir = path.join(runDir, DATE_STR)
    mkdirSync(dateDir, { recursive: true })

    const actor = createActor(workflowMachine, { input: {} })
    actor.start()
    actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
    actor.send({
      type: 'STAGE.COMPLETE',
      envelope: {
        schema_version: '009.1.0' as const,
        stage: 'specify',
        status: 'NEED_INPUT' as const,
        artifacts_created: [],
        evidence: [],
        diagnostics: [],
        retry_count: 0,
        elapsed_ms: 10,
        questions: [{ id: 'q1', prompt: 'choose one', options: ['a', 'b'] }]
      }
    })

    persistMachineSnapshot(
      actor,
      { rootDir: runDir, metricsDir: path.join(runDir, 'metrics') },
      RUN_ID,
      DATE_STR,
      'fixture-test',
      '009.1.0',
      new Date().toISOString()
    )
    actor.stop()

    const hydrated = hydrateMachineActor(
      workflowMachine,
      { rootDir: runDir, metricsDir: path.join(runDir, 'metrics') },
      RUN_ID,
      DATE_STR
    )
    if (!hydrated) throw new Error('failed to hydrate fixture')
    hydrated.actor.start()

    return hydrated
  }

  it('AWO-3 AC4: --answer writes shared memory and emits decision.answered', () => {
    const hydrated = makeNeedInputFixture()
    applyResumeAnswer(hydrated, 'q1=a', runDir, DATE_STR, RUN_ID)

    // Assert shared JSON was written
    const sharedPath = path.join(runDir, DATE_STR, `${RUN_ID}.shared.json`)
    expect(existsSync(sharedPath)).toBe(true)
    const shared = JSON.parse(readFileSync(sharedPath, 'utf-8'))
    expect(shared.q1).toBe('a')

    // Assert actor transitioned out of need_input
    const snap = hydrated.actor.getSnapshot()
    expect(snap.matches('running')).toBe(true)

    // Assert decision.answered in NDJSON
    const ndjsonPath = path.join(runDir, DATE_STR, `${RUN_ID}.ndjson`)
    expect(existsSync(ndjsonPath)).toBe(true)
    const lines = readFileSync(ndjsonPath, 'utf-8').trim().split('\n')
    const answeredEvents = lines.filter(l => l.includes('"decision.answered"'))
    expect(answeredEvents).toHaveLength(1)
    const answered = answeredEvents[0]
    if (!answered) throw new Error('expected answered event')
    const ev = JSON.parse(answered)
    expect(ev.question_id).toBe('q1')

    hydrated.actor.stop()
  })

  it('exits on malformed --answer (no = sign)', () => {
    const hydrated = makeNeedInputFixture()
    const origExit = process.exit
    process.exit = (() => {
      throw new Error('exit')
    }) as typeof process.exit
    try {
      expect(() => applyResumeAnswer(hydrated, 'badformat', runDir, DATE_STR, RUN_ID)).toThrow()
    } finally {
      process.exit = origExit
    }
    hydrated.actor.stop()
  })
})
