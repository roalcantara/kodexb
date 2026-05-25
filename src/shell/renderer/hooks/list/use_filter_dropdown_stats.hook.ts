import type { EntryType } from '@core/domain/types/entry.types'
import type { ListOpts, ListStats, TaskView } from '@shared/rpc'
import { useEffect, useState } from 'react'

export type ScopedListStatsFetch = (
  body: Partial<Pick<ListOpts, 'query' | 'tags' | 'types' | 'taskView'>>
) => Promise<ListStats>

export function useFilterDropdownStats(
  fetchScopedListStats: ScopedListStatsFetch,
  args: {
    filterOpen: boolean
    baseStats: ListStats | null
    debouncedSearch: string
    types: EntryType[]
    tags: string[]
    taskView?: TaskView
  }
): ListStats | null {
  const [scoped, setScoped] = useState<ListStats | null>(null)

  useEffect(() => {
    if (!args.filterOpen) {
      setScoped(null)
      return
    }
    if (args.baseStats === null) return

    let cancelled = false
    const q = args.debouncedSearch.trim()

    fetchScopedListStats({
      query: q === '' ? undefined : q,
      types: args.types.length > 0 ? args.types : undefined,
      tags: args.tags.length > 0 ? args.tags : undefined,
      taskView: args.taskView
    })
      .then(stats => {
        if (!cancelled) setScoped(stats)
      })
      .catch(() => {
        if (!cancelled) setScoped(null)
      })

    return () => {
      cancelled = true
    }
  }, [
    fetchScopedListStats,
    args.filterOpen,
    args.baseStats,
    args.debouncedSearch,
    args.types,
    args.tags,
    args.taskView
  ])

  return scoped
}
