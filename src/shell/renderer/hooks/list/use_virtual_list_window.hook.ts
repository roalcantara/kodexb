import { type RefObject, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LIST_ROW_HEIGHT_PX } from '../../constants/ui.const'
import { virtualListWindow } from '../../utils/list/virtual_list_window.util'

type VirtualListMetrics = {
  scrollTop: number
  viewportHeight: number
  rowHeight: number
}

function readMetrics(root: HTMLElement): VirtualListMetrics {
  const row = root.querySelector<HTMLElement>('.kb-entryRow')
  const measuredRowHeight = row?.getBoundingClientRect().height ?? 0
  return {
    scrollTop: root.scrollTop,
    viewportHeight: root.clientHeight,
    rowHeight: measuredRowHeight > 0 ? measuredRowHeight : DEFAULT_LIST_ROW_HEIGHT_PX
  }
}

export function useVirtualListWindow(
  total: number,
  scrollRootRef: RefObject<HTMLElement | null>,
  selectedIndex: number
) {
  const [metrics, setMetrics] = useState<VirtualListMetrics>({
    scrollTop: 0,
    viewportHeight: 0,
    rowHeight: DEFAULT_LIST_ROW_HEIGHT_PX
  })

  useEffect(() => {
    const root = scrollRootRef.current
    if (root === null) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setMetrics(readMetrics(root)))
    }

    update()
    root.addEventListener('scroll', update, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(root)

    return () => {
      cancelAnimationFrame(frame)
      root.removeEventListener('scroll', update)
      observer?.disconnect()
    }
  }, [scrollRootRef])

  useEffect(() => {
    const root = scrollRootRef.current
    if (root === null || selectedIndex < 0) return

    const selectedTop = selectedIndex * metrics.rowHeight
    const selectedBottom = selectedTop + metrics.rowHeight
    if (selectedTop < root.scrollTop) {
      root.scrollTop = selectedTop
      return
    }
    const viewportBottom = root.scrollTop + root.clientHeight
    if (selectedBottom > viewportBottom) {
      root.scrollTop = selectedBottom - root.clientHeight
    }
  }, [metrics.rowHeight, scrollRootRef, selectedIndex])

  return useMemo(
    () =>
      virtualListWindow({
        total,
        scrollTop: metrics.scrollTop,
        viewportHeight: metrics.viewportHeight,
        rowHeight: metrics.rowHeight
      }),
    [metrics, total]
  )
}
