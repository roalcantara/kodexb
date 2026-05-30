import type { Knowledge } from '../../../core'
import { EMPTY_JSON_ARRAY } from './entry_repository.const'

type TaskUpsertColumns = [string | null, string | null, number | null, number | null, string]
type ShortcutUpsertColumns = [string, string | null]

export type KnowledgeUpsertParams = [
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string | null,
  string | null,
  number | null,
  number | null,
  string,
  string,
  string,
  string | null,
  number,
  number
]

function taskUpsertColumns(row: Knowledge): TaskUpsertColumns {
  if (row.type !== 'task') {
    return [null, null, null, null, EMPTY_JSON_ARRAY]
  }
  return [
    row.priority ?? null,
    row.status ?? null,
    row.dueDate ?? null,
    row.taskOrder ?? null,
    JSON.stringify(row.dependsOn ?? [])
  ]
}

function shortcutUpsertColumns(row: Knowledge): ShortcutUpsertColumns {
  if (row.type !== 'shortcut') {
    return [EMPTY_JSON_ARRAY, null]
  }
  return [JSON.stringify(row.bindings), row.platform ?? null]
}

export function rowToParams(row: Knowledge): KnowledgeUpsertParams {
  const [priority, status, dueDate, taskOrder, dependsOnJson] = taskUpsertColumns(row)
  const [bindingsJson, platform] = shortcutUpsertColumns(row)

  return [
    row.id,
    row.type,
    row.key,
    row.source,
    row.desc,
    JSON.stringify(row.tags),
    JSON.stringify(row.links ?? []),
    JSON.stringify(row.notes ?? []),
    row.doc,
    priority,
    status,
    dueDate,
    taskOrder,
    dependsOnJson,
    JSON.stringify(row.meta ?? {}),
    bindingsJson,
    platform,
    row.createdAt,
    row.updatedAt
  ]
}
