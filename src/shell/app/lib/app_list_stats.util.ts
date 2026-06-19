import { countTasksByView } from '@core/domain/models/knowledges/task_views/count_by_view.util'
import type { ListStats } from '@shared/rpc'
import type { openDatabase } from '../db/client'
import { findAll, getDbStats, getTagCounts, type KnowledgeWithFrecency } from '../db/entry.repository'

type TaskKnowledgeRow = Extract<KnowledgeWithFrecency, { type: 'task' }>

type DbRaw = ReturnType<typeof openDatabase>['raw']

function typeCount(byType: Record<string, number>, type: string): number {
  const count = Reflect.get(byType, type)
  return typeof count === 'number' ? count : 0
}

export function buildListStats(raw: DbRaw): ListStats {
  const stats = getDbStats(raw)
  const tags = getTagCounts(raw)
  const tasks = findAll(raw, { types: ['task'], limit: -1, offset: 0 }).filter(
    (row): row is TaskKnowledgeRow => row.type === 'task'
  )
  const taskViews = countTasksByView(tasks)
  return {
    total: stats.total,
    bookmark: typeCount(stats.byType, 'bookmark'),
    command: typeCount(stats.byType, 'command'),
    cheat: typeCount(stats.byType, 'cheat'),
    task: typeCount(stats.byType, 'task'),
    shortcut: typeCount(stats.byType, 'shortcut'),
    taskViews,
    tags,
    byType: stats.byType
  }
}
