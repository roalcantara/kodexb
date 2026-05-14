import { DEFAULT_LIST_ROW_HEIGHT_PX } from '../../constants/ui.const'

/** Metrics read from a list scroll root for virtual window + scroll-into-view math. */
export type ListScrollMetrics = {
  scrollTop: number
  viewportHeight: number
  rowHeight: number
}

/**
 * Measures the first rendered list row inside `root`.
 * Compact PowerToys-style rows use `.kb-pt-row`; legacy rows use `.kb-entryRow`.
 */
export function readListScrollMetrics(root: HTMLElement): ListScrollMetrics {
  const row = root.querySelector<HTMLElement>('.kb-pt-row, .kb-entryRow')
  const measuredRowHeight = row?.getBoundingClientRect().height ?? 0
  return {
    scrollTop: root.scrollTop,
    viewportHeight: root.clientHeight,
    rowHeight: measuredRowHeight > 0 ? measuredRowHeight : DEFAULT_LIST_ROW_HEIGHT_PX
  }
}
