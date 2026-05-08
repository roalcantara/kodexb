import { describe, expect, it } from 'bun:test'
import { parseMetaFromSource } from './meta.parser'

describe('parseMetaFromSource', () => {
  it('returns undefined for non-object values', () => {
    expect(parseMetaFromSource(undefined)).toBeUndefined()
    expect(parseMetaFromSource(null)).toBeUndefined()
    expect(parseMetaFromSource('x')).toBeUndefined()
    expect(parseMetaFromSource([])).toBeUndefined()
  })

  it('returns the object as meta map', () => {
    expect(parseMetaFromSource({ due: '2026-01-01' })).toEqual({ due: '2026-01-01' })
  })
})
