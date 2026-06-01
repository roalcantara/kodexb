import { useRef } from 'react'
import { useBindings } from './use_bindings_cache.hook'
import { useChordInput } from './use_chord_input.hook'
import { useQuickLookupOverlayActions } from './use_quick_lookup_overlay_actions.hook'
import { useQuickLookupOverlayLifecycle } from './use_quick_lookup_overlay_lifecycle.hook'
import { useQuickLookupOverlayRows } from './use_quick_lookup_overlay_rows.hook'

export type QuickLookupFilterMode = 'all' | 'globals' | string

export type UseQuickLookupOverlayOptions = {
  open: boolean
  search: string
  onClose: () => void
}

export function useQuickLookupOverlay({ open, search, onClose }: UseQuickLookupOverlayOptions) {
  const cache = useBindings()
  const lifecycle = useQuickLookupOverlayLifecycle(open)
  const listRef = useRef<HTMLDivElement>(null)
  const { mode: autoMode } = useChordInput(search)
  const mode = lifecycle.forcedMode ?? autoMode

  const rowData = useQuickLookupOverlayRows({
    open,
    search,
    mode,
    filterMode: lifecycle.filterMode,
    allBindings: cache.all,
    byHash: cache.byHash
  })

  const actions = useQuickLookupOverlayActions({ lifecycle, rows: rowData.rows, listRef, onClose })

  return {
    cache,
    mode,
    displayAdvisories: lifecycle.displayAdvisories,
    highlightIndex: lifecycle.highlightIndex,
    setHighlightIndex: lifecycle.setHighlightIndex,
    filterModalOpen: lifecycle.filterModalOpen,
    setFilterModalOpen: lifecycle.setFilterModalOpen,
    filterSearch: lifecycle.filterSearch,
    setFilterSearch: lifecycle.setFilterSearch,
    filterMode: lifecycle.filterMode,
    ...rowData,
    listRef,
    ...actions
  }
}
