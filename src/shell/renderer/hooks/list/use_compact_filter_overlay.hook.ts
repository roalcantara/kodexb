import type { ListStats, TaskView } from '@shared/rpc'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { buildFilterRows, type FilterRow } from '../../components/list/compact_filter_overlay_build_rows.util'
import { dispatchCompactFilterKeyDown } from '../../components/list/compact_filter_overlay_keyboard.util'
import type { EntryTypeOption } from '../../components/list/filter_dropdown.component'
import { sortedTags } from '../../components/list/filter_dropdown.component'
import { useCompactFilterOverlayFocus } from './use_compact_filter_overlay_focus.hook'
import { useCompactFilterOverlayRows } from './use_compact_filter_overlay_rows.hook'
import { useCompactFilterOverlayScroll } from './use_compact_filter_overlay_scroll.hook'

export type CompactFilterOverlayHookProps = {
  stats: ListStats
  types: EntryTypeOption[]
  tags: string[]
  taskView?: TaskView
  onChange: (next: { types: EntryTypeOption[]; tags: string[]; taskView?: TaskView }) => void
  onClose: () => void
}

function createRowToggleHandler(
  types: EntryTypeOption[],
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
        const t = row.id.replace('type__', '') as EntryTypeOption
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
  types: EntryTypeOption[],
  tags: string[],
  taskView: TaskView | undefined
): number {
  const initialTagRows = sortedTags(stats.tags, '', tags)
  const rows = buildFilterRows(stats, types, tags, taskView, initialTagRows, '')
  const firstOn = rows.findIndex(r => r.isOn)
  return firstOn >= 0 ? firstOn : 0
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

  useCompactFilterOverlayFocus(searchInputRef)
  useCompactFilterOverlayScroll(scrollRootRef, searchInputRef, highlightIndex, filterRowsScrollKey)

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
