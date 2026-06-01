import type { Binding } from '@core/domain/models/entries/schemas/shortcut.schema'
import { useMemo } from 'react'
import type { KeymapCollisionInfo } from '../../utils/shortcuts/use_keymap_groups.util'
import { filterBindingsForKeymapTab } from '../../utils/shortcuts/use_keymap_groups.util'
import { bindingIdForEntry } from '../../utils/shortcuts/use_keymap_tab_selection.util'

type UseKeymapSelectedBindingOptions = {
  activeTab: string
  entryKey: string
  bindings: Binding[]
  collisionsById: Map<string, KeymapCollisionInfo[]>
  selectedBindingId: string | null
}

export function useKeymapSelectedBinding({
  activeTab,
  entryKey,
  bindings,
  collisionsById,
  selectedBindingId
}: UseKeymapSelectedBindingOptions) {
  const visibleBindings = useMemo(
    () => filterBindingsForKeymapTab(activeTab, entryKey, bindings, collisionsById),
    [activeTab, bindings, collisionsById, entryKey]
  )

  const selectedBinding = useMemo((): Binding | null => {
    if (!selectedBindingId) return visibleBindings[0] ?? null
    return visibleBindings.find(binding => bindingIdForEntry(entryKey, binding) === selectedBindingId) ?? null
  }, [selectedBindingId, visibleBindings, entryKey])

  const collisionsForSelected = useMemo((): KeymapCollisionInfo[] => {
    if (!selectedBinding) return []
    const id = bindingIdForEntry(entryKey, selectedBinding)
    return collisionsById.get(id) ?? []
  }, [selectedBinding, collisionsById, entryKey])

  return { visibleBindings, selectedBinding, collisionsForSelected }
}
