import { describe, expect, it } from 'bun:test'
import { metaFromSourceSchema, parseMetaFromSource } from './meta.schema'

describe('parseMetaFromSource()', () => {
  describe('when input is not an object', () => {
    describe.each([
      ['undefined', undefined],
      ['null', null],
      ['string', 'x'],
      ['array', []]
    ])('with %s', (_, input) => {
      it('returns undefined', () => {
        expect(parseMetaFromSource(input)).toBeUndefined()
      })
    })
  })

  describe('when input is a plain object', () => {
    it('returns the map', () => {
      expect(parseMetaFromSource({ due: '2026-01-01' })).toEqual({ due: '2026-01-01' })
    })
  })
})

describe('metaFromSourceSchema', () => {
  describe('when input is valid', () => {
    it('delegates to parseMetaFromSource', () => {
      expect(metaFromSourceSchema.parse({ due: '2026-01-01' })).toEqual({ due: '2026-01-01' })
    })
  })
})
