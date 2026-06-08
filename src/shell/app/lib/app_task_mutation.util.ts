import type { Entry, Knowledge, TaskEntry } from '@core'
import { toKnowledge } from '@core'
import type { TaskCreateInput, TaskUpdateInput } from '@shared/rpc'
import type { LoadedConfig } from '../config/config.loader'
import { deleteById, findById, upsert } from '../db/entry.repository'
import { maxTaskOrder, updateTaskOrder } from '../db/task.repository'
import {
  isTaskSourceWriteError,
  removeTaskFromSource,
  resolveCreateTaskTags,
  type TaskMutationLogContext,
  writeTaskToSource
} from './app_task_source.util'

type AppLike = {
  getLog: () => ReturnType<typeof import('../../../shared/logging').getLogger>
  getLoadedConfig: () => LoadedConfig
  getEntry: (id: number) => Promise<Knowledge | null>
  getDbForTaskMutation: () => { raw: import('bun:sqlite').Database }
  invalidateListCache: () => void
  taskProjectionWriteError: (
    operation: 'create' | 'update' | 'delete' | 'reorder',
    taskKey: string,
    cause: unknown
  ) => Error
}

export async function createTask(
  app: AppLike,
  input: TaskCreateInput,
  context?: TaskMutationLogContext
): Promise<Knowledge> {
  const { raw } = app.getDbForTaskMutation()
  const order = maxTaskOrder(raw)
  const now = Date.now()
  const entry: Entry = {
    type: 'task',
    key: input.key,
    source: app.getLoadedConfig().writeTarget,
    desc: input.desc ?? '',
    tags: resolveCreateTaskTags(input.tags),
    priority: input.priority ?? 'mid',
    status: 'todo',
    dueDate: input.dueDate,
    taskOrder: order,
    dependsOn: input.dependsOn
  } as Entry
  const knowledge = toKnowledge(entry, now)
  await writeTaskToSource(app.getLog(), app.getLoadedConfig().writeTarget, knowledge, context)
  try {
    upsert(raw, knowledge)
  } catch (err) {
    throw app.taskProjectionWriteError('create', knowledge.key, err)
  }
  app.invalidateListCache()
  return knowledge
}

export async function updateTask(
  app: AppLike,
  id: number,
  patch: TaskUpdateInput,
  context?: TaskMutationLogContext
): Promise<Knowledge> {
  const existing = await app.getEntry(id)
  if (existing?.type !== 'task') throw new Error(`Task ${id} not found`)
  const merged = { ...existing, ...patch, updatedAt: Date.now() }
  const { raw } = app.getDbForTaskMutation()
  await writeTaskToSource(app.getLog(), merged.source, merged, context)
  try {
    upsert(raw, merged)
  } catch (err) {
    throw app.taskProjectionWriteError('update', merged.key, err)
  }
  app.invalidateListCache()
  return merged
}

export async function deleteTask(app: AppLike, id: number, context?: TaskMutationLogContext): Promise<void> {
  const existing = await app.getEntry(id)
  if (existing?.type !== 'task') throw new Error(`Task ${id} not found`)
  const { raw } = app.getDbForTaskMutation()
  await removeTaskFromSource(app.getLog(), existing.key, existing.source, context)
  try {
    deleteById(raw, id)
  } catch (err) {
    throw app.taskProjectionWriteError('delete', existing.key, err)
  }
  app.invalidateListCache()
}

export async function cycleStatus(
  app: AppLike,
  id: number,
  dir: 'forward' | 'backward',
  context?: TaskMutationLogContext
): Promise<Knowledge> {
  const values: TaskEntry['status'][] = ['todo', 'doing', 'done']
  const existing = await app.getEntry(id)
  if (existing?.type !== 'task') throw new Error(`Task ${id} not found`)
  const idx = values.indexOf(existing.status)
  const delta = dir === 'forward' ? 1 : -1
  const next = values[(idx + delta + values.length) % values.length]
  if (!next) throw new Error(`Invalid status cycle: ${values.join(',')} at index ${idx}`)
  return updateTask(app, id, { status: next }, context)
}

export async function cyclePriority(
  app: AppLike,
  id: number,
  dir: 'forward' | 'backward',
  context?: TaskMutationLogContext
): Promise<Knowledge> {
  const values: NonNullable<TaskEntry['priority']>[] = ['low', 'mid', 'high', 'urgent']
  const existing = await app.getEntry(id)
  if (existing?.type !== 'task') throw new Error(`Task ${id} not found`)
  const current = existing.priority ?? 'mid'
  const idx = values.indexOf(current)
  const delta = dir === 'forward' ? 1 : -1
  const next = values[(idx + delta + values.length) % values.length]
  if (!next) throw new Error(`Invalid priority cycle: ${values.join(',')} at index ${idx}`)
  return updateTask(app, id, { priority: next }, context)
}

export async function reorderTask(
  app: AppLike,
  id: number,
  dir: 'up' | 'down',
  context?: TaskMutationLogContext
): Promise<Knowledge[]> {
  const { raw } = app.getDbForTaskMutation()
  const affected = updateTaskOrder(raw, id, dir)
  if (affected.length === 0) return []
  try {
    const settled = await affected.reduce<Promise<Array<Knowledge | null>>>(async (accPromise, { id: affectedId }) => {
      const acc = await accPromise
      const entry = findById(raw, affectedId)
      if (!entry) {
        acc.push(null)
        return acc
      }
      await writeTaskToSource(app.getLog(), entry.source, entry, context)
      acc.push(entry)
      return acc
    }, Promise.resolve([]))
    const results: Knowledge[] = settled.filter((e): e is Knowledge => e !== null)
    app.invalidateListCache()
    return results
  } catch (err) {
    if (affected.length === 2) {
      const [first, second] = affected
      if (first && second) {
        raw
          .query('UPDATE knowledges SET task_order = ? WHERE id = ? AND type = ?')
          .run(second.taskOrder, first.id, 'task')
        raw
          .query('UPDATE knowledges SET task_order = ? WHERE id = ? AND type = ?')
          .run(first.taskOrder, second.id, 'task')
      }
    }
    if (isTaskSourceWriteError(err)) {
      throw err
    }
    const existing = findById(raw, id)
    const taskKey = existing?.key ?? String(id)
    throw app.taskProjectionWriteError('reorder', taskKey, err)
  }
}
