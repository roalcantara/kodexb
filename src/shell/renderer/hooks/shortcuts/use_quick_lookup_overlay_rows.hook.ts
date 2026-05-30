import type { BindingRef } from '@shared/rpc'
import { useMemo } from 'react'
import { computeChordHash, parseChordFromSearch } from '../../utils/shortcuts/quick_lookup_chord_search.util'
import { rankQuickLookupTextRows } from '../../utils/shortcuts/quick_lookup_text_rank.util'
import type { QuickLookupFilterMode } from './use_quick_lookup_overlay.hook'

type UseQuickLookupOverlayRowsOptions = {
  open: boolean
  search: string
  mode: 'text' | 'chord'
  filterMode: QuickLookupFilterMode
  allBindings: BindingRef[]
  byHash: Map<string, BindingRef[]>
}

export function useQuickLookupOverlayRows({
  open,
  search,
  mode,
  filterMode,
  allBindings,
  byHash
}: UseQuickLookupOverlayRowsOptions) {
  const filteredAll = useMemo((): BindingRef[] => {
    if (!open) return []
    if (filterMode === 'all') return allBindings
    if (filterMode === 'globals') return allBindings.filter(binding => binding.scope === 'global')
    return allBindings.filter(binding => binding.app === filterMode)
  }, [open, filterMode, allBindings])

  const textRows = useMemo(
    (): BindingRef[] => (mode === 'text' ? rankQuickLookupTextRows(filteredAll, search) : []),
    [mode, search, filteredAll]
  )

  const chordSteps = useMemo(() => parseChordFromSearch(search), [search])

  const chordCards = useMemo((): { hash: string; bindings: BindingRef[] }[] => {
    if (mode !== 'chord' || !chordSteps) return []
    const hash = computeChordHash(chordSteps)
    const bindings = byHash.get(hash) ?? []
    if (bindings.length === 0) return []
    return [{ hash, bindings }]
  }, [mode, chordSteps, byHash])

  const rows = mode === 'chord' ? chordCards.flatMap(card => card.bindings) : textRows

  return { textRows, chordSteps, chordCards, rows, firstChordCard: chordCards[0] }
}
