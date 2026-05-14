import type { ListStats } from '../../../shared/rpc'
import type { openDatabase } from '../db/client'
import { findAll, getDbStats, getTagCounts } from '../db/entry.repository'
import { isTask } from './app_list_opts.util'
import { countTasksByView } from './task_views.util'

type DbRaw = ReturnType<typeof openDatabase>['raw']

export function buildListStats(raw: DbRaw): ListStats {
  const stats = getDbStats(raw)
  const tags = getTagCounts(raw)
  const tasks = findAll(raw, { types: ['task'], limit: -1, offset: 0 }).filter(isTask)
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
