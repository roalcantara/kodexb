import { describe, expect, it } from 'bun:test'
import { parseChord } from './chord.parser'
import { chordPrefix, hashChord } from './chord_hash.util'

const hash = (input: string) => {
  const result = parseChord(input)
  if (result.isErr()) throw new Error(result.error.message)
  return hashChord(result.value)
}

describe('hashChord()', () => {
  describe.each([
    ['cmd+p', 'cmd+p'],
    ['cmd+shift+p', 'cmd+shift+p'],
    ['shift+ctrl+cmd+p', 'ctrl+cmd+shift+p'],
    ['f5', 'f5'],
    ['cmd+k cmd+s', 'cmd+k>cmd+s']
  ])('when chord is %s', (input, expected) => {
    it('returns canonical hash', () => {
      expect(hash(input)).toBe(expected)
    })
  })
})

describe('chordPrefix()', () => {
  describe.each([
    ['single-step chord', 'cmd+p', null],
    ['multi-step chord', 'cmd+k cmd+b', 'cmd+k']
  ])('when chord is %s', (_, input, expected) => {
    it('returns prefix or null', () => {
      const result = parseChord(input)
      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(chordPrefix(result.value)).toBe(expected)
    })
  })
})
