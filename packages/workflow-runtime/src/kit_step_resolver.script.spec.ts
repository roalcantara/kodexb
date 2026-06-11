import { afterEach, describe, expect, it } from 'bun:test'
import { rmSync } from 'node:fs'
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
