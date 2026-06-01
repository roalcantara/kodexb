import { describe, expect, it } from 'bun:test'

import { sampleListStats } from './list_stats.fixture'

describe('sampleListStats', () => {
  it('returns defaults and merges overrides', () => {
    const stats = sampleListStats({ total: 9, tags: { ai: 1 } })
    expect(stats.total).toBe(9)
    expect(stats.tags).toEqual({ ai: 1 })
    expect(stats.bookmark).toBe(1)
  })
})
