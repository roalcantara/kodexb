import { useCallback, useRef } from 'react'

import {
  DETAIL_PANEL_TRANSITION_MS,
  LIST_COMFORTABLE_WIDTH_PX,
  LIST_COMPACT_BREAKPOINT_PX,
  LIST_COMPACT_WIDTH_PX
} from '../../constants/window_layout.const'
import { resizeWindow } from '../../rpc/client'

/**
 * When the list opens a detail strip from a compact window, widen to comfortable
 * width; on close, restore compact width after the panel transition.
 */
export function useListDetailResize() {
  const widenedForDetailRef = useRef(false)

  const onFirstDetailOpen = useCallback(() => {
    if (typeof window === 'undefined') return
    if (window.innerWidth >= LIST_COMPACT_BREAKPOINT_PX) return
    widenedForDetailRef.current = true
    resizeWindow(LIST_COMFORTABLE_WIDTH_PX, window.innerHeight).catch(() => undefined)
  }, [])

  const onDetailClose = useCallback(() => {
    if (!widenedForDetailRef.current) return
    widenedForDetailRef.current = false
    window.setTimeout(() => {
      resizeWindow(LIST_COMPACT_WIDTH_PX, window.innerHeight).catch(() => undefined)
    }, DETAIL_PANEL_TRANSITION_MS)
  }, [])

  return { onFirstDetailOpen, onDetailClose }
}
