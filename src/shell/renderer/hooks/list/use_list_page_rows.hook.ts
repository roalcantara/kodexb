import type { RpcKnowledge, TaskView } from '@shared/rpc'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { EntryTypeOption } from '../../components/list/filter_dropdown.component'
import { loadListRows } from '../../utils/list/list_entries_query.util'

export type ListPageRowsInput = {
  debouncedSearch: string
  types: EntryTypeOption[]
  tags: string[]
  taskView?: TaskView
  pageSize: number
}

export function useListPageRows(input: ListPageRowsInput) {
  const { debouncedSearch, types, tags, taskView, pageSize } = input
  const [rows, setRows] = useState<RpcKnowledge[]>([])
  const rowsRef = useRef<RpcKnowledge[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  const refreshList = useCallback(
    async (append: boolean) => {
      setLoading(true)
      try {
        const priorLen = append ? rowsRef.current.length : 0
        const next = await loadListRows({
          query: debouncedSearch,
          types,
          tags,
          taskView,
          pageSize,
          append,
          priorLen
        })
        setRows(r => (append ? [...r, ...next] : next))
        setHasMore(next.length === pageSize)
      } finally {
        setLoading(false)
      }
    },
    [debouncedSearch, types, tags, taskView, pageSize]
  )

  useEffect(() => {
    refreshList(false).catch(() => undefined)
  }, [refreshList])

  return { rows, loading, hasMore, refreshList }
}
