import {
  BINDING_FRECENCY_WEIGHT_PRIMARY,
  BINDING_FRECENCY_WEIGHT_REVEAL
} from '@shared/constants/binding_frecency_weight.const'
import type { BindingRef } from '@shared/rpc'

export type QuickLookupKeyboardContext = {
  filterModalOpen: boolean
  rows: BindingRef[]
  highlightIndex: number
  setHighlightIndex: (value: number | ((prev: number) => number)) => void
  setForcedMode: (value: 'text' | 'chord' | null | ((prev: 'text' | 'chord' | null) => 'text' | 'chord' | null)) => void
  setFilterModalOpen: (open: boolean) => void
  setFilterSearch: (q: string) => void
  scrollIntoView: (index: number) => void
  recordVisit: (bindingId: string, weight: number) => void
  onClose: () => void
}

function handleEscapeKey(e: React.KeyboardEvent, onClose: () => void): boolean {
  if (e.key !== 'Escape') return false
  e.preventDefault()
  onClose()
  return true
}

function handleShiftTabKey(
  e: React.KeyboardEvent,
  setForcedMode: QuickLookupKeyboardContext['setForcedMode']
): boolean {
  if (e.key !== 'Tab' || !e.shiftKey) return false
  e.preventDefault()
  setForcedMode(prev => {
    if (prev === 'chord') return 'text'
    return 'chord'
  })
  return true
}

function handleArrowKey(
  e: React.KeyboardEvent,
  direction: 'up' | 'down',
  rows: BindingRef[],
  setHighlightIndex: QuickLookupKeyboardContext['setHighlightIndex'],
  scrollIntoView: QuickLookupKeyboardContext['scrollIntoView']
): boolean {
  const isDown = direction === 'down'
  if (e.key !== (isDown ? 'ArrowDown' : 'ArrowUp')) return false
  e.preventDefault()
  setHighlightIndex(prev => {
    const next = isDown ? Math.min(prev + 1, rows.length - 1) : Math.max(prev - 1, 0)
    scrollIntoView(next)
    return next
  })
  return true
}

function handleEnterKey(
  e: React.KeyboardEvent,
  rows: BindingRef[],
  highlightIndex: number,
  recordVisit: QuickLookupKeyboardContext['recordVisit']
): boolean {
  if (e.key !== 'Enter') return false
  e.preventDefault()
  const row = rows[highlightIndex]
  if (!row) return true
  const weight = e.metaKey || e.ctrlKey ? BINDING_FRECENCY_WEIGHT_REVEAL : BINDING_FRECENCY_WEIGHT_PRIMARY
  recordVisit(row.bindingId, weight)
  return true
}

function handleFilterShortcutKey(
  e: React.KeyboardEvent,
  setFilterModalOpen: QuickLookupKeyboardContext['setFilterModalOpen'],
  setFilterSearch: QuickLookupKeyboardContext['setFilterSearch']
): boolean {
  if (!(e.metaKey || e.ctrlKey) || e.key !== 'k') return false
  e.preventDefault()
  e.stopPropagation()
  setFilterModalOpen(true)
  setFilterSearch('')
  return true
}

export function applyQuickLookupKeydown(e: React.KeyboardEvent, ctx: QuickLookupKeyboardContext): void {
  if (ctx.filterModalOpen) return

  if (handleEscapeKey(e, ctx.onClose)) return
  if (handleShiftTabKey(e, ctx.setForcedMode)) return
  if (handleArrowKey(e, 'down', ctx.rows, ctx.setHighlightIndex, ctx.scrollIntoView)) return
  if (handleArrowKey(e, 'up', ctx.rows, ctx.setHighlightIndex, ctx.scrollIntoView)) return
  if (handleEnterKey(e, ctx.rows, ctx.highlightIndex, ctx.recordVisit)) return
  handleFilterShortcutKey(e, ctx.setFilterModalOpen, ctx.setFilterSearch)
}
