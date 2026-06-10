import { describe, expect, it } from 'bun:test'
import { buildRetro } from './retrospective.script.ts'
import type { WorkflowEvent } from './workflow_run.script.ts'

const INSIGHT_ID_REGEX = /^ri-/

function mkTaskCompleted(
  overrides: Partial<WorkflowEvent & { type: 'task.completed' }> = {}
): WorkflowEvent & { type: 'task.completed' } {
  return {
    type: 'task.completed',
    run_id: 'test-run-1',
    ts: '2026-06-10T12:00:00.000Z',
    feature_dir: '__fixtures__/009-retro',
    duration_ms: 100,
    command: 'echo test',
    role: 'trigger.pre',
    status: 'ok',
    stage: 'specify',
    exit_code: 0,
    ...overrides
  }
}

function mkStageEscalated(): WorkflowEvent & { type: 'stage.escalated' } {
  return {
    type: 'stage.escalated',
    run_id: 'test-run-1',
    ts: '2026-06-10T12:00:01.000Z',
    feature_dir: '__fixtures__/009-retro',
    duration_ms: 100,
    stage: 'ci-check',
    details: { cause: 'ci_retries_exhausted' }
  }
}

function mkStageRetried(): WorkflowEvent & { type: 'stage.retried' } {
  return {
    type: 'stage.retried',
    run_id: 'test-run-1',
    ts: '2026-06-10T12:00:02.000Z',
    feature_dir: '__fixtures__/009-retro',
    duration_ms: 100,
    stage: 'ci-check',
    attempt: 1
  }
}

function mkDecisionRequested(): WorkflowEvent & { type: 'decision.requested' } {
  return {
    type: 'decision.requested',
    run_id: 'test-run-1',
    ts: '2026-06-10T12:00:03.000Z',
    feature_dir: '__fixtures__/009-retro',
    duration_ms: 100,
    question_id: 'q1'
  }
}

function mkRunSummary(outcome: 'terminal_success' | 'terminal_failure'): WorkflowEvent & { type: 'run.summary' } {
  return {
    type: 'run.summary',
    run_id: 'test-run-1',
    ts: '2026-06-10T12:00:05.000Z',
    feature_dir: '__fixtures__/009-retro',
    duration_ms: 100,
    outcome,
    lead_time_ms: 5000,
    stage_durations_ms: {},
    interventions: 0,
    retries: 0
  }
}

function mkSandboxViolation(): WorkflowEvent & { type: 'sandbox.violation' } {
  return {
    type: 'sandbox.violation',
    run_id: 'test-run-1',
    ts: '2026-06-10T12:00:04.000Z',
    feature_dir: '__fixtures__/009-retro',
    duration_ms: 100,
    stage: 'specify',
    descriptor_field: 'tool_allowlist',
    attempted: 'rm -rf /'
  }
}

describe('buildRetro', () => {
  it('AWO-8 AC1: terminal run produces four-section retro markdown', () => {
    const events: WorkflowEvent[] = [
      mkTaskCompleted({ status: 'fail', stage: 'plan' }),
      mkStageEscalated(),
      mkStageRetried(),
      mkDecisionRequested(),
      mkTaskCompleted({ status: 'ok', stage: 'specify' }),
      mkRunSummary('terminal_success')
    ]

    const output = buildRetro(events, 'test-run-1')

    expect(output.markdown).toContain('# Workflow Retrospective — test-run-1')
    expect(output.markdown).toContain('## Blockers')
    expect(output.markdown).toContain('## Retries')
    expect(output.markdown).toContain('## Interventions')
    expect(output.markdown).toContain('## Successful patterns')
    expect(output.markdown).toContain('## Recommendations')
  })

  it('AWO-8 AC2: recommendations ranked and reference event indices', () => {
    const events: WorkflowEvent[] = [
      mkTaskCompleted({ status: 'fail', stage: 'plan', exit_code: 1 }),
      mkTaskCompleted({ status: 'fail', stage: 'plan', exit_code: 1 }),
      mkStageRetried(),
      mkTaskCompleted({ status: 'ok', stage: 'specify' }),
      mkRunSummary('terminal_failure')
    ]

    const output = buildRetro(events, 'test-run-1')

    expect(output.recommendations.length).toBeGreaterThan(0)

    for (const rec of output.recommendations) {
      expect(rec.rank).toBeGreaterThan(0)
      expect(rec.description.length).toBeGreaterThan(0)
      expect(rec.eventIds.length).toBeGreaterThan(0)
      for (const id of rec.eventIds) {
        expect(id).toBeGreaterThanOrEqual(0)
        expect(id).toBeLessThan(events.length)
      }
      expect(['high', 'medium', 'low']).toContain(rec.severity)
    }

    const ranks = output.recommendations.map(r => r.rank)
    const sorted = [...ranks].sort((a, b) => a - b)
    expect(ranks).toEqual(sorted)
  })

  it('retro output includes insights with insight_id and run_id', () => {
    const events: WorkflowEvent[] = [
      mkTaskCompleted({ status: 'fail', stage: 'plan' }),
      mkTaskCompleted({ status: 'ok', stage: 'specify' }),
      mkRunSummary('terminal_failure')
    ]

    const output = buildRetro(events, 'test-run-2')

    expect(output.insights.length).toBeGreaterThan(0)
    for (const insight of output.insights) {
      expect(insight.insight_id.length).toBeGreaterThan(0)
      expect(insight.insight_id).toMatch(INSIGHT_ID_REGEX)
      expect(insight.run_id).toBe('test-run-2')
      expect(typeof insight.timestamp).toBe('string')
      expect(insight.recommendation).toBeDefined()
      expect(insight.tags.length).toBeGreaterThan(0)
    }
  })

  it('clean run with no failures produces empty blocker and retry sections', () => {
    const events: WorkflowEvent[] = [
      mkTaskCompleted({ status: 'ok', stage: 'specify' }),
      mkTaskCompleted({ status: 'ok', stage: 'plan' }),
      mkRunSummary('terminal_success')
    ]

    const output = buildRetro(events, 'test-run-3')

    expect(output.markdown).toContain('## Blockers\n\nNo blockers recorded.')
    expect(output.markdown).toContain('## Retries\n\nNo retries recorded.')
    expect(output.recommendations.length).toBe(0)
  })

  it('sandbox violations appear as blockers', () => {
    const events: WorkflowEvent[] = [
      mkSandboxViolation(),
      mkTaskCompleted({ status: 'ok', stage: 'plan' }),
      mkRunSummary('terminal_failure')
    ]

    const output = buildRetro(events, 'test-run-4')

    expect(output.markdown).toContain('sandbox violation')
    const blockerRec = output.recommendations.find(r => r.severity === 'high')
    expect(blockerRec).toBeDefined()
  })
})
