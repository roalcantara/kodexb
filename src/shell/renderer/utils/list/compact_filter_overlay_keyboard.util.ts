import type { Dispatch, KeyboardEvent, MutableRefObject, RefObject, SetStateAction } from 'react'

import { ensureOptionRowVisibleInScrollRoot } from '../../utils/list/list_scroll.util'
import type { FilterRow } from './compact_filter_overlay_build_rows.util'

export type CompactFilterRowToggle = (row: FilterRow) => void

const KEY_HANDLERS: Record<string, 'arrowDown' | 'arrowUp' | 'escape'> = {
  ArrowDown: 'arrowDown',
  ArrowUp: 'arrowUp',
  Escape: 'escape'
}

export function compactFilterOptionNodes(root: Element | null | undefined): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>('[data-compact-filter-row]'))
}

export function scrollCompactFilterHighlightIntoView(
  scrollRootRef: RefObject<HTMLElement | null>,
  searchInputRef: RefObject<HTMLInputElement | null>,
  highlightIndex: number,
  rowsRevisionKey = ''
) {
  const dropdown = searchInputRef.current?.closest('.kb-pt-filter-dropdown')
  const options = compactFilterOptionNodes(dropdown)
  if (rowsRevisionKey) {
    const expected = rowsRevisionKey.split('\0').length
    if (options.length !== expected) return
  }
  const el = options[highlightIndex]
  if (!el) return

  const scrollRoot = scrollRootRef.current ?? el.closest<HTMLElement>('[data-compact-filter-scroll-root]')
  if (!scrollRoot) return

  ensureOptionRowVisibleInScrollRoot(scrollRoot, el)
}

export type CompactFilterKeyCtx = {
  filterRows: FilterRow[]
  highlightIndex: number
  setHighlightIndex: Dispatch<SetStateAction<number>>
  searchInputRef: RefObject<HTMLInputElement | null>
  suppressNextArrowDownFromSearch: MutableRefObject<boolean>
  handleRowToggle: CompactFilterRowToggle
  onClose: () => void
}

function tryCompactFilterTabFromSearch(e: KeyboardEvent, onSearch: boolean, ctx: CompactFilterKeyCtx): boolean {
  if (e.key !== 'Tab' || e.shiftKey || !onSearch) return false
  e.preventDefault()
  const row = ctx.filterRows[ctx.highlightIndex]
  if (row) ctx.handleRowToggle(row)
  return true
}

function handleCompactFilterArrowDown(e: KeyboardEvent, onSearch: boolean, ctx: CompactFilterKeyCtx) {
  if (onSearch && ctx.suppressNextArrowDownFromSearch.current) {
    ctx.suppressNextArrowDownFromSearch.current = false
    e.preventDefault()
    return
  }
  e.preventDefault()
  ctx.setHighlightIndex(prev => (ctx.filterRows.length > 0 ? Math.min(prev + 1, ctx.filterRows.length - 1) : 0))
}

function handleCompactFilterArrowUp(e: KeyboardEvent, onSearch: boolean, ctx: CompactFilterKeyCtx) {
  if (ctx.highlightIndex === 0 && !onSearch) {
    ctx.suppressNextArrowDownFromSearch.current = true
    e.preventDefault()
    ctx.searchInputRef.current?.focus()
    return
  }
  if (onSearch) {
    e.preventDefault()
    ctx.setHighlightIndex(prev => Math.max(0, prev - 1))
    return
  }
  e.preventDefault()
  ctx.setHighlightIndex(prev => Math.max(0, prev - 1))
}

export function dispatchCompactFilterKeyDown(e: KeyboardEvent, ctx: CompactFilterKeyCtx) {
  const onSearch = document.activeElement === ctx.searchInputRef.current
  if (tryCompactFilterTabFromSearch(e, onSearch, ctx)) return

  const action = KEY_HANDLERS[e.key]
  if (!action) return

  if (action === 'escape') {
    e.preventDefault()
    ctx.onClose()
    return
  }
  if (action === 'arrowDown') {
    handleCompactFilterArrowDown(e, onSearch, ctx)
    return
  }
  if (action === 'arrowUp') {
    handleCompactFilterArrowUp(e, onSearch, ctx)
  }
}
