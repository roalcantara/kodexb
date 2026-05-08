import { describe, expect, it } from 'bun:test'
import { approxEntryKeyLine, escapeRegex } from './source_location.parser'

describe('escapeRegex()', () => {
  describe.each([
    ['plain string', 'hello', 'hello'],
    ['dot', '.', '\\.'],
    ['question mark', '?', '\\?'],
    ['parentheses', '(foo)', '\\(foo\\)'],
    ['url', 'https://example.com', 'https://example\\.com']
  ])('%s', (_, input, expected) => {
    it(`escapeRegex("${input}") === "${expected}"`, () => {
      expect(escapeRegex(input)).toBe(expected)
    })
  })
})

describe('approxEntryKeyLine()', () => {
  it('finds the 1-based line of an entry key', () => {
    const yaml = `
bookmarks:
  https://example.com:
    desc: test
    tags: [x]
`.trimStart()
    expect(approxEntryKeyLine(yaml, 'bookmarks', 'https://example.com')).toBe(2)
  })

  it('returns undefined for missing section', () => {
    expect(approxEntryKeyLine('bookmarks:\n  key:\n', 'commands', 'key')).toBeUndefined()
  })

  it('returns undefined for missing key', () => {
    expect(approxEntryKeyLine('bookmarks:\n  key:\n', 'bookmarks', 'other')).toBeUndefined()
  })
})
