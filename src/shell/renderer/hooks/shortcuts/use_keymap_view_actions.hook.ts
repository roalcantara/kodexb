import type { Binding } from '@core/domain/models/entries/schemas/shortcut.schema'
import type { ShortcutKnowledge } from '@core/domain/models/knowledges/schemas/knowledge.schema'
import { useCallback } from 'react'
import { computeChordHash } from '../../utils/shortcuts/quick_lookup_chord_search.util'
import type { KeymapCollisionInfo } from '../../utils/shortcuts/use_keymap_groups.util'
import { bindingIdForEntry, selectFirstBindingIdInTab } from '../../utils/shortcuts/use_keymap_tab_selection.util'

type UseKeymapViewActionsOptions = {
  entry: ShortcutKnowledge
  collisionsById: Map<string, KeymapCollisionInfo[]>
  selectedBinding: Binding | null
  setActiveTab: (tab: string) => void
  setSelectedBindingId: (id: string | null) => void
  onChordDetailNavigate: (chordHash: string, bindingId: string) => void
  onRevealSource: (bindingId: string) => void
}

export function useKeymapViewActions({
  entry,
  collisionsById,
  selectedBinding,
  setActiveTab,
  setSelectedBindingId,
  onChordDetailNavigate,
  onRevealSource
}: UseKeymapViewActionsOptions) {
  const selectFirstInTab = useCallback(
    (tab: string) => {
      setSelectedBindingId(selectFirstBindingIdInTab(tab, entry.key, entry.bindings, collisionsById))
    },
    [collisionsById, entry.bindings, entry.key, setSelectedBindingId]
  )

  const setActiveTabAndSelect = useCallback(
    (tab: string) => {
      setActiveTab(tab)
      selectFirstInTab(tab)
    },
    [selectFirstInTab, setActiveTab]
  )

  const onPrimaryAction = useCallback(() => {
    if (!selectedBinding) return
    onChordDetailNavigate(computeChordHash(selectedBinding.chord), bindingIdForEntry(entry.key, selectedBinding))
  }, [selectedBinding, entry.key, onChordDetailNavigate])

  const onSecondaryAction = useCallback(() => {
    if (!selectedBinding) return
    onRevealSource(bindingIdForEntry(entry.key, selectedBinding))
  }, [selectedBinding, entry.key, onRevealSource])

  return { setActiveTabAndSelect, onPrimaryAction, onSecondaryAction }
}
