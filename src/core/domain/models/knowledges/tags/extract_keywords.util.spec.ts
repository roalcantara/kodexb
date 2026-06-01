import { describe, expect, it } from 'bun:test'
import { extractKeywords } from './extract_keywords.util'

describe('extractKeywords', () => {
  it('extracts words >2 chars', () => {
    const result = extractKeywords('build the knowledge base')
    expect(result).toContain('build')
    expect(result).toContain('knowledge')
    expect(result).toContain('base')
    expect(result).not.toContain('the')
  })

  it('filters stop words', () => {
    const result = extractKeywords('this is a test with the and or')
    expect(result).toEqual(['test'])
  })

  it('splits on punctuation', () => {
    const result = extractKeywords('hello, world; test:value')
    expect(result).toContain('hello')
    expect(result).toContain('world')
    expect(result).toContain('test')
    expect(result).toContain('value')
  })

  it('skips short words', () => {
    const result = extractKeywords('a b c ab cd def')
    expect(result).toEqual(['def'])
  })
})
