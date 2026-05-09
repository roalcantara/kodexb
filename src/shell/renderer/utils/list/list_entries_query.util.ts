import type { ListOpts, RpcKnowledge, TaskView } from '@shared/rpc'
import type { EntryTypeOption } from '../../components/list/filter_dropdown.component'
import { listEntries } from '../../rpc/client'

export function loadListRows(args: {
  query: string
  types: EntryTypeOption[]
  tags: string[]
  taskView?: TaskView
  pageSize: number
  append: boolean
  priorLen: number
}): Promise<RpcKnowledge[]> {
  const q = args.query.trim()
  const listOpts: ListOpts = {
    query: q === '' ? undefined : q,
    types: args.types.length > 0 ? [...args.types] : undefined,
    tags: args.tags.length > 0 ? [...args.tags] : undefined,
    taskView: args.taskView,
    limit: args.pageSize,
    offset: args.append ? args.priorLen : 0
  }
  return listEntries(listOpts)
}
