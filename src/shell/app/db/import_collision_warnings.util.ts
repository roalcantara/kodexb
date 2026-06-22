import { classifyAll } from '../../../core/domain/models/entries/collisions/collision.detector'
import type { BindingRef } from '@shared/rpc'

export type HardCollisionWarning = {
  kind: 'hard'
  chordHash: string
  apps: [string, string]
  actions: [string, string]
}

export function collectHardCollisionWarnings(bindings: BindingRef[]): HardCollisionWarning[] {
  const byId = new Map(bindings.map(binding => [binding.bindingId, binding]))
  const collisionMap = classifyAll(bindings)
  const seen = new Set<string>()
  const warnings: HardCollisionWarning[] = []

  for (const [bindingId, collisions] of collisionMap) {
    const binding = byId.get(bindingId)
    if (!binding) continue

    for (const collision of collisions) {
      if (collision.kind !== 'hard') continue
      const other = collision.against
      const apps = [binding.app, other.app].sort() as [string, string]
      const dedupeKey = `${binding.chordHash}:${apps[0]}:${apps[1]}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      warnings.push({
        kind: 'hard',
        chordHash: binding.chordHash,
        apps,
        actions: [binding.action, other.action]
      })
    }
  }

  return warnings.sort((a, b) => a.chordHash.localeCompare(b.chordHash) || a.apps[0].localeCompare(b.apps[0]))
}

export function formatHardCollisionWarning(warning: HardCollisionWarning): string {
  return `hard collision: ${warning.chordHash} between ${warning.apps[0]} and ${warning.apps[1]} (${warning.actions[0]} / ${warning.actions[1]})`
}

export function hardCollisionWarningMessages(bindings: BindingRef[]): string[] {
  return collectHardCollisionWarnings(bindings).map(formatHardCollisionWarning)
}
