import {
  DEFAULT_LIST_ROW_HEIGHT_PX,
  DEFAULT_VIEWPORT_LIST_PAGE_SIZE,
  LIST_OVERSCAN_ROWS
} from '../../constants/ui.const'

export type VirtualListWindow = {
  startIndex: number
  endIndex: number
  paddingTop: number
  paddingBottom: number
}

export function virtualListWindow(args: {
  total: number
  scrollTop: number
  viewportHeight: number
  rowHeight?: number
  overscan?: number
}): VirtualListWindow {
  const rowHeight = args.rowHeight && args.rowHeight > 0 ? args.rowHeight : DEFAULT_LIST_ROW_HEIGHT_PX
  const overscan = args.overscan ?? LIST_OVERSCAN_ROWS
  const firstVisible = Math.floor(Math.max(0, args.scrollTop) / rowHeight)
  const visibleCount =
    args.viewportHeight > 0 ? Math.ceil(Math.max(0, args.viewportHeight) / rowHeight) : DEFAULT_VIEWPORT_LIST_PAGE_SIZE
  const startIndex = Math.max(0, firstVisible - Math.floor(overscan / 2))
  const endIndex = Math.min(args.total, startIndex + visibleCount + overscan)

  return {
    startIndex,
    endIndex,
    paddingTop: startIndex * rowHeight,
    paddingBottom: Math.max(0, args.total - endIndex) * rowHeight
  }
}
