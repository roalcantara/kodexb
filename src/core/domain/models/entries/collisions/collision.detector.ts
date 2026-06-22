// pattern: Functional Core

import type { BindingRef } from '@shared/rpc'

export type { BindingRef }

export type CollisionKind = 'hard' | 'soft'

export type CollisionReason =
  | 'global-x-any'
  | 'local-same-app'
  | 'cross-app-local'
  | 'global-x-local-cross-app'
  | 'sequence-shadow'

export type Collision = {
  kind: CollisionKind
  against: BindingRef
  reason: CollisionReason
}

function platformsOverlap(a: BindingRef, b: BindingRef): boolean {
  if (a.platform === 'any' || b.platform === 'any') return true
  if (a.platform === b.platform) return true
  return false
}

function isSequenceShadow(candidate: BindingRef, existing: BindingRef): boolean {
  if (!candidate.chordPrefix && !existing.chordPrefix) return false
  if (candidate.chordPrefix && candidate.chordPrefix === existing.chordHash) return true
  if (existing.chordPrefix && existing.chordPrefix === candidate.chordHash) return true
  return false
}

const sequenceShadowCollision = (existing: BindingRef): Collision => ({
  kind: 'hard',
  against: existing,
  reason: 'sequence-shadow'
})

const globalGlobalCollision = (existing: BindingRef, isShadow: boolean): Collision =>
  isShadow ? sequenceShadowCollision(existing) : { kind: 'hard', against: existing, reason: 'global-x-any' }

const localLocalCollision = (candidate: BindingRef, existing: BindingRef, isShadow: boolean): Collision => {
  if (isShadow) return sequenceShadowCollision(existing)
  if (candidate.app === existing.app) {
    return { kind: 'hard', against: existing, reason: 'local-same-app' }
  }
  return { kind: 'soft', against: existing, reason: 'cross-app-local' }
}

const mixedScopeCollision = (candidate: BindingRef, existing: BindingRef, isShadow: boolean): Collision | null => {
  if (isShadow) return sequenceShadowCollision(existing)
  if (candidate.app !== existing.app) {
    return { kind: 'soft', against: existing, reason: 'global-x-local-cross-app' }
  }
  return null
}

function collides(candidate: BindingRef, existing: BindingRef): Collision | null {
  if (!platformsOverlap(candidate, existing)) return null
  if (candidate.chordHash !== existing.chordHash && !isSequenceShadow(candidate, existing)) {
    return null
  }

  const isShadow = isSequenceShadow(candidate, existing)

  if (candidate.scope === 'global' && existing.scope === 'global') {
    return globalGlobalCollision(existing, isShadow)
  }

  if (candidate.scope === 'local' && existing.scope === 'local') {
    return localLocalCollision(candidate, existing, isShadow)
  }

  if (candidate.scope !== existing.scope) {
    return mixedScopeCollision(candidate, existing, isShadow)
  }

  return null
}

export function detect(candidate: BindingRef, existingRefs: BindingRef[]): Collision[] {
  const result: Collision[] = []
  for (const existing of existingRefs) {
    if (existing.bindingId === candidate.bindingId) continue
    const c = collides(candidate, existing)
    if (c) result.push(c)
  }
  return result
}

export function classifyAll(bindings: BindingRef[]): Map<string, Collision[]> {
  const map = new Map<string, Collision[]>()
  for (const binding of bindings) {
    const others = bindings.filter(b => b.bindingId !== binding.bindingId)
    const collisions = detect(binding, others)
    if (collisions.length > 0) {
      map.set(binding.bindingId, collisions)
    }
  }
  return map
}
