import type { RpcListEntry, TaskView } from '@shared/rpc'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { EntryTypeOption } from '../../components/list/filter_dropdown.component'
import { listMatchCount } from '../../rpc/client'
import { listOptsFromListFilters, loadListRows } from '../../utils/list/list_entries_query.util'

export type ListPageRowsInput = {
  debouncedSearch: string
  types: EntryTypeOption[]
  tags: string[]
  taskView?: TaskView
  pageSize: number
}

export function useListPageRows(input: ListPageRowsInput) {
  const { debouncedSearch, types, tags, taskView, pageSize } = input
  const [rows, setRows] = useState<RpcListEntry[]>([])
  const rowsRef = useRef<RpcListEntry[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [matchTotal, setMatchTotal] = useState<number | null>(null)

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  const refreshList = useCallback(
    async (append: boolean) => {
      setLoading(true)
      try {
        const priorLen = append ? rowsRef.current.length : 0
        const filterOpts = listOptsFromListFilters({
          query: debouncedSearch,
          types,
          tags,
          taskView
        })
        if (append) {
          const next = await loadListRows({
            query: debouncedSearch,
            types,
            tags,
            taskView,
            pageSize,
            append: true,
            priorLen
          })
          setRows(r => [...r, ...next])
          setHasMore(next.length === pageSize)
        } else {
          const [next, total] = await Promise.all([
            loadListRows({
              query: debouncedSearch,
              types,
              tags,
              taskView,
              pageSize,
              append: false,
              priorLen: 0
            }),
            listMatchCount(filterOpts)
          ])
          setRows(next)
          setMatchTotal(total)
          setHasMore(next.length === pageSize)
        }
      } finally {
        setLoading(false)
      }
    },
    [debouncedSearch, types, tags, taskView, pageSize]
  )

  useEffect(() => {
    refreshList(false).catch(() => undefined)
  }, [refreshList])

  return { rows, loading, hasMore, refreshList, matchTotal }
}
