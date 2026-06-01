import type { EntryType } from '@core/domain/types/entry.types'
import type { RpcListEntry, TaskView } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import { listMatchCount } from '../../rpc/client'
import { listOptsFromListFilters, loadListRows } from '../../utils/list/list_filters.util'

export type ListPageRowsInput = {
  debouncedSearch: string
  types: EntryType[]
  tags: string[]
  taskView?: TaskView
  pageSize: number
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: tracked in codebase-quality-audit
export function useListPageRows(input: ListPageRowsInput) {
  const { debouncedSearch, types, tags, taskView, pageSize } = input
  const [rows, setRows] = useState<RpcListEntry[]>([])
  const rowsRef = useRef<RpcListEntry[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [matchTotal, setMatchTotal] = useState<number | null>(null)
  const matchTotalRef = useRef<number | null>(null)

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  useEffect(() => {
    matchTotalRef.current = matchTotal
  }, [matchTotal])

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
          const loaded = priorLen + next.length
          setRows(r => [...r, ...next])
          const total = matchTotalRef.current
          setHasMore(total === null ? next.length === pageSize : loaded < total)
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
          matchTotalRef.current = total
          setHasMore(next.length === pageSize && next.length < total)
        }
      } finally {
        setLoading(false)
      }
    },
    [debouncedSearch, types, tags, taskView, pageSize]
  )

  useEffect(() => {
    fireAndForget(refreshList(false))
  }, [refreshList])

  return { rows, loading, hasMore, refreshList, matchTotal }
}
