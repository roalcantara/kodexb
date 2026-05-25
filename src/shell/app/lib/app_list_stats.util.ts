import { countTasksByView } from '../../../core/domain/models/knowledges/task_views/count_by_view.util'
import type { ListStats } from '../../../shared/rpc'
import type { openDatabase } from '../db/client'
import { findAll, getDbStats, getTagCounts, type KnowledgeWithFrecency } from '../db/entry.repository'

type TaskKnowledgeRow = Extract<KnowledgeWithFrecency, { type: 'task' }>

type DbRaw = ReturnType<typeof openDatabase>['raw']

export function buildListStats(raw: DbRaw): ListStats {
  const stats = getDbStats(raw)
  const tags = getTagCounts(raw)
  const tasks = findAll(raw, { types: ['task'], limit: -1, offset: 0 }).filter(
    (row): row is TaskKnowledgeRow => row.type === 'task'
  )
  const taskViews = countTasksByView(tasks)
  return {
    total: stats.total,
    bookmark: stats.byType.bookmark ?? 0,
    command: stats.byType.command ?? 0,
    cheat: stats.byType.cheat ?? 0,
    task: stats.byType.task ?? 0,
    taskViews,
    tags,
    byType: stats.byType
  }
}
