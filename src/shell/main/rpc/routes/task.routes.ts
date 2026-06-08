import { getLogger } from '@shared/logging'
import type { TaskMutationOperation, TaskMutationOutcome } from '@shared/rpc'
import { Elysia } from 'elysia'

import type { App } from '../../../app/app'
import { isTaskSourceWriteError } from '../../../app/lib/app_task_source.util'
import { buildTaskMutationFailureMessage } from '../../../app/lib/task_mutation_failure_message.util'
import {
  idWithDirSchema,
  idWithReorderDirSchema,
  taskCreateSchema,
  taskDeleteSchema,
  taskUpdateSchema
} from '../schemas'

function isTaskProjectionWriteError(error: unknown): boolean {
  return error instanceof Error && error.name === 'TaskProjectionWriteError'
}

const mutationLog = getLogger(['kb', 'rpc', 'task-mutation'])

async function conflictOutcome(
  app: App,
  operation: TaskMutationOperation,
  taskId: number,
  sourceVersion: number | undefined,
  correlationId: string
): Promise<TaskMutationOutcome<never> | null> {
  if (sourceVersion === undefined) return null
  const existing = await app.getEntry(taskId)
  if (existing?.type !== 'task') return null
  if (existing.updatedAt === sourceVersion) return null
  return {
    ok: false,
    status: 'conflict',
    operation,
    taskId,
    sourceVersion: existing.updatedAt,
    message: buildTaskMutationFailureMessage({
      operation,
      status: 'conflict',
      taskId,
      requestSourceVersion: sourceVersion,
      currentSourceVersion: existing.updatedAt
    }),
    details: {
      correlationId,
      requestSourceVersion: sourceVersion,
      currentSourceVersion: existing.updatedAt
    }
  }
}

function successOutcome<Titem>(
  operation: TaskMutationOperation,
  taskId: number | undefined,
  sourceVersion: number | undefined,
  data: Titem
): TaskMutationOutcome<Titem> {
  return {
    ok: true,
    status: 'success',
    operation,
    taskId,
    sourceVersion,
    message: `Task ${operation} persisted successfully.`,
    data
  }
}

function failureOutcome(
  operation: TaskMutationOperation,
  status: 'source_write_failed' | 'projection_failed',
  taskId: number | undefined,
  sourceVersion: number | undefined,
  correlationId: string
): TaskMutationOutcome<never> {
  return {
    ok: false,
    status,
    operation,
    taskId,
    sourceVersion,
    message: buildTaskMutationFailureMessage({ operation, status, taskId }),
    details: {
      correlationId
    }
  }
}

async function runTaskMutation<Titem>(
  app: App,
  operation: TaskMutationOperation,
  run: (context: { operation: TaskMutationOperation; correlationId: string }) => Promise<Titem>,
  options: { taskId?: number; sourceVersion?: number }
): Promise<TaskMutationOutcome<Titem>> {
  const correlationId = globalThis.crypto.randomUUID()
  const conflict =
    options.taskId === undefined
      ? null
      : await conflictOutcome(app, operation, options.taskId, options.sourceVersion, correlationId)
  if (conflict) return conflict
  const mutationContext = { operation, correlationId }

  try {
    const data = await run(mutationContext)
    const resolvedTaskId =
      options.taskId ?? (typeof data === 'object' && data !== null && 'id' in data ? Number(data.id) : undefined)
    const resolvedSourceVersion =
      typeof data === 'object' && data !== null && 'updatedAt' in data ? Number(data.updatedAt) : options.sourceVersion

    return successOutcome(operation, resolvedTaskId, resolvedSourceVersion, data)
  } catch (error) {
    if (isTaskSourceWriteError(error)) {
      mutationLog.error('Task mutation failure op={operation} status={status} correlation={correlationId}', {
        operation,
        status: 'source_write_failed',
        correlationId
      })
      return failureOutcome(operation, 'source_write_failed', options.taskId, options.sourceVersion, correlationId)
    }
    if (isTaskProjectionWriteError(error)) {
      mutationLog.error('Task mutation failure op={operation} status={status} correlation={correlationId}', {
        operation,
        status: 'projection_failed',
        correlationId
      })
      return failureOutcome(operation, 'projection_failed', options.taskId, options.sourceVersion, correlationId)
    }
    throw error
  }
}

export function taskRoutes(app: App) {
  return new Elysia({ name: 'task.routes' })
    .post('/createTask', ({ body }) => runTaskMutation(app, 'create', context => app.createTask(body, context), {}), {
      body: taskCreateSchema
    })
    .post(
      '/updateTask',
      ({ body }) =>
        runTaskMutation(app, 'update', context => app.updateTask(body.id, body.patch, context), {
          taskId: body.id,
          sourceVersion: body.sourceVersion
        }),
      { body: taskUpdateSchema }
    )
    .post(
      '/deleteTask',
      ({ body }) =>
        runTaskMutation(app, 'delete', context => app.deleteTask(body.id, context), {
          taskId: body.id,
          sourceVersion: body.sourceVersion
        }),
      { body: taskDeleteSchema }
    )
    .post(
      '/cycleStatus',
      ({ body }) =>
        runTaskMutation(app, 'cycle_status', context => app.cycleStatus(body.id, body.dir, context), {
          taskId: body.id,
          sourceVersion: body.sourceVersion
        }),
      { body: idWithDirSchema }
    )
    .post(
      '/cyclePriority',
      ({ body }) =>
        runTaskMutation(app, 'cycle_priority', context => app.cyclePriority(body.id, body.dir, context), {
          taskId: body.id,
          sourceVersion: body.sourceVersion
        }),
      { body: idWithDirSchema }
    )
    .post(
      '/reorderTask',
      ({ body }) =>
        runTaskMutation(app, 'reorder', context => app.reorderTask(body.id, body.dir, context), {
          taskId: body.id,
          sourceVersion: body.sourceVersion
        }),
      {
        body: idWithReorderDirSchema
      }
    )
}
