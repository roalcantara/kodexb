import { describe, expect, it } from 'bun:test'
import { parseLinksFromSource } from './link.parser'

describe('parseLinksFromSource()', () => {
  describe('when source is valid', () => {
    describe.each([
      ['bare URL string', 'https://example.com', ['https://example.com']],
      ['titled shorthand string', 'Docs: https://example.com', [{ Docs: 'https://example.com' }]],
      ['link object with single URL', { Docs: 'https://example.com' }, [{ Docs: 'https://example.com' }]],
      [
        'link object with URL array',
        { Docs: ['https://a.com', 'https://b.com'] },
        [{ Docs: ['https://a.com', 'https://b.com'] }]
      ],
      ['nested arrays leniently', [['https://a.com'], 'https://b.com'], ['https://a.com', 'https://b.com']]
    ])('with %s', (_, source, expected) => {
      it('returns parsed links', () => {
        expect(parseLinksFromSource(source)).toEqual(expected)
      })
    })
  })

  describe('when source is invalid', () => {
    describe.each([
      ['invalid URL', ['not-a-url'], 'Invalid URL'],
      ['empty object link item', [{}], 'Link object must have at least one key']
    ])('with %s', (_, source, message) => {
      it('raises an error', () => {
        expect(() => parseLinksFromSource(source)).toThrow(message)
      })
    })
  })
})
