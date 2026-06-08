import { describe, expect, it } from 'bun:test'
import type { TaskMutationOutcome } from './task_mutation_outcome.types'

describe('TaskMutationOutcome types', () => {
  it('accepts success outcome shape', () => {
    const outcome: TaskMutationOutcome<{ id: number }> = {
      ok: true,
      status: 'success',
      operation: 'create',
      taskId: 10,
      sourceVersion: 123,
      message: 'Task created successfully',
      data: { id: 10 }
    }
    expect(outcome.ok).toBe(true)
    expect(outcome.status).toBe('success')
  })

  it('accepts failure outcome shape', () => {
    const outcome: TaskMutationOutcome<never> = {
      ok: false,
      status: 'conflict',
      operation: 'update',
      taskId: 10,
      message: 'Task update rejected due to version conflict',
      details: {
        currentSourceVersion: 321,
        requestSourceVersion: 123
      }
    }
    expect(outcome.ok).toBe(false)
    expect(outcome.status).toBe('conflict')
  })
})
