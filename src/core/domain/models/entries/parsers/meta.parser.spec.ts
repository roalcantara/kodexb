import { describe, expect, it } from 'bun:test'
import { parseMetaFromSource } from './meta.parser'

describe('meta.parser', () => {
  it('re-exports parseMetaFromSource', () => {
    expect(parseMetaFromSource({ due: '2026-01-01' })).toEqual({ due: '2026-01-01' })
  })
})
