import { describe, expect, it } from 'bun:test'
import type { Knowledge } from '../../../core'
import { rankSuggestedTags } from './app_tag_rank.util'
import { computeCooccurrence, countCooccurrence, extractKeywords } from './app_tag_suggest.util'

function makeEntry(overrides: Partial<Knowledge> = {}): Knowledge {
  return {
    type: 'task',
    id: 1,
    key: 'Build kb',
    desc: 'Build the knowledge base app',
    source: '/tmp/test.yaml',
    doc: '',
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  } as Knowledge
}

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

describe('countCooccurrence', () => {
  it('counts shared tags between entries', () => {
    const cooc = new Map<string, number>()
    countCooccurrence(cooc, ['dev', 'shell'], new Set(['dev']))
    expect(cooc.get('shell')).toBe(1)
  })

  it('skips tags already on the entry', () => {
    const cooc = new Map<string, number>()
    countCooccurrence(cooc, ['dev', 'shell'], new Set(['dev', 'shell']))
    expect(cooc.has('dev')).toBe(false)
    expect(cooc.has('shell')).toBe(false)
  })

  it('skips entries with no shared tags', () => {
    const cooc = new Map<string, number>()
    countCooccurrence(cooc, ['dev'], new Set(['design']))
    expect(cooc.size).toBe(0)
  })
})

describe('computeCooccurrence', () => {
  it('returns top co-occurring tags', () => {
    const entry = makeEntry({ id: 1, tags: ['dev'] })
    const all = [
      entry,
      makeEntry({ id: 2, tags: ['dev', 'shell'] }),
      makeEntry({ id: 3, tags: ['dev', 'shell'] }),
      makeEntry({ id: 4, tags: ['dev', 'bun'] })
    ]
    const result = computeCooccurrence(entry, all, new Set(['dev']))
    expect(result).toContain('shell')
    expect(result.length).toBeGreaterThan(0)
  })

  it('excludes own entry', () => {
    const entry = makeEntry({ id: 1, tags: ['dev'] })
    const result = computeCooccurrence(entry, [entry], new Set(['dev']))
    expect(result).toEqual([])
  })
})

describe('rankSuggestedTags', () => {
  it('returns up to 8 suggestions', () => {
    const entry = makeEntry({ id: 1, key: 'build', desc: 'build stuff', tags: ['dev'] })
    const all = [
      entry,
      makeEntry({ id: 2, key: 'run tests', tags: ['dev', 'testing'] }),
      makeEntry({ id: 3, key: 'bun build', desc: 'bun bundling', tags: ['bun', 'dev'] })
    ]
    const result = rankSuggestedTags(entry, all)
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThanOrEqual(8)
    expect(result).not.toContain('dev') // already on the entry
  })

  it('deduplicates co-occurrence and keyword matches', () => {
    const entry = makeEntry({ id: 1, key: 'bun build', tags: [] })
    const all = [
      entry,
      makeEntry({ id: 2, key: 'setup bun', tags: ['bun'] }),
      makeEntry({ id: 3, key: 'run bun', tags: ['bun', 'dev'] })
    ]
    const result = rankSuggestedTags(entry, all)
    const unique = new Set(result)
    expect(unique.size).toBe(result.length)
  })

  it('suggests keywords from content', () => {
    const entry = makeEntry({ id: 1, key: 'build', desc: 'build with bun', tags: [] })
    const all = [entry, makeEntry({ id: 2, key: 'install bun', tags: ['bun'] })]
    const result = rankSuggestedTags(entry, all)
    expect(result).toContain('bun')
  })
})
