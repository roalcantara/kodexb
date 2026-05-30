import type { Binding } from '@core/domain/models/entries/schemas/shortcut.schema'
import { useEffect } from 'react'
import { selectFirstBindingIdInTab } from '../../utils/shortcuts/use_keymap_tab_selection.util'

type KeymapCollisionInfo = { kind: 'hard' | 'soft' }

type UseKeymapInitialSelectionOptions = {
  activeTab: string
  entryKey: string
  bindings: Binding[]
  collisionsById: Map<string, KeymapCollisionInfo[]>
  initialSelectedBindingId?: string | null
  setSelectedBindingId: (id: string | null) => void
}

export function useKeymapInitialSelection({
  activeTab,
  entryKey,
  bindings,
  collisionsById,
  initialSelectedBindingId,
  setSelectedBindingId
}: UseKeymapInitialSelectionOptions) {
  useEffect(() => {
    if (initialSelectedBindingId !== undefined) {
      setSelectedBindingId(initialSelectedBindingId)
    }
  }, [initialSelectedBindingId, setSelectedBindingId])

  useEffect(() => {
    if (initialSelectedBindingId !== undefined && initialSelectedBindingId !== null) return
    setSelectedBindingId(selectFirstBindingIdInTab(activeTab, entryKey, bindings, collisionsById))
  }, [activeTab, bindings, collisionsById, entryKey, initialSelectedBindingId, setSelectedBindingId])
}
