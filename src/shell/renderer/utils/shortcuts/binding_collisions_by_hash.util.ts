// pattern: Functional Core

import type { BindingRef } from '@shared/rpc'

export type BindingCollisionKind = 'hard' | 'soft'

export type BindingCollisionByHash = {
  bindingId: string
  kind: BindingCollisionKind
  otherBindingId: string
  otherChordHash: string
  otherEntryKey: string
  otherApp: string
}

type HashGroupMember = {
  bindingId: string
  entryKey: string
  app: string
  scope: string
}

const collisionKindForPair = (a: HashGroupMember, b: HashGroupMember): BindingCollisionKind => {
  if (a.scope === 'global' && b.scope === 'global') return 'hard'
  if (a.entryKey === b.entryKey) return 'hard'
  if (a.scope === 'local' && b.scope === 'local') return 'soft'
  return 'soft'
}

const buildCollisionRecord = (a: HashGroupMember, b: HashGroupMember, hash: string): BindingCollisionByHash => ({
  bindingId: a.bindingId,
  kind: collisionKindForPair(a, b),
  otherBindingId: b.bindingId,
  otherChordHash: hash,
  otherEntryKey: b.entryKey,
  otherApp: b.app
})

const collisionsForMember = (
  member: HashGroupMember,
  group: HashGroupMember[],
  hash: string
): BindingCollisionByHash[] => {
  const cols: BindingCollisionByHash[] = []
  for (const other of group) {
    if (member.bindingId === other.bindingId) continue
    cols.push(buildCollisionRecord(member, other, hash))
  }
  return cols
}

export function computeCollisionsByHash(bindings: BindingRef[]): Map<string, BindingCollisionByHash[]> {
  const byHash = new Map<string, HashGroupMember[]>()
  for (const binding of bindings) {
    const group = byHash.get(binding.chordHash) ?? []
    group.push({
      bindingId: binding.bindingId,
      entryKey: binding.entryKey,
      app: binding.app,
      scope: binding.scope
    })
    byHash.set(binding.chordHash, group)
  }

  const result = new Map<string, BindingCollisionByHash[]>()
  for (const [hash, group] of byHash) {
    if (group.length < 2) continue
    for (const member of group) {
      result.set(member.bindingId, collisionsForMember(member, group, hash))
    }
  }
  return result
}
