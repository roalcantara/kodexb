import { describe, expect, it } from 'bun:test'
import { Value } from '@sinclair/typebox/value'
import { tagsSchema } from './tags.schema'

describe('tagsSchema', () => {
  it('accepts a valid set of tags', () => {
    expect(Value.Check(tagsSchema, ['foo', 'bar'])).toBe(true)
  })

  it('rejects empty tags', () => {
    expect(Value.Check(tagsSchema, [])).toBe(false)
  })

  it('rejects more than 4 tags', () => {
    expect(Value.Check(tagsSchema, ['a', 'b', 'c', 'd', 'e'])).toBe(false)
  })

  it('rejects invalid characters', () => {
    expect(Value.Check(tagsSchema, ['foo-bar'])).toBe(false)
  })
})
