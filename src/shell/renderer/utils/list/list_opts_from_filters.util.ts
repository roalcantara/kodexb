import type { ListOpts, TaskView } from '@shared/rpc'
import type { EntryTypeOption } from '../../components/list/filter_dropdown.component'

export function listOptsFromListFilters(args: {
  query: string
  types: EntryTypeOption[]
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
