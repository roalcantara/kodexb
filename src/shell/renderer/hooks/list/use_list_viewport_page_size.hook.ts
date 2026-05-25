import { type RefObject, useEffect, useState } from 'react'
import { DEFAULT_LIST_ROW_HEIGHT_PX, DEFAULT_VIEWPORT_LIST_PAGE_SIZE } from '../../constants/ui.const'
import { listViewportPageSize } from '../../utils/list/virtual_list.util'

function measuredRowHeight(root: HTMLElement): number {
  const row = root.querySelector<HTMLElement>('.kb-entryRow')
  const height = row?.getBoundingClientRect().height ?? 0
  return height > 0 ? height : DEFAULT_LIST_ROW_HEIGHT_PX
}

export function useListViewportPageSize(scrollRootRef: RefObject<HTMLElement | null>): number {
  const [pageSize, setPageSize] = useState(DEFAULT_VIEWPORT_LIST_PAGE_SIZE)

  useEffect(() => {
    const root = scrollRootRef.current
    if (root === null) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = listViewportPageSize(root.clientHeight, measuredRowHeight(root))
        setPageSize(current => (current === next ? current : next))
      })
    }

    update()
    if (typeof ResizeObserver === 'undefined') return () => cancelAnimationFrame(frame)

    const observer = new ResizeObserver(update)
    observer.observe(root)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [scrollRootRef])

  return pageSize
}
