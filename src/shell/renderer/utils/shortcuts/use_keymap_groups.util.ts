import type { Binding } from '@core/domain/models/entries/schemas/shortcut.schema'
import { bindingIdForEntry } from './use_keymap_tab_selection.util'

export type KeymapGroup = {
  name: string
  bindings: Binding[]
}

export type KeymapCollisionInfo = {
  kind: 'hard' | 'soft'
  otherEntryKey: string
  otherApp: string
}

export function buildKeymapGroups(bindings: Binding[]): KeymapGroup[] {
  const map = new Map<string, Binding[]>()
  for (const binding of bindings) {
    const groupName = binding.group ?? ''
    const arr = map.get(groupName) ?? []
    arr.push(binding)
    map.set(groupName, arr)
  }
  return Array.from(map.entries()).map(([name, groupBindings]) => ({ name, bindings: groupBindings }))
}

export function buildKeymapTabNames(
  groups: KeymapGroup[],
  collisionsById: Map<string, KeymapCollisionInfo[]>
): string[] {
  const names = ['All', ...groups.map(group => group.name).filter(name => name.length > 0)]
  if (collisionsById.size > 0) {
    const hasHard = Array.from(collisionsById.values()).some(cols => cols.some(col => col.kind === 'hard'))
    if (hasHard) names.push('Conflicts')
  }
  return names
}

export function filterBindingsForKeymapTab(
  activeTab: string,
  entryKey: string,
  bindings: Binding[],
  collisionsById: Map<string, KeymapCollisionInfo[]>
): Binding[] {
  if (activeTab === 'All') return bindings
  if (activeTab === 'Conflicts') {
    return bindings.filter(binding => {
      const id = bindingIdForEntry(entryKey, binding)
      return collisionsById.get(id)?.some(collision => collision.kind === 'hard')
    })
  }
  return bindings.filter(binding => (binding.group ?? '') === activeTab)
}
