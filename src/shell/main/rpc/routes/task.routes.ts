import { getLogger, withContext } from '@shared/logging'
import type { TaskMutationOperation, TaskMutationOutcome } from '@shared/rpc'
import { Elysia } from 'elysia'

import type { App } from '../../../app/app'
import { isTaskConflictError, isTaskSourceWriteError } from '../../../app/lib/app_task_source.service'
import { buildTaskMutationFailureMessage } from '../../../app/lib/task_mutation_failure_message.util'
import {
  e2eFaultModeSchema,
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

type E2eFaultMode = 'unset' | 'off' | 'source_write_failed'
let e2eFaultMode: E2eFaultMode = 'unset'

export function __testSetE2eFaultMode(mode: E2eFaultMode): void {
  e2eFaultMode = mode
}

export function __testResetE2eFaultMode(): void {
  e2eFaultMode = 'unset'
}

function faultInjectionEnabled(): boolean {
  return e2eFaultMode === 'source_write_failed'
}

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

async function conflictFailureOutcome(
  app: App,
  operation: TaskMutationOperation,
  options: { taskId?: number; sourceVersion?: number },
  correlationId: string
): Promise<TaskMutationOutcome<never>> {
  const currentSourceVersion =
    options.taskId === undefined ? undefined : (await app.getEntry(options.taskId))?.updatedAt
  withContext({ operation, correlationId }, () => {
    mutationLog.error('Task mutation conflict status={status}', { status: 'conflict' })
  })
  return {
    ok: false,
    status: 'conflict',
    operation,
    taskId: options.taskId,
    sourceVersion: currentSourceVersion,
    message: buildTaskMutationFailureMessage({ operation, status: 'conflict', taskId: options.taskId }),
    details: {
      correlationId,
      requestSourceVersion: options.sourceVersion,
      currentSourceVersion
    }
  }
}

async function runTaskMutation<Titem>(
  app: App,
  operation: TaskMutationOperation,
  run: (context: import('../../../app/lib/app_task_source.service').TaskMutationLogContext) => Promise<Titem>,
  options: { taskId?: number; sourceVersion?: number }
): Promise<TaskMutationOutcome<Titem>> {
  const correlationId = globalThis.crypto.randomUUID()

  if (faultInjectionEnabled()) {
    return {
      ok: false,
      status: 'source_write_failed',
      operation,
      taskId: options.taskId,
      message: buildTaskMutationFailureMessage({ operation, status: 'source_write_failed', taskId: options.taskId }),
      details: { correlationId }
    }
  }

  const conflict =
    options.taskId === undefined
      ? null
      : await conflictOutcome(app, operation, options.taskId, options.sourceVersion, correlationId)
  if (conflict) return conflict
  const mutationContext = { operation, correlationId, sourceVersion: options.sourceVersion }

  try {
    const data = await run(mutationContext)
    const resolvedTaskId =
      options.taskId ?? (typeof data === 'object' && data !== null && 'id' in data ? Number(data.id) : undefined)
    const resolvedSourceVersion =
      typeof data === 'object' && data !== null && 'updatedAt' in data ? Number(data.updatedAt) : options.sourceVersion

    return successOutcome(operation, resolvedTaskId, resolvedSourceVersion, data)
  } catch (error) {
    if (isTaskSourceWriteError(error)) {
      withContext({ operation, correlationId }, () => {
        mutationLog.error('Task mutation failure status={status}', { status: 'source_write_failed' })
      })
      return failureOutcome(operation, 'source_write_failed', options.taskId, options.sourceVersion, correlationId)
    }
    if (isTaskProjectionWriteError(error)) {
      withContext({ operation, correlationId }, () => {
        mutationLog.error('Task mutation failure status={status}', { status: 'projection_failed' })
      })
      return failureOutcome(operation, 'projection_failed', options.taskId, options.sourceVersion, correlationId)
    }
    if (isTaskConflictError(error)) {
      return await conflictFailureOutcome(app, operation, options, correlationId)
    }
    throw error
  }
}

export function taskRoutes(app: App) {
  const routes = new Elysia({ name: 'task.routes' })
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

  if (process.env.NODE_ENV === 'test' || process.env.KB_E2E_FAULT_INJECTION === '1') {
    routes.post(
      '/e2e/fault-mode',
      ({ body }) => {
        const mode = String(body.mode ?? '')
        if (!['off', 'source_write_failed', 'unset'].includes(mode)) {
          throw new Error(`Invalid e2e fault mode: ${mode}`)
        }
        e2eFaultMode = mode as E2eFaultMode
        return { ok: true }
      },
      { body: e2eFaultModeSchema }
    )
  }

  return routes
}
