import { type RefObject, useCallback, useEffect, useLayoutEffect } from 'react'

import { scrollCompactFilterHighlightIntoView } from '../../components/list/compact_filter_overlay_keyboard.util'

export function useCompactFilterOverlayScroll(
  scrollRootRef: RefObject<HTMLDivElement | null>,
  searchInputRef: RefObject<HTMLInputElement | null>,
  highlightIndex: number,
  filterRowsScrollKey: string
): void {
  const syncScroll = useCallback(() => {
    scrollCompactFilterHighlightIntoView(scrollRootRef, searchInputRef, highlightIndex, filterRowsScrollKey)
  }, [highlightIndex, filterRowsScrollKey, scrollRootRef, searchInputRef])

  useLayoutEffect(() => {
    syncScroll()
  }, [syncScroll])

  useEffect(() => {
    const root = scrollRootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      syncScroll()
    })
    ro.observe(root)
    return () => ro.disconnect()
  }, [syncScroll, scrollRootRef])
}
