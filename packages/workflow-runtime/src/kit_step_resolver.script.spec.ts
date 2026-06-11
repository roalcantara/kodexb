import { afterEach, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { clearGate, isGateStage } from './kit_human_gate.script.ts'
import {
  ALL_CANONICAL_STAGES,
  type ResolvedStep,
  resolveNext,
  terminalStageSentinel
} from './kit_step_resolver.script.ts'

const FIXTURE = 'tools/__tests__/fixtures/workflow/smoke-feature'
const gatesDir = `${FIXTURE}/.gates`

function cleanGates() {
  rmSync(gatesDir, { recursive: true, force: true })
}

describe('kit_step_resolver', () => {
  afterEach(() => {
    cleanGates()
  })

  it('resolves specify when no spec.md exists', () => {
    const step = resolveNext('/tmp/nonexistent-feature-dir-xyz')
    expect(step.stage).toBe('specify')
    expect(step.kind).toBe('LLM')
  })

  it('marks gate stages correctly', () => {
    expect(isGateStage('review-spec')).toBe(true)
    expect(isGateStage('review-plan')).toBe(true)
    expect(isGateStage('review-tasks')).toBe(true)
    expect(isGateStage('review-handoff')).toBe(true)
    expect(isGateStage('specify')).toBe(false)
    expect(isGateStage('implement')).toBe(false)
  })

  it('returns terminal sentinel as a known constant', () => {
    const step: ResolvedStep = { stage: terminalStageSentinel, kind: 'terminal' }
    expect(step.stage).toBe('__terminal__')
    expect(step.kind).toBe('terminal')
  })

  it('resolves to a valid canonical stage for fixture', () => {
    const step = resolveNext(FIXTURE)
    expect(ALL_CANONICAL_STAGES.includes(step.stage) || step.stage === terminalStageSentinel).toBe(true)
    expect(typeof step.kind).toBe('string')
  })

  it('resolves first gate when no gates cleared', () => {
    const step = resolveNext(FIXTURE)
    expect(step.kind).toBe('gate')
  })

  it('resolves a non-gate stage when gates cleared', () => {
    cleanGates()
    for (const gate of ['review-spec', 'review-plan', 'review-tasks', 'review-handoff'] as const) {
      clearGate(FIXTURE, 'test-run', gate)
    }
    const step = resolveNext(FIXTURE)
    expect(step.kind).not.toBe('gate')
    expect(step.stage).toBeTruthy()
  })

  it('ALL_CANONICAL_STAGES includes all expected stages', () => {
    expect(ALL_CANONICAL_STAGES).toContain('review-plan')
    expect(ALL_CANONICAL_STAGES).toContain('clarify')
    expect(ALL_CANONICAL_STAGES).toContain('checklist')
  })
})

describe('R2R — review RETRYABLE_FAILURE rewind', () => {
  const runId = 'r2r-test-run'
  const doneFile = `${FIXTURE}/checklists/implement-done.md`
  const reqFile = `${FIXTURE}/checklists/requirements.md`

  afterEach(() => {
    rmSync('tmp/workflow-runs/r2r-test-run', { recursive: true, force: true })
    try {
      rmSync(doneFile)
    } catch {
      /* ok */
    }
    try {
      rmSync(reqFile)
    } catch {
      /* ok */
    }
    cleanGates()
  })

  it('rewinds to implement when review envelope indicates RETRYABLE_FAILURE', () => {
    const today = new Date().toISOString().slice(0, 10)
    const runDir = path.join('tmp/workflow-runs', today, runId)
    mkdirSync(runDir, { recursive: true })

    // Pre-clear all gates and satisfy prerequisite stages
    writeFileSync(doneFile, 'implement-done')
    writeFileSync(reqFile, 'checklist requirements satisfied')
    for (const gate of ['review-spec', 'review-plan', 'review-tasks', 'review-handoff'] as const) {
      clearGate(FIXTURE, runId, gate)
    }

    // handoff-generate needs a DONE envelope to proceed past it
    writeFileSync(
      path.join(runDir, `${runId}.envelope.handoff-generate.json`),
      JSON.stringify({
        schema_version: '009.1.0',
        stage: 'handoff-generate',
        status: 'DONE',
        artifacts_created: [],
        evidence: [],
        diagnostics: [],
        retry_count: 0,
        elapsed_ms: 10
      })
    )

    // implement was previously DONE
    writeFileSync(
      path.join(runDir, `${runId}.envelope.implement.json`),
      JSON.stringify({
        schema_version: '009.1.0',
        stage: 'implement',
        status: 'DONE',
        artifacts_created: [],
        evidence: [],
        diagnostics: [],
        retry_count: 0,
        elapsed_ms: 10
      })
    )
    writeFileSync(
      path.join(runDir, `${runId}.envelope.review.json`),
      JSON.stringify({
        schema_version: '009.1.0',
        stage: 'review',
        status: 'RETRYABLE_FAILURE',
        artifacts_created: [],
        evidence: [],
        diagnostics: [{ code: 'REVIEW_FIX_REQUIRED', message: 'fix needed', severity: 'error' }],
        retry_count: 1,
        elapsed_ms: 100
      })
    )

    const step = resolveNext(FIXTURE, runId)
    expect(step.stage).toBe('implement')
    expect(step.kind).toBe('LLM')
  })

  it('resolves terminal when all stages satisfied', () => {
    for (const gate of ['review-spec', 'review-plan', 'review-tasks', 'review-handoff'] as const) {
      clearGate(FIXTURE, 'test-run', gate)
    }
    const step = resolveNext(FIXTURE, 'test-run')
    expect(step.kind).not.toBe('gate')
  })
})
