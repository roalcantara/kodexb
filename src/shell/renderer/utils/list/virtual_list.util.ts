import {
  DEFAULT_LIST_ROW_HEIGHT_PX,
  DEFAULT_VIEWPORT_LIST_PAGE_SIZE,
  LIST_OVERSCAN_ROWS,
  LIST_PREFETCH_VISIBLE_ITEM_INDEX,
  MAX_VIEWPORT_LIST_PAGE_SIZE
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

export function listViewportPageSize(
  viewportHeight: number,
  rowHeight = DEFAULT_LIST_ROW_HEIGHT_PX,
  overscan = LIST_OVERSCAN_ROWS
): number {
  if (viewportHeight <= 0 || rowHeight <= 0) return DEFAULT_VIEWPORT_LIST_PAGE_SIZE
  return Math.min(
    MAX_VIEWPORT_LIST_PAGE_SIZE,
    Math.max(DEFAULT_VIEWPORT_LIST_PAGE_SIZE, Math.ceil(viewportHeight / rowHeight) + overscan)
  )
}

/** Fetch batch size: never exceed configured page size or viewport-derived capacity. */
export function effectiveListPageSize(viewportCap: number | undefined, configPageSize: number): number {
  if (viewportCap === undefined) return configPageSize
  return Math.min(viewportCap, configPageSize)
}

export type ListSentinelSpacers = {
  beforeSentinel: number
  afterSentinel: number
}

/**
 * Positions the infinite-scroll sentinel before the end of the loaded window so the
 * next page loads when the user reaches `prefetchItemIndex` (not only at the bottom).
 */
export function listSentinelSpacers(args: {
  totalRows: number
  rowHeight: number
  virtualWindow: VirtualListWindow
  prefetchItemIndex?: number
}): ListSentinelSpacers {
  const rh = args.rowHeight > 0 ? args.rowHeight : DEFAULT_LIST_ROW_HEIGHT_PX
  const total = args.totalRows
  if (total <= 0) return { beforeSentinel: 0, afterSentinel: 0 }

  const prefetchAt = args.prefetchItemIndex ?? LIST_PREFETCH_VISIBLE_ITEM_INDEX
  const sentinelAfterRow = Math.min(total - 1, Math.max(0, prefetchAt - 1))
  const sentinelOffsetPx = (sentinelAfterRow + 1) * rh

  const { startIndex, endIndex, paddingTop } = args.virtualWindow
  const renderedBottomPx = paddingTop + (endIndex - startIndex) * rh

  return {
    beforeSentinel: Math.max(0, sentinelOffsetPx - renderedBottomPx),
    afterSentinel: Math.max(0, total * rh - sentinelOffsetPx)
  }
}

/** Metrics read from a list scroll root for virtual window + scroll-into-view math. */
export type ListScrollMetrics = {
  scrollTop: number
  viewportHeight: number
  rowHeight: number
}

/**
 * Measures the first rendered list row inside `root`.
 * Compact PowerToys-style rows use `.cmp-list-row`; legacy rows use `.cmp-entry-row`.
 */
export function readListScrollMetrics(root: HTMLElement): ListScrollMetrics {
  const row = root.querySelector<HTMLElement>('.cmp-list-row, .cmp-entry-row')
  const measuredRowHeight = row?.getBoundingClientRect().height ?? 0
  return {
    scrollTop: root.scrollTop,
    viewportHeight: root.clientHeight,
    rowHeight: measuredRowHeight > 0 ? measuredRowHeight : DEFAULT_LIST_ROW_HEIGHT_PX
  }
}
