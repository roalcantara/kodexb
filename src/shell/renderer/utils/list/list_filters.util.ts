import type { EntryType } from '@core/domain/types/entry.types'
import type { ListOpts, RpcListEntry, TaskView } from '@shared/rpc'
import { TASK_VIEW_LABEL, TYPE_FILTER_LABEL } from '../../constants/filter_labels.const'
import { listEntries } from '../../rpc/client'

export function listFilterSummary(types: EntryType[], tags: string[], taskView?: TaskView): string {
  if (taskView !== undefined) return TASK_VIEW_LABEL[taskView]
  if (types.length === 1) {
    const only = types[0]
    if (only !== undefined) return TYPE_FILTER_LABEL[only]
  }
  if (tags.length > 0) return tags.join(', ')
  return 'All'
}

export function listOptsFromListFilters(args: {
  query: string
  types: EntryType[]
  tags: string[]
  taskView?: TaskView
  limit?: number
  offset?: number
}): ListOpts {
  const q = args.query.trim()
  return {
    query: q === '' ? undefined : q,
    types: args.types.length > 0 ? [...args.types] : undefined,
    tags: args.tags.length > 0 ? [...args.tags] : undefined,
    taskView: args.taskView,
    ...(args.limit === undefined ? {} : { limit: args.limit }),
    ...(args.offset === undefined ? {} : { offset: args.offset })
  }
}

export function loadListRows(args: {
  query: string
  types: EntryType[]
  tags: string[]
  taskView?: TaskView
  pageSize: number
  append: boolean
  priorLen: number
}): Promise<RpcListEntry[]> {
  return listEntries(
    listOptsFromListFilters({
      query: args.query,
      types: args.types,
      tags: args.tags,
      taskView: args.taskView,
      limit: args.pageSize,
      offset: args.append ? args.priorLen : 0
    })
  )
}
