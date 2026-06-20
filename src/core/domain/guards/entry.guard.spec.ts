import { describe, expect, it } from 'bun:test'
import { isBlank, isEntryType, isEntryTypeSection, isNoteLang } from './entry.guard'

describe('isBlank', () => {
  it.each([
    [null, true],
    [undefined, true],
    ['', true],
    ['   ', true],
    ['hello', false],
    [0, false],
    [false, false]
  ])('returns %p → %p', (input, expected) => {
    expect(isBlank(input)).toBe(expected)
  })
})

describe('isEntryType', () => {
  it.each([
    ['bookmark', true],
    ['command', true],
    ['cheat', true],
    ['task', true],
    ['unknown', false],
    ['', false],
    [null, false],
    [undefined, false],
    [42, false],
    [{ type: 'bookmark' }, false]
  ])('returns %p → %p', (input, expected) => {
    expect(isEntryType(input)).toBe(expected)
  })
})

describe('isEntryTypeSection', () => {
  it.each([
    ['bookmarks', true],
    ['commands', true],
    ['cheats', true],
    ['tasks', true],
    ['bookmark', false],
    ['unknown', false],
    ['', false],
    [null, false]
  ])('returns %p → %p', (input, expected) => {
    expect(isEntryTypeSection(input)).toBe(expected)
  })
})

describe('isNoteLang', () => {
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
