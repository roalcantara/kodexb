import { describe, expect, it } from 'bun:test'
import { buildTaskMutationFailureMessage } from './task_mutation_failure_message.util'

describe('buildTaskMutationFailureMessage', () => {
  it('formats source write failures', () => {
    expect(
      buildTaskMutationFailureMessage({
        operation: 'update',
        status: 'source_write_failed',
        taskId: 12
      })
    ).toBe('Task update for id=12 failed: source write did not persist.')
  })

  it('formats projection failures', () => {
    expect(
      buildTaskMutationFailureMessage({
        operation: 'delete',
        status: 'projection_failed',
        taskId: 7
      })
    ).toBe('Task delete for id=7 partially failed: source persisted, projection update failed.')
  })

  it('formats conflict failures with version context', () => {
    expect(
      buildTaskMutationFailureMessage({
        operation: 'reorder',
        status: 'conflict',
        taskId: 3,
        requestSourceVersion: 10,
        currentSourceVersion: 11
      })
    ).toBe('Task reorder for id=3 rejected: stale source version 10 (current 11).')
  })
})
