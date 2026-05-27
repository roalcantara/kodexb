import { type RefObject, useEffect } from 'react'

const WHEEL_SCROLL_BLOCK_SELECTOR = '.cmp-detail, .cmp-filter-portal-clip, .cmp-palette, .cmp-settings, .cmp-sync-modal'

/**
 * Routes trackpad / mouse wheel deltas to the list scroll root when the event
 * target is outside it (e.g. search is focused) but not inside another scroller.
 */
export function useListSurfaceWheelScroll(args: {
  scrollRootRef: RefObject<HTMLElement | null>
  active: boolean
}): void {
  const { scrollRootRef, active } = args

  useEffect(() => {
    if (!active) return

    const onWheel = (e: WheelEvent) => {
      const root = scrollRootRef.current
      if (root === null || root.scrollHeight <= root.clientHeight) return

      const target = e.target
      if (!(target instanceof Element)) return
      if (target.closest(WHEEL_SCROLL_BLOCK_SELECTOR)) return
      if (root.contains(target)) return

      const maxScroll = root.scrollHeight - root.clientHeight
      const next = Math.max(0, Math.min(maxScroll, root.scrollTop + e.deltaY))
      if (next === root.scrollTop) return
      root.scrollTop = next
      e.preventDefault()
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [active, scrollRootRef])
}
