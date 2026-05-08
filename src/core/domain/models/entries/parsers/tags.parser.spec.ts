import { describe, expect, it } from 'bun:test'
import { normalizeKnowledgeTag, parseTagsFromSource } from './tags.parser'

describe('normalizeKnowledgeTag()', () => {
  describe.each([
    ['trims whitespace', '  foo  ', 'foo'],
    ['lowercases', 'FOO', 'foo'],
    ['replaces hyphens with underscores', 'foo-bar', 'foo_bar'],
    ['handles mixed cases', 'Foo-Bar', 'foo_bar']
  ])('%s', (_, input, expected) => {
    it(`normalizeKnowledgeTag("${input}") === "${expected}"`, () => {
      expect(normalizeKnowledgeTag(input)).toBe(expected)
    })
  })
})

describe('parseTagsFromSource', () => {
  it('parses a valid array of tags', () => {
    expect(parseTagsFromSource(['foo', 'bar'])).toEqual(['foo', 'bar'])
  })

  it('deduplicates tags', () => {
    expect(parseTagsFromSource(['foo', 'foo'])).toEqual(['foo'])
  })

  it('normalizes hyphens to underscores', () => {
    expect(parseTagsFromSource(['foo-bar'])).toEqual(['foo_bar'])
  })

  it('throws on empty array', () => {
    expect(() => parseTagsFromSource([])).toThrow()
  })

  it('throws on more than 4 tags', () => {
    expect(() => parseTagsFromSource(['a', 'b', 'c', 'd', 'e'])).toThrow()
  })

  it('returns empty and then throws when input is not an array', () => {
    expect(() => parseTagsFromSource(null)).toThrow()
  })

  it('skips non-string entries', () => {
    expect(parseTagsFromSource(['foo', 42, 'bar'])).toEqual(['foo', 'bar'])
  })
})
