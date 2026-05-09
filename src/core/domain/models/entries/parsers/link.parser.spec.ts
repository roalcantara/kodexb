import { describe, expect, it } from 'bun:test'
import { parseLinksFromSource } from './link.parser'

describe('parseLinksFromSource', () => {
  it('parses a bare URL string', () => {
    expect(parseLinksFromSource('https://example.com')).toEqual(['https://example.com'])
  })

  it('parses titled shorthand string', () => {
    expect(parseLinksFromSource('Docs: https://example.com')).toEqual([{ Docs: 'https://example.com' }])
  })

  it('parses link object with single URL', () => {
    expect(parseLinksFromSource({ Docs: 'https://example.com' })).toEqual([{ Docs: 'https://example.com' }])
  })

  it('parses link object with URL array', () => {
    expect(parseLinksFromSource({ Docs: ['https://a.com', 'https://b.com'] })).toEqual([
      { Docs: ['https://a.com', 'https://b.com'] }
    ])
  })

  it('rejects invalid URL', () => {
    expect(() => parseLinksFromSource(['not-a-url'])).toThrow('Invalid URL')
  })

  it('rejects empty object link item', () => {
    expect(() => parseLinksFromSource([{}])).toThrow('Link object must have at least one key')
  })

  it('normalizes nested arrays leniently', () => {
    expect(parseLinksFromSource([['https://a.com'], 'https://b.com'])).toEqual(['https://a.com', 'https://b.com'])
  })
})
