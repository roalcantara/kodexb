import { useCallback } from 'react'
import {
  applyQuickLookupKeydown,
  type QuickLookupKeyboardContext
} from '../../utils/shortcuts/quick_lookup_keyboard.util'

export type UseQuickLookupKeyboardOptions = QuickLookupKeyboardContext

export function useQuickLookupKeyboard(ctx: UseQuickLookupKeyboardOptions) {
  const {
    filterModalOpen,
    rows,
    highlightIndex,
    setHighlightIndex,
    setForcedMode,
    setFilterModalOpen,
    setFilterSearch,
    scrollIntoView,
    recordVisit,
    onClose
  } = ctx

  return useCallback(
    (e: React.KeyboardEvent) =>
      applyQuickLookupKeydown(e, {
        filterModalOpen,
        rows,
        highlightIndex,
        setHighlightIndex,
        setForcedMode,
        setFilterModalOpen,
        setFilterSearch,
        scrollIntoView,
        recordVisit,
        onClose
      }),
    [
      filterModalOpen,
      rows,
      highlightIndex,
      setHighlightIndex,
      setForcedMode,
      setFilterModalOpen,
      setFilterSearch,
      scrollIntoView,
      recordVisit,
      onClose
    ]
  )
}
