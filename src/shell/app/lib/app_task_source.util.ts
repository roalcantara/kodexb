import fs from 'node:fs/promises'
import type { TaskMutationOperation } from '@shared/rpc'
import type { Knowledge } from '../../../core'
import { getLogger, withContext } from '../../../shared/logging'

type AppLog = ReturnType<typeof import('../../../shared/logging').getLogger>

const TASK_SOURCE_WRITE_ERROR_NAME = 'TaskSourceWriteError'
const TASK_CONFLICT_ERROR_NAME = 'TaskConflictError'

export type TaskMutationLogContext = {
  operation: TaskMutationOperation
  correlationId: string
  sourceVersion?: number
}

export function isTaskSourceWriteError(error: unknown): boolean {
  return error instanceof Error && error.name === TASK_SOURCE_WRITE_ERROR_NAME
}

export function isTaskConflictError(error: unknown): boolean {
  return error instanceof Error && error.name === TASK_CONFLICT_ERROR_NAME
}

async function readSourceDoc(filePath: string): Promise<Record<string, unknown>> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return Bun.YAML.parse(content) as Record<string, unknown>
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    return {}
  }
}

async function writeSourceDoc(filePath: string, doc: Record<string, unknown>): Promise<void> {
  const tmpPath = `${filePath}.tmp`
  await fs.writeFile(tmpPath, Bun.YAML.stringify(doc), 'utf-8')
  await fs.rename(tmpPath, filePath)
}

function taskSourceWriteError(
  operation: 'create' | 'update' | 'delete' | 'reorder',
  taskKey: string,
  cause: unknown
): Error {
  const error = new Error(`Source ${operation} failed for task "${taskKey}"`, { cause })
  error.name = TASK_SOURCE_WRITE_ERROR_NAME
  return error
}

export async function writeTaskToSource(
  log: AppLog,
  filePath: string,
  task: Knowledge,
  context?: TaskMutationLogContext
): Promise<void> {
  try {
    const doc = await readSourceDoc(filePath)
    const tasks = (doc.tasks ?? {}) as Record<string, unknown>
    tasks[task.key] = taskToSourceRecord(task)
    doc.tasks = tasks
    await writeSourceDoc(filePath, doc)
  } catch (err) {
    withContext({ operation: context?.operation, correlationId: context?.correlationId }, () => {
      log.error('Source write-back failed key={key} path={path} error={error}', {
        key: task.key,
        path: filePath,
        operation: context?.operation,
        correlationId: context?.correlationId,
        error: String(err)
      })
    })
    throw taskSourceWriteError(
      (context?.operation as 'create' | 'update' | 'delete' | 'reorder') ?? 'update',
      task.key,
      err
    )
  }
}

export async function removeTaskFromSource(
  log: AppLog,
  key: string,
  filePath: string,
  context?: TaskMutationLogContext
): Promise<void> {
  try {
    const doc = await readSourceDoc(filePath)
    const tasks = (doc.tasks ?? {}) as Record<string, unknown>
    delete tasks[key]
    if (Object.keys(tasks).length === 0) {
      await fs.unlink(filePath)
    } else {
      doc.tasks = tasks
      await writeSourceDoc(filePath, doc)
    }
  } catch (err) {
    withContext({ operation: context?.operation, correlationId: context?.correlationId }, () => {
      log.error('Source remove failed key={key} path={path} error={error}', {
        key,
        path: filePath,
        operation: context?.operation,
        correlationId: context?.correlationId,
        error: String(err)
      })
    })
    throw taskSourceWriteError('delete', key, err)
  }
}

export async function writeTasksToSource(
  filePath: string,
  tasks: Knowledge[],
  context?: TaskMutationLogContext
): Promise<void> {
  const firstKey = tasks[0]?.key
  try {
    const doc = await readSourceDoc(filePath)
    const existing = (doc.tasks ?? {}) as Record<string, unknown>
    for (const task of tasks) {
      existing[task.key] = taskToSourceRecord(task)
    }
    doc.tasks = existing
    await writeSourceDoc(filePath, doc)
  } catch (err) {
    withContext({ operation: context?.operation, correlationId: context?.correlationId }, () => {
      getLogger(['kb', 'source']).error('Source write-batch failed path={path} count={count} error={error}', {
        path: filePath,
        count: tasks.length,
        operation: context?.operation,
        correlationId: context?.correlationId,
        error: String(err)
      })
    })
    throw taskSourceWriteError(
      (context?.operation as 'create' | 'update' | 'delete' | 'reorder') ?? 'reorder',
      firstKey ?? 'unknown',
      err
    )
  }
}

export function taskToSourceRecord(task: Knowledge): Record<string, unknown> {
  const shape: Record<string, unknown> = {}
  if (task.desc) shape.desc = task.desc
  if (task.tags && task.tags.length > 0) shape.tags = task.tags
  if (task.type === 'task') {
    shape.status = task.status
    if (task.priority) shape.priority = task.priority
    if (task.dueDate) shape.due = new Date(task.dueDate).toISOString().split('T')[0]
    if (task.taskOrder != null) shape.task_order = task.taskOrder
    if (task.dependsOn && task.dependsOn.length > 0) shape.depends_on = task.dependsOn.map(String)
  }
  return shape
}

/** Domain tags require at least one valid tag; UI may submit none on create. */
export function resolveCreateTaskTags(tags: string[] | undefined): string[] {
  const normalized = (tags ?? [])
    .map(tag => tag.trim().toLowerCase().replaceAll('-', '_'))
    .filter(tag => tag.length > 0)
  return normalized.length > 0 ? normalized : ['task']
}
