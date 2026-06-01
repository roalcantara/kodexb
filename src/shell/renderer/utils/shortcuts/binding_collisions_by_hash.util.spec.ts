import { describe, expect, it } from 'bun:test'
import { factoryFor } from '@testing'
import { computeCollisionsByHash } from './binding_collisions_by_hash.util'

describe('computeCollisionsByHash', () => {
  it('marks global-global pairs as hard', () => {
    const bindings = [
      factoryFor('bindingRef:global', {
        overrides: {
          bindingId: 'a',
          entryKey: 'app1',
          app: 'app1',
          chordHash: 'h1',
          action: 'A'
        }
      }),
      factoryFor('bindingRef:global', {
        overrides: {
          bindingId: 'b',
          entryKey: 'app2',
          app: 'app2',
          chordHash: 'h1',
          action: 'B'
        }
      })
    ]
    const cols = computeCollisionsByHash(bindings).get('a')
    expect(cols?.[0]?.kind).toBe('hard')
  })
})
