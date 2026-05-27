import { type RefObject, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { DEFAULT_LIST_ROW_HEIGHT_PX } from '../../constants/ui.const'
import { type ListScrollMetrics, readListScrollMetrics, virtualListWindow } from '../../utils/list/virtual_list.util'

export function useVirtualListWindow(
  total: number,
  scrollRootRef: RefObject<HTMLElement | null>,
  selectedIndex: number,
  selectedEntryId: number | null
) {
  const [metrics, setMetrics] = useState<ListScrollMetrics>({
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
      frame = requestAnimationFrame(() => setMetrics(readListScrollMetrics(root)))
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

  useLayoutEffect(() => {
    const root = scrollRootRef.current
    if (root === null || selectedIndex < 0) return

    const rh = metrics.rowHeight
    const selectedTop = selectedIndex * rh
    const selectedBottom = selectedTop + rh
    if (selectedTop < root.scrollTop) {
      root.scrollTop = selectedTop
    } else {
      const viewportBottom = root.scrollTop + root.clientHeight
      if (selectedBottom > viewportBottom) {
        root.scrollTop = selectedBottom - root.clientHeight
      }
    }

    if (selectedEntryId === null) return
    requestAnimationFrame(() => {
      const r = scrollRootRef.current
      if (r === null) return
      const el = r.querySelector<HTMLElement>(`button[data-entry-id="${String(selectedEntryId)}"]`)
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
  }, [metrics.rowHeight, scrollRootRef, selectedEntryId, selectedIndex])

  const window = useMemo(
    () =>
      virtualListWindow({
        total,
        scrollTop: metrics.scrollTop,
        viewportHeight: metrics.viewportHeight,
        rowHeight: metrics.rowHeight
      }),
    [metrics, total]
  )

  return { window, rowHeight: metrics.rowHeight }
}
