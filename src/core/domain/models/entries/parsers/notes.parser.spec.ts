import { describe, expect, it } from 'bun:test'
import type { JsonValue } from 'type-fest'
import { parseNoteBlock, parseNoteBlocksFromSource } from './notes.parser'

describe('parseNoteBlock()', () => {
  describe('when note is invalid', () => {
    describe.each([
      ['non-object note', null, 'Each note must be a non-empty object'],
      ['unsupported language', { nope: 'text' }, 'Unsupported note block language']
    ])('with %s', (_, note, message) => {
      it('raises an error', () => {
        expect(() => parseNoteBlock(note)).toThrow(message)
      })
    })
  })

  describe('when note is valid', () => {
    it('returns the note block', () => {
      expect(parseNoteBlock({ md: 'hello' })).toEqual({ md: 'hello' })
    })
  })
})

describe('parseNoteBlocksFromSource()', () => {
  const mixedNoteArray: JsonValue = [{ md: 'ok' }, null, { nope: 'x' }]

  describe.each<[string, JsonValue, { md: string }[]]>([
    ['markdown scalar', 'hello', [{ md: 'hello' }]],
    ['single map', { md: 'hello' }, [{ md: 'hello' }]],
    ['array with invalid entries skipped', mixedNoteArray, [{ md: 'ok' }]]
  ])('when source is %s', (_, source, expected) => {
    it('returns note blocks', () => {
      expect(parseNoteBlocksFromSource(source)).toEqual(expected)
    })
  })
})
