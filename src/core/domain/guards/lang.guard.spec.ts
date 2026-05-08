import { describe, expect, it } from 'bun:test'
import { isNoteLang } from './lang.guard'

describe('isNoteLang()', () => {
  it.each([
    ['md', true],
    ['markdown', true],
    ['ts', true],
    ['typescript', true],
    ['sh', true],
    ['go', true],
    ['unknownlang', false],
    ['', false],
    ['   ', false],
    [null, false],
    [undefined, false],
    [42, false]
  ])('returns %p → %p', (input, expected) => {
    expect(isNoteLang(input)).toBe(expected)
  })
})
