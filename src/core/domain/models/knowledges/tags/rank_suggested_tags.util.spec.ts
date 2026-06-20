import { describe, expect, it } from 'bun:test'
import type { Knowledge } from '@core'
import { factoryFor } from '@testing'
import { rankSuggestedTags } from './rank_suggested_tags.util'

const taskRow = (overrides: Partial<Knowledge>): Knowledge =>
  factoryFor('task', { overrides: overrides as Record<string, unknown> }) as Knowledge

describe('rankSuggestedTags', () => {
  it('returns up to 8 suggestions', () => {
    const entry = taskRow({ id: 1, key: 'build', desc: 'build stuff', tags: ['dev'] })
    const all = [
      entry,
      taskRow({ id: 2, key: 'run tests', tags: ['dev', 'testing'] }),
      taskRow({ id: 3, key: 'bun build', desc: 'bun bundling', tags: ['bun', 'dev'] })
    ]
    const result = rankSuggestedTags(entry, all)
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThanOrEqual(8)
    expect(result).not.toContain('dev')
  })

  it('deduplicates co-occurrence and keyword matches', () => {
    const entry = taskRow({ id: 1, key: 'bun build', tags: [] })
    const all = [
      entry,
      taskRow({ id: 2, key: 'setup bun', tags: ['bun'] }),
      taskRow({ id: 3, key: 'run bun', tags: ['bun', 'dev'] })
    ]
    const result = rankSuggestedTags(entry, all)
    const unique = new Set(result)
    expect(unique.size).toBe(result.length)
  })

  it('suggests keywords from content', () => {
    const entry = taskRow({ id: 1, key: 'build', desc: 'build with bun', tags: [] })
    const all = [entry, taskRow({ id: 2, key: 'install bun', tags: ['bun'] })]
    const result = rankSuggestedTags(entry, all)
    expect(result).toContain('bun')
  })

  describe('keyword extraction (via rankSuggestedTags)', () => {
    it('matches words from desc to corpus tags', () => {
      const entry = taskRow({ id: 1, key: 'setup', desc: 'knowledge base', tags: [] })
      const all = [
        entry,
        taskRow({ id: 2, key: 'stuff', tags: ['knowledge'] }),
        taskRow({ id: 3, key: 'stuff', tags: ['base'] })
      ]
      const result = rankSuggestedTags(entry, all)
      expect(result).toContain('knowledge')
    })

    it('matches words from key to corpus tags', () => {
      const entry = taskRow({ id: 1, key: 'testing bun', tags: [] })
      const all = [
        entry,
        taskRow({ id: 2, key: 'stuff', tags: ['testing'] }),
        taskRow({ id: 3, key: 'stuff', tags: ['bun'] })
      ]
      const result = rankSuggestedTags(entry, all)
      expect(result).toContain('testing')
      expect(result).toContain('bun')
    })

    it('splits on punctuation', () => {
      const entry = taskRow({ id: 1, key: 'hello', desc: 'world; test:value', tags: [] })
      const all = [
        entry,
        taskRow({ id: 2, key: 'stuff', tags: ['world'] }),
        taskRow({ id: 3, key: 'stuff', tags: ['test'] }),
        taskRow({ id: 4, key: 'stuff', tags: ['value'] })
      ]
      const result = rankSuggestedTags(entry, all)
      expect(result).toContain('world')
      expect(result).toContain('test')
      expect(result).toContain('value')
    })

    it('skips short words', () => {
      const entry = taskRow({ id: 1, key: 'a', desc: 'b c ab cd def testing', tags: [] })
      const all = [
        entry,
        taskRow({ id: 2, key: 'stuff', tags: ['ab'] }),
        taskRow({ id: 3, key: 'stuff', tags: ['cd'] }),
        taskRow({ id: 4, key: 'stuff', tags: ['testing'] })
      ]
      const result = rankSuggestedTags(entry, all)
      expect(result).toContain('testing')
      expect(result).not.toContain('ab')
      expect(result).not.toContain('cd')
    })
  })

  describe('co-occurrence (via rankSuggestedTags)', () => {
    it('ranks shared tags higher', () => {
      const entry = taskRow({ id: 1, tags: ['dev'] })
      const all = [
        entry,
        taskRow({ id: 2, tags: ['dev', 'shell'] }),
        taskRow({ id: 3, tags: ['dev', 'shell'] }),
        taskRow({ id: 4, tags: ['dev', 'bun'] })
      ]
      const result = rankSuggestedTags(entry, all)
      expect(result).toContain('shell')
      expect(result.length).toBeGreaterThan(0)
    })

    it('excludes own entry from co-occurrence', () => {
      const entry = taskRow({ id: 1, tags: ['dev'] })
      const result = rankSuggestedTags(entry, [entry])
      expect(result).toEqual([])
    })
  })
})
