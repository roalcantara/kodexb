import { describe, expect, it } from 'bun:test'
import { normalizeKnowledgeTag, parseTagsFromSource } from './tags.parser'

describe('normalizeKnowledgeTag()', () => {
  describe.each([
    ['trims whitespace', '  foo  ', 'foo'],
    ['lowercases', 'FOO', 'foo'],
    ['replaces hyphens with underscores', 'foo-bar', 'foo_bar'],
    ['handles mixed cases', 'Foo-Bar', 'foo_bar']
  ])('when tag %s', (_, input, expected) => {
    it('returns normalized tag', () => {
      expect(normalizeKnowledgeTag(input)).toBe(expected)
    })
  })
})

describe('parseTagsFromSource()', () => {
  describe('when source is valid', () => {
    describe.each([
      ['valid array', ['foo', 'bar'], ['foo', 'bar']],
      ['deduplicated tags', ['foo', 'foo'], ['foo']],
      ['normalized hyphens', ['foo-bar'], ['foo_bar']],
      ['non-string entries skipped', ['foo', 42, 'bar'], ['foo', 'bar']]
    ])('with %s', (_, source, expected) => {
      it('returns parsed tags', () => {
        expect(parseTagsFromSource(source)).toEqual(expected)
      })
    })
  })

  describe('when source is invalid', () => {
    describe.each([
      ['empty array', []],
      ['more than four tags', ['a', 'b', 'c', 'd', 'e']],
      ['non-array input', null]
    ])('with %s', (_, source) => {
      it('raises an error', () => {
        expect(() => parseTagsFromSource(source)).toThrow()
      })
    })
  })
})
