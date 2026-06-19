import { describe, expect, it } from 'bun:test'
import type { Static } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { literalUnion } from './literal_union.util'

describe('literalUnion', () => {
  it('accepts each member of a string tuple', () => {
    const schema = literalUnion(['bookmark', 'command', 'cheat'] as const)
    expect(Value.Check(schema, 'bookmark')).toBe(true)
    expect(Value.Check(schema, 'cheat')).toBe(true)
  })

  it('rejects a non-member', () => {
    const schema = literalUnion(['low', 'high'] as const)
    expect(Value.Check(schema, 'mid')).toBe(false)
  })

  it('accepts number literals', () => {
    const schema = literalUnion([25, 50, 100, 200] as const)
    expect(Value.Check(schema, 50)).toBe(true)
    expect(Value.Check(schema, 75)).toBe(false)
  })

  it('preserves exact literal types (compile-time)', () => {
    const schema = literalUnion(['a', 'b'] as const)
    type T = Static<typeof schema>
    const ok: T = 'a'
    // @ts-expect-error 'c' is not a member
    const bad: T = 'c'
    expect(ok).toBe('a')
    expect(bad).toBeDefined()
  })
})
