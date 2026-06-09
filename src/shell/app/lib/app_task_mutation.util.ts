import type { Entry, Knowledge, TaskEntry } from '@core'
import { toKnowledge } from '@core'
import type { TaskCreateInput, TaskUpdateInput } from '@shared/rpc'
import type { LoadedConfig } from '../config/config.loader'
import { deleteById, findById, upsert } from '../db/entry.repository'
import { maxTaskOrder, updateTaskOrder } from '../db/task.repository'
import {
  isTaskSourceWriteError,
  readSourceDoc,
  removeTaskFromSource,
  resolveCreateTaskTags,
  type TaskMutationLogContext,
  writeSourceDoc,
  writeTasksToSource,
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

function assertNoTaskVersionConflict(existing: Knowledge, sourceVersion: number | undefined, id: number): void {
  if (sourceVersion !== undefined && existing.updatedAt !== sourceVersion) {
    const error = new Error(`Task ${id} version conflict`)
    error.name = 'TaskConflictError'
    throw error
  }
}

export async function updateTask(
  app: AppLike,
  id: number,
  patch: TaskUpdateInput,
  context?: TaskMutationLogContext
): Promise<Knowledge> {
  const existing = await app.getEntry(id)
  if (existing?.type !== 'task') throw new Error(`Task ${id} not found`)
  assertNoTaskVersionConflict(existing, context?.sourceVersion, id)
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
  assertNoTaskVersionConflict(existing, context?.sourceVersion, id)
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
  if (idx === -1) throw new Error(`Invalid current status: ${existing.status}`)
  const delta = dir === 'forward' ? 1 : -1
  const next = values[(idx + delta + values.length) % values.length]
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
  if (idx === -1) throw new Error(`Invalid current priority: ${current}`)
  const delta = dir === 'forward' ? 1 : -1
  const next = values[(idx + delta + values.length) % values.length]
  return updateTask(app, id, { priority: next }, context)
}

function loadAffectedEntries(
  raw: import('bun:sqlite').Database,
  affected: Array<{ id: number; taskOrder: number }>,
  id: number,
  sourceVersion: number | undefined
): Knowledge[] {
  const entries: Knowledge[] = []
  for (const { id: affectedId } of affected) {
    const entry = findById(raw, affectedId)
    if (!entry) throw new Error(`Task ${affectedId} not found during reorder`)
    entries.push(entry)
  }
  const targetEntry = entries.find(e => e.id === id)
  if (!targetEntry) throw new Error(`Target task ${id} not found in affected entries`)
  assertNoTaskVersionConflict(targetEntry, sourceVersion, id)
  return entries
}

function groupBySource(entries: Knowledge[]): Map<string, Knowledge[]> {
  const bySource = new Map<string, Knowledge[]>()
  for (const entry of entries) {
    const group = bySource.get(entry.source) ?? []
    group.push(entry)
    bySource.set(entry.source, group)
  }
  return bySource
}

function rollbackReorderProjection(
  raw: import('bun:sqlite').Database,
  affected: Array<{ id: number; taskOrder: number }>
): void {
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
  const entries = loadAffectedEntries(raw, affected, id, context?.sourceVersion)
  const bySource = groupBySource(entries)
  const log = app.getLog()

  const entriesByFile = [...bySource]
  const snapshots = new Map<string, Record<string, unknown>>(
    await Promise.all(
      entriesByFile.map(
        ([filePath]): Promise<[string, Record<string, unknown>]> => readSourceDoc(filePath).then(doc => [filePath, doc])
      )
    )
  )

  try {
    for (const [filePath, group] of entriesByFile) {
      // biome-ignore lint/performance/noAwaitInLoops: serial writes prevent cross-file partial update
      await writeTasksToSource(log, filePath, group, context)
    }
    app.invalidateListCache()
    return entries
  } catch (err) {
    await Promise.all(
      [...snapshots].map(([filePath, original]) =>
        writeSourceDoc(filePath, original).catch(() => {
          /* best-effort restore */
        })
      )
    )
    rollbackReorderProjection(raw, affected)
    if (isTaskSourceWriteError(err)) throw err
    const existing = findById(raw, id)
    const taskKey = existing?.key ?? String(id)
    throw app.taskProjectionWriteError('reorder', taskKey, err)
  }
}
