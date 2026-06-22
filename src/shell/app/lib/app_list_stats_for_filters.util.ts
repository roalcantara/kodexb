import { ENTRY_TYPE_VALUES } from '@core/domain/constants/entry.const'
import { TASK_VIEW_ORDER } from '@core/domain/models/knowledges/task_views/task_view_order.const'
import type { EntryType } from '@core/domain/types/entry.types'
import type { ListOpts, ListStats, TaskView } from '@shared/rpc'
import type { LoadedConfig } from '../config/config.loader'
import type { openDatabase } from '../db/client'
import { countKnowledgeForOpts } from './app_list_query.util'
import { buildTagFacetCounts } from './list_stats_tag_facets.util'

type DbRaw = ReturnType<typeof openDatabase>['raw']

const ENTRY_TYPES = ENTRY_TYPE_VALUES

const TASK_VIEW_KEYS = TASK_VIEW_ORDER

export type ListStatsFilterInput = Partial<Pick<ListOpts, 'query' | 'types' | 'tags' | 'taskView'>>

/**
 * Faceted counts for the filter dropdown: each bucket counts rows matching the
 * current query/types/tags/task view **except** the facet being measured (that
 * dimension is varied per row). Prevents impossible combinations (e.g. a tag
 * shown with a high global count but zero rows under the selected type).
 */
export function buildListStatsForFilters(raw: DbRaw, loaded: LoadedConfig, filters: ListStatsFilterInput): ListStats {
  const query = filters.query?.trim() ? filters.query.trim() : undefined
  const types = filters.types?.length ? filters.types : undefined
  const tags = filters.tags?.length ? filters.tags : undefined
  const taskView = filters.taskView

  const base: Pick<ListOpts, 'query' | 'types' | 'tags' | 'taskView'> = {
    query,
    types,
    tags,
    taskView
  }

  const total = countKnowledgeForOpts(raw, loaded, base)

  const typeCounts = {} as Record<EntryType, number>
  for (const t of ENTRY_TYPES) {
    const unionTypes = types?.length ? [...new Set([...types, t])] : [t]
    typeCounts[t] = countKnowledgeForOpts(raw, loaded, {
      query,
      tags,
      taskView,
      types: unionTypes
    })
  }

  const tagsOut = buildTagFacetCounts(raw, loaded, query, types, taskView, tags)

  const taskViews = {} as Record<TaskView, number>
  for (const v of TASK_VIEW_KEYS) {
    taskViews[v] = countKnowledgeForOpts(raw, loaded, {
      query,
      types,
      tags,
      taskView: v
    })
  }

  return {
    total,
    taskViews,
    tags: tagsOut,
    byType: {
      bookmark: typeCounts.bookmark,
      command: typeCounts.command,
      cheat: typeCounts.cheat,
      shortcut: typeCounts.shortcut,
      task: typeCounts.task
    }
  }
}
