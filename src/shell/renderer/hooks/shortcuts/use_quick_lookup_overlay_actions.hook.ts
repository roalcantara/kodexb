import type { BindingRef } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { type RefObject, useCallback } from 'react'
import { recordBindingVisit } from '../../rpc/client'
import { useQuickLookupKeyboard } from './use_quick_lookup_keyboard.hook'
import type { QuickLookupFilterMode } from './use_quick_lookup_overlay.hook'

type LifecycleSlice = {
  highlightIndex: number
  setHighlightIndex: (value: number | ((prev: number) => number)) => void
  filterMode: QuickLookupFilterMode
  setFilterMode: (mode: QuickLookupFilterMode) => void
  filterModalOpen: boolean
  setFilterModalOpen: (open: boolean) => void
  setFilterSearch: (q: string) => void
  forcedMode: 'text' | 'chord' | null
  setForcedMode: (value: 'text' | 'chord' | null | ((prev: 'text' | 'chord' | null) => 'text' | 'chord' | null)) => void
}

type UseQuickLookupOverlayActionsOptions = {
  lifecycle: LifecycleSlice
  rows: BindingRef[]
  listRef: RefObject<HTMLDivElement | null>
  onClose: () => void
}

export function useQuickLookupOverlayActions({
  lifecycle,
  rows,
  listRef,
  onClose
}: UseQuickLookupOverlayActionsOptions) {
  const scrollIntoView = useCallback(
    (index: number) => {
      if (!listRef.current) return
      const items = listRef.current.querySelectorAll('[data-row-index]')
      const el = items[index] as HTMLElement | undefined
      el?.scrollIntoView({ block: 'nearest' })
    },
    [listRef]
  )

  const recordVisit = useCallback((bindingId: string, weight: number) => {
    fireAndForget(recordBindingVisit(bindingId, weight))
  }, [])

  const handleKeyDown = useQuickLookupKeyboard({
    filterModalOpen: lifecycle.filterModalOpen,
    rows,
    highlightIndex: lifecycle.highlightIndex,
    setHighlightIndex: lifecycle.setHighlightIndex,
    setForcedMode: lifecycle.setForcedMode,
    setFilterModalOpen: lifecycle.setFilterModalOpen,
    setFilterSearch: lifecycle.setFilterSearch,
    scrollIntoView,
    recordVisit,
    onClose
  })

  const handleFilterSelect = useCallback(
    (nextMode: QuickLookupFilterMode) => {
      lifecycle.setFilterMode(nextMode)
      lifecycle.setFilterModalOpen(false)
    },
    [lifecycle.setFilterMode, lifecycle.setFilterModalOpen]
  )

  const filterLabel =
    lifecycle.filterMode === 'all' ? 'All' : lifecycle.filterMode === 'globals' ? 'Globals' : lifecycle.filterMode

  return { scrollIntoView, recordVisit, handleKeyDown, handleFilterSelect, filterLabel }
}
