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
})
