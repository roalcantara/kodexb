import { describe, expect, it } from 'bun:test'
import { parseSourceFile, toKnowledge } from '@core'
import { createSeededMemoryDb, factoryFor, readMinimalFixtureEntries } from '@testing'
import { openDatabase } from './client'
import { findAll, findById, getDbStats, getTagCounts, rebuildFts, upsert } from './entry.repository'
import { recordEntryVisit } from './frecency.repository'

function makeMemoryDb() {
  return openDatabase(':memory:')
}

describe('upsert()', () => {
  const filePath = '/test.yml'
  const content = `
bookmarks:
  https://example.com:
    desc: Example
    tags: [test]
`

  it('inserts new row', () => {
    const { db } = makeMemoryDb()
    const [entry] = parseSourceFile(filePath, content)
    if (!entry) throw new Error('expected entry')
    const result = upsert(db, toKnowledge(entry, Date.now()))
    expect(result).toBe('inserted')
  })

  it('updates existing row', () => {
    const { db } = makeMemoryDb()
    const [entry] = parseSourceFile(filePath, content)
    if (!entry) throw new Error('expected entry')
    const knowledge = toKnowledge(entry, Date.now())
    upsert(db, knowledge)
    const result = upsert(db, knowledge)
    expect(result).toBe('updated')
  })
})

describe('openDatabase()', () => {
  it('creates the knowledges type index', () => {
    const { raw } = makeMemoryDb()
    const idx = raw.query("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_knowledges_type'").get()
    expect(idx).toBeTruthy()
  })

  it('creates entry_frecency table and score index', () => {
    const { raw } = makeMemoryDb()
    const table = raw.query("SELECT name FROM sqlite_master WHERE type='table' AND name='entry_frecency'").get()
    const idx = raw.query("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_entry_frecency_score'").get()
    expect(table).toBeTruthy()
    expect(idx).toBeTruthy()
  })
})

describe('findAll()', () => {
  it('returns all after seeding', async () => {
    const { raw } = await createSeededMemoryDb()
    const rows = findAll(raw)
    expect(rows.length).toBe(4)
  })

  it('filters by type', async () => {
    const { raw } = await createSeededMemoryDb()
    const bookmarks = findAll(raw, { types: ['bookmark'] })
    expect(bookmarks.filter(r => r.type !== 'bookmark')).toHaveLength(0)
  })

  it('returns FTS5 results with query', async () => {
    const { raw } = await createSeededMemoryDb()
    const results = findAll(raw, { query: 'git' })
    expect(results.length).toBeGreaterThan(0)
  })

  it('orders plain browse by frecency', () => {
    const { raw } = makeMemoryDb()
    const low = factoryFor('bookmark', { overrides: { id: 1, key: 'https://low.example', updatedAt: 100 } })
    const high = factoryFor('bookmark', { overrides: { id: 2, key: 'https://high.example', updatedAt: 200 } })
    upsert(raw, low)
    upsert(raw, high)
    recordEntryVisit(raw, low.id, 1_700_000_000_000)
    recordEntryVisit(raw, low.id, 1_700_000_000_001)
    recordEntryVisit(raw, high.id, 1_700_000_000_000)
    const rows = findAll(raw, { limit: 10 })
    expect(rows[0]?.id).toBe(low.id)
    expect(rows[0]?.frecencyScore).toBeGreaterThan(rows[1]?.frecencyScore ?? 0)
    expect(rows[0]?.visitCount).toBe(2)
  })

  it('orders FTS hits by BM25 relevance', () => {
    const { raw } = makeMemoryDb()
    const weaker = factoryFor('knowledge:weaker')
    const stronger = factoryFor('knowledge:stronger')
    upsert(raw, weaker)
    upsert(raw, stronger)
    rebuildFts(raw)
    const results = findAll(raw, { query: 'brew auto', limit: 10 })
    expect(results[0]?.id).toBe(stronger.id)
  })

  it('returns empty for unmatched FTS query', async () => {
    const { raw } = await createSeededMemoryDb()
    const results = findAll(raw, { query: 'zzznomatch9999' })
    expect(results).toHaveLength(0)
  })

  it('applies tag filter before limit', () => {
    const { raw } = makeMemoryDb()
    for (let i = 0; i < 55; i++) {
      upsert(raw, factoryFor('bookmark', { overrides: { tags: ['other'], key: `https://example.com/page/${i}` } }))
    }
    upsert(
      raw,
      factoryFor('bookmark', {
        overrides: { tags: ['needle'], key: 'https://example.com/has-needle' }
      })
    )
    rebuildFts(raw)
    const got = findAll(raw, { tags: ['needle'], limit: 50, offset: 0 })
    expect(got).toHaveLength(1)
    expect(got[0]?.tags).toContain('needle')
  })

  it('combines tags with AND', () => {
    const { raw } = makeMemoryDb()
    upsert(raw, factoryFor('bookmark', { overrides: { id: 101, tags: ['a'], key: 'https://a.example' } }))
    upsert(raw, factoryFor('bookmark', { overrides: { id: 102, tags: ['b'], key: 'https://b.example' } }))
    upsert(raw, factoryFor('bookmark', { overrides: { id: 103, tags: ['a', 'b'], key: 'https://ab.example' } }))
    rebuildFts(raw)
    const both = findAll(raw, { tags: ['a', 'b'], limit: 10, offset: 0 })
    expect(both).toHaveLength(1)
    expect(both[0]?.id).toBe(103)
  })

  it('second import is idempotent', async () => {
    const { db, raw } = await createSeededMemoryDb()
    const countBefore = findAll(raw).length
    const entries = await readMinimalFixtureEntries()
    const now = Date.now()
    await Promise.all(entries.map(entry => upsert(db, toKnowledge(entry, now))))
    rebuildFts(raw)
    const countAfter = findAll(raw).length
    expect(countAfter).toBe(countBefore)
  })
})

describe('findById()', () => {
  it('returns row by id', async () => {
    const { raw } = await createSeededMemoryDb()
    const all = findAll(raw)
    const first = all[0]
    if (!first) throw new Error('expected rows')
    const found = findById(raw, first.id)
    expect(found).not.toBeNull()
    expect(found?.id).toBe(first.id)
  })

  it('returns null for unknown id', () => {
    const { raw } = makeMemoryDb()
    expect(findById(raw, 999_999_999)).toBeNull()
  })
})

describe('getDbStats()', () => {
  it('returns correct total and byType', async () => {
    const { raw } = await createSeededMemoryDb()
    const stats = getDbStats(raw)
    expect(stats.total).toBe(4)
    expect(stats.byType.bookmark).toBe(1)
    expect(stats.byType.command).toBe(1)
    expect(stats.byType.cheat).toBe(1)
    expect(stats.byType.task).toBe(1)
  })
})

describe('getTagCounts()', () => {
  it('aggregates tags from JSON arrays', async () => {
    const { raw } = await createSeededMemoryDb()
    const tags = getTagCounts(raw)
    expect(tags.git).toBe(2)
    expect(tags.example).toBe(1)
    expect(tags.dev).toBe(1)
  })
})
