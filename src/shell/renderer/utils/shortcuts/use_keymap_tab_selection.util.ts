// pattern: Functional Core

import type { Binding } from '@core/domain/models/entries/schemas/shortcut.schema'

type KeymapCollisionInfo = { kind: 'hard' | 'soft' }

export function bindingIdForEntry(entryKey: string, binding: Binding): string {
  return `${entryKey}:${binding.id ?? slugify(binding.action)}`
}

export function selectFirstBindingIdInTab(
  tab: string,
  entryKey: string,
  bindings: Binding[],
  collisionsById: Map<string, KeymapCollisionInfo[]>
): string | null {
  if (tab === 'All') {
    const first = bindings[0]
    return first ? bindingIdForEntry(entryKey, first) : null
  }

  if (tab === 'Conflicts') {
    const firstHard = bindings.find(binding => {
      const id = bindingIdForEntry(entryKey, binding)
      return collisionsById.get(id)?.some(collision => collision.kind === 'hard')
    })
    return firstHard ? bindingIdForEntry(entryKey, firstHard) : null
  }

  const firstInGroup = bindings.find(binding => (binding.group ?? '') === tab)
  return firstInGroup ? bindingIdForEntry(entryKey, firstInGroup) : null
}

function slugify(action: string): string {
  return action
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
