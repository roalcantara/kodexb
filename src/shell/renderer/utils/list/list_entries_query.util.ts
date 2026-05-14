import type { RpcKnowledge, TaskView } from '@shared/rpc'
import type { EntryTypeOption } from '../../components/list/filter_dropdown.component'
import { listEntries } from '../../rpc/client'
import { listOptsFromListFilters } from './list_opts_from_filters.util'

export { listOptsFromListFilters } from './list_opts_from_filters.util'

export function loadListRows(args: {
  query: string
  types: EntryTypeOption[]
  tags: string[]
  taskView?: TaskView
  pageSize: number
  append: boolean
  priorLen: number
}): Promise<RpcKnowledge[]> {
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
