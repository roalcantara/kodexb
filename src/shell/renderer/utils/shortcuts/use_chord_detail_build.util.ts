import type { ChordStep } from '@core/domain/models/entries/schemas/shortcut.schema'
import type { BindingRef } from '@shared/rpc'
import type { ChordDetailRow, ChordDetailTab } from '../../hooks/shortcuts/use_chord_detail.hook'

export function slugifyBindingAction(action: string): string {
  return action
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function computeEntryBindingId(entryKey: string, binding: { id?: string; action: string }): string {
  return `${entryKey}:${binding.id ?? slugifyBindingAction(binding.action)}`
}

export function resolveChordDisplaySteps(
  bindingsForHash: BindingRef[],
  currentEntryBindingById: Map<string, { chord: ChordStep[] }>
): ChordStep[] | null {
  const firstBinding = bindingsForHash[0]
  if (!firstBinding) return null
  const entryBinding = currentEntryBindingById.get(firstBinding.bindingId)
  return entryBinding?.chord ?? null
}

export function buildChordDetailTabs(apps: string[]): ChordDetailTab[] {
  const result: ChordDetailTab[] = [{ type: 'globals' }]
  for (const app of apps) {
    result.push({ type: 'app', app })
  }
  return result
}

export function buildChordDetailRows(
  activeTab: ChordDetailTab,
  bindingsForHash: BindingRef[],
  collisionsById: Map<string, ChordDetailRow['colls']>,
  currentEntryKey: string
): ChordDetailRow[] {
  const filtered =
    activeTab.type === 'globals'
      ? bindingsForHash.filter(binding => binding.scope === 'global')
      : bindingsForHash.filter(binding => binding.app === activeTab.app)

  return filtered.map(binding => ({
    bindingRef: binding,
    scope: binding.scope as 'global' | 'local',
    app: binding.app,
    action: binding.action,
    colls: collisionsById.get(binding.bindingId) ?? [],
    isCurrentApp: binding.entryKey === currentEntryKey
  }))
}
