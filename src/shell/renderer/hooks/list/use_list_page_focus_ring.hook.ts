import type { RpcKnowledge } from '@shared/rpc'
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { useCallback, useEffect } from 'react'

import { listPageFocusRingElements, tryApplyListPageTabRing } from '../../utils/list/list_keyboard.util'
import { scheduleFocusSearchInputSelectAll } from '../../utils/list/list_scroll.util'

export type ListPageFocusRingDeps = {
  showSettings: boolean
  filterOpen: boolean
  detailEntry: RpcKnowledge | null
  /**
   * Current list selection. Search auto-focus only fires when nothing is
   * selected; otherwise returning to the list (e.g. ArrowLeft out of detail)
   * keeps focus on the list surface so ArrowRight can re-advance.
   */
  selectedId: number | null
  listPageRef: RefObject<HTMLDivElement | null>
  filterButtonRef: RefObject<HTMLButtonElement | null>
  searchInputRef: RefObject<HTMLInputElement | null>
  listSurfaceRef: RefObject<HTMLDivElement | null>
}

/**
 * Tab order: filter → search → list surface → when detail is open, focusables
 * inside the detail panel → when the filter sheet is open, focusables inside
 * `.cmp-filter-stack` — then wraps (Shift+Tab reverses).
 */
export function useListPageFocusRing(deps: ListPageFocusRingDeps) {
  const {
    showSettings,
    filterOpen,
    detailEntry,
    selectedId,
    listPageRef,
    filterButtonRef,
    searchInputRef,
    listSurfaceRef
  } = deps

  // Only auto-focus search when nothing is selected (fresh list / cleared
  // selection). When a row is selected, returning to the list keeps focus on
  // the list surface so ArrowRight can re-advance into split/detail instead of
  // landing in the search field (which swallows view-navigation arrows).
  const focusSearchWhenReady = !showSettings && !filterOpen && detailEntry === null && selectedId === null

  useEffect(() => {
    if (!focusSearchWhenReady) return
    scheduleFocusSearchInputSelectAll(searchInputRef)
  }, [focusSearchWhenReady, searchInputRef])

  const onListPageKeyDownCapture = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (showSettings) return
      const chain = listPageFocusRingElements(
        {
          filterButtonRef,
          searchInputRef,
          listSurfaceRef
        },
        {
          listPageRoot: listPageRef.current,
          filterOpen,
          detailOpen: detailEntry !== null
        }
      )
      tryApplyListPageTabRing(e, chain)
    },
    [showSettings, filterOpen, detailEntry, listPageRef, filterButtonRef, searchInputRef, listSurfaceRef]
  )

  return { onListPageKeyDownCapture }
}
