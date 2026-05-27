import type { RpcKnowledge } from '@shared/rpc'
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { useCallback, useEffect } from 'react'

import { listPageFocusRingElements, tryApplyListPageTabRing } from '../../utils/list/list_keyboard.util'

export type ListPageFocusRingDeps = {
  showSettings: boolean
  filterOpen: boolean
  detailEntry: RpcKnowledge | null
  listPageRef: RefObject<HTMLDivElement | null>
  filterButtonRef: RefObject<HTMLButtonElement | null>
  searchInputRef: RefObject<HTMLInputElement | null>
  syncButtonRef: RefObject<HTMLButtonElement | null>
  settingsButtonRef: RefObject<HTMLButtonElement | null>
  listSurfaceRef: RefObject<HTMLDivElement | null>
}

/**
 * Tab order: toolbar (filter → search → sync → settings) → list surface → when
 * detail is open, focusables inside the detail panel → when the filter sheet is
 * open, focusables inside `.cmp-filter-stack` — then wraps (Shift+Tab reverses).
 */
export function useListPageFocusRing(deps: ListPageFocusRingDeps) {
  const {
    showSettings,
    filterOpen,
    detailEntry,
    listPageRef,
    filterButtonRef,
    searchInputRef,
    syncButtonRef,
    settingsButtonRef,
    listSurfaceRef
  } = deps

  const focusSearchWhenReady = !showSettings && !filterOpen && detailEntry === null

  useEffect(() => {
    if (!focusSearchWhenReady) return
    const id = requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [focusSearchWhenReady, searchInputRef])

  const onListPageKeyDownCapture = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (showSettings) return
      const chain = listPageFocusRingElements(
        {
          filterButtonRef,
          searchInputRef,
          syncButtonRef,
          settingsButtonRef,
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
    [
      showSettings,
      filterOpen,
      detailEntry,
      listPageRef,
      filterButtonRef,
      searchInputRef,

      syncButtonRef,
      settingsButtonRef,
      listSurfaceRef
    ]
  )

  return { onListPageKeyDownCapture }
}
