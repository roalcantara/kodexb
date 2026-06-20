import { describe, expect, it } from 'bun:test'
import { Value } from '@sinclair/typebox/value'
import { configPatchSchema, listOptsSchema, taskCreateSchema } from './payload_schemas'

describe('payload_schemas', () => {
  it('accepts a valid list opts payload', () => {
    expect(Value.Check(listOptsSchema, { query: 'x', limit: 10, offset: 0 })).toBe(true)
  })
  it('rejects unknown keys on list opts', () => {
    expect(Value.Check(listOptsSchema, { bogus: 1 })).toBe(false)
  })
  it('requires a key on task create', () => {
    expect(Value.Check(taskCreateSchema, {})).toBe(false)
    expect(Value.Check(taskCreateSchema, { key: 'k' })).toBe(true)
  })
  it('accepts a valid page size on config patch', () => {
    expect(Value.Check(configPatchSchema, { pageSize: 50 })).toBe(true)
    expect(Value.Check(configPatchSchema, { pageSize: 51 })).toBe(false)
  })
})
