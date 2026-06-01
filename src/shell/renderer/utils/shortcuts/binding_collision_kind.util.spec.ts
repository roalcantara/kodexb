import { describe, expect, it } from 'bun:test'
import { collisionKindFlags, collisionKindFlagsForBinding } from './binding_collision_kind.util'
import type { BindingCollisionByHash } from './binding_collisions_by_hash.util'

function sampleCollision(kind: BindingCollisionByHash['kind'], suffix: string): BindingCollisionByHash {
  return {
    bindingId: `b-${suffix}`,
    kind,
    otherBindingId: `other-${suffix}`,
    otherChordHash: 'cmd+p',
    otherEntryKey: `entry-${suffix}`,
    otherApp: `app-${suffix}`
  }
}

describe('collisionKindFlags', () => {
  it('detects hard and soft kinds', () => {
    expect(collisionKindFlags([sampleCollision('hard', 'h')])).toEqual({ hasHard: true, hasSoft: false })
    expect(collisionKindFlags([sampleCollision('soft', 's')])).toEqual({ hasHard: false, hasSoft: true })
  })
})

describe('collisionKindFlagsForBinding', () => {
  it('looks up binding id in the map', () => {
    const colls = [sampleCollision('hard', '1')]
    const map = new Map([['b1', colls]])
    expect(collisionKindFlagsForBinding(map, 'b1')).toEqual({ colls, hasHard: true, hasSoft: false })
    expect(collisionKindFlagsForBinding(map, 'missing')).toEqual({ colls: [], hasHard: false, hasSoft: false })
  })
})
