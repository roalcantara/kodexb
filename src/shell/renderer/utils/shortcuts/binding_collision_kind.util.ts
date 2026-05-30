import type { BindingCollisionByHash } from './binding_collisions_by_hash.util'

export function collisionKindFlags(colls: BindingCollisionByHash[]): {
  hasHard: boolean
  hasSoft: boolean
} {
  return {
    hasHard: colls.some(c => c.kind === 'hard'),
    hasSoft: colls.some(c => c.kind === 'soft')
  }
}

export function collisionKindFlagsForBinding(
  collisionsById: Map<string, BindingCollisionByHash[]>,
  bindingId: string
): { colls: BindingCollisionByHash[]; hasHard: boolean; hasSoft: boolean } {
  const colls = collisionsById.get(bindingId) ?? []
  return { colls, ...collisionKindFlags(colls) }
}
