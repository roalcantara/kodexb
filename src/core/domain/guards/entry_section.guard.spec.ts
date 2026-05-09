import { describe, expect, it } from 'bun:test'
import { isEntryTypeSection } from './entry_section.guard'

describe('isEntryTypeSection()', () => {
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
