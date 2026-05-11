import {
  DEFAULT_LIST_ROW_HEIGHT_PX,
  DEFAULT_VIEWPORT_LIST_PAGE_SIZE,
  LIST_OVERSCAN_ROWS,
  MAX_VIEWPORT_LIST_PAGE_SIZE
} from '../../constants/ui.const'

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
