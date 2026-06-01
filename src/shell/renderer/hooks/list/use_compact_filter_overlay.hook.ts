import { sortedTags } from '@core/domain/models/knowledges/tags/sorted_tags.util'
import type { EntryType } from '@core/domain/types/entry.types'
import type { ListStats, TaskView } from '@shared/rpc'
import { type RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildFilterRows, type FilterRow } from '../../utils/list/compact_filter_overlay_build_rows.util'
import {
  dispatchCompactFilterKeyDown,
  scrollCompactFilterHighlightIntoView
} from '../../utils/list/compact_filter_overlay_keyboard.util'
import { useCompactFilterOverlayRows } from './use_compact_filter_overlay_rows.hook'

export type CompactFilterOverlayHookProps = {
  stats: ListStats
  types: EntryType[]
  tags: string[]
  taskView?: TaskView
  onChange: (next: { types: EntryType[]; tags: string[]; taskView?: TaskView }) => void
  onClose: () => void
}

function createRowToggleHandler(
  types: EntryType[],
  tags: string[],
  taskView: TaskView | undefined,
  onChange: CompactFilterOverlayHookProps['onChange']
): (row: FilterRow) => void {
  return (row: FilterRow) => {
    switch (row.kind) {
      case 'all':
        onChange({ types: [], tags: [], taskView: undefined })
        return
      case 'taskView': {
        const v = row.id.replace('tv__', '') as TaskView
        onChange({ types, tags, taskView: taskView === v ? undefined : v })
        return
      }
      case 'type': {
        const t = row.id.replace('type__', '') as EntryType
        const next = types.includes(t) ? types.filter(x => x !== t) : [...types, t]
        onChange({ types: next, tags, taskView: next.includes('task') ? taskView : undefined })
        return
      }
      case 'tag': {
        const tag = row.id.replace('tag__', '')
        onChange({ types, tags: tags.includes(tag) ? tags.filter(x => x !== tag) : [...tags, tag], taskView })
        return
      }
    }
  }
}

function initialHighlightIndex(
  stats: ListStats,
  types: EntryType[],
  tags: string[],
  taskView: TaskView | undefined
): number {
  const initialTagRows = sortedTags(stats.tags, '', tags)
  const rows = buildFilterRows(stats, types, tags, taskView, initialTagRows, '')
  const firstOn = rows.findIndex(r => r.isOn)
  return firstOn >= 0 ? firstOn : 0
}

function useOverlaySearchFocus(searchInputRef: RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    const t = setTimeout(() => searchInputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [searchInputRef.current?.focus])
}

function useOverlayHighlightScroll(
  scrollRootRef: RefObject<HTMLDivElement | null>,
  searchInputRef: RefObject<HTMLInputElement | null>,
  highlightIndex: number,
  filterRowsScrollKey: string
): void {
  const syncScroll = useCallback(() => {
    scrollCompactFilterHighlightIntoView(scrollRootRef, searchInputRef, highlightIndex, filterRowsScrollKey)
  }, [highlightIndex, filterRowsScrollKey, searchInputRef, scrollRootRef])

  useLayoutEffect(() => {
    syncScroll()
  }, [syncScroll])

  useEffect(() => {
    const root = scrollRootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => syncScroll())
    ro.observe(root)
    return () => ro.disconnect()
  }, [syncScroll, scrollRootRef.current])
}

export function useCompactFilterOverlay(props: CompactFilterOverlayHookProps) {
  const { stats, types, tags, taskView, onChange, onClose } = props
  const [search, setSearch] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(() => initialHighlightIndex(stats, types, tags, taskView))
  const searchInputRef = useRef<HTMLInputElement>(null)
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const suppressNextArrowDownFromSearch = useRef(false)

  const { filterRows, facetSectionRows, scrollableSectionRows, filterRowsScrollKey } = useCompactFilterOverlayRows(
    stats,
    types,
    tags,
    taskView,
    search
  )

  useOverlaySearchFocus(searchInputRef)
  useOverlayHighlightScroll(scrollRootRef, searchInputRef, highlightIndex, filterRowsScrollKey)

  useEffect(() => {
    setHighlightIndex(prev => Math.min(Math.max(0, prev), Math.max(0, filterRows.length - 1)))
  }, [filterRows.length])

  const handleRowToggle = useMemo(
    () => createRowToggleHandler(types, tags, taskView, onChange),
    [types, tags, taskView, onChange]
  )

  const pickRow = useCallback(
    (index: number, row: FilterRow) => {
      setHighlightIndex(index)
      handleRowToggle(row)
    },
    [handleRowToggle]
  )

  const setSearchAndClearSuppress = (v: string) => {
    suppressNextArrowDownFromSearch.current = false
    setSearch(v)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    dispatchCompactFilterKeyDown(e, {
      filterRows,
      highlightIndex,
      setHighlightIndex,
      searchInputRef,
      suppressNextArrowDownFromSearch,
      handleRowToggle,
      onClose
    })
  }

  return {
    search,
    setSearch: setSearchAndClearSuppress,
    highlightIndex,
    searchInputRef,
    scrollRootRef,
    filterRows,
    facetSectionRows,
    scrollableSectionRows,
    handleKeyDown,
    pickRow
  }
}
