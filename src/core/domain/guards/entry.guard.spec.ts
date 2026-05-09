import { describe, expect, it } from 'bun:test'
import { isEntryType } from './entry.guard'

describe('isEntryType()', () => {
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
