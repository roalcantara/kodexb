import { describe, expect, it } from 'bun:test'
import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { strictObject } from './strict_object.schema'

describe('strictObject', () => {
  it('accepts a matching object', () => {
    const schema = strictObject({ id: Type.Integer() })
    expect(Value.Check(schema, { id: 1 })).toBe(true)
  })

  it('rejects unknown properties', () => {
    const schema = strictObject({ id: Type.Integer() })
    expect(Value.Check(schema, { id: 1, extra: true })).toBe(false)
  })
})
