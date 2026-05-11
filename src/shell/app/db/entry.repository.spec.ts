import { describe, expect, it } from 'bun:test'
import { parseSourceFile, toKnowledge } from '@core'
import { createSeededMemoryDb, readMinimalFixtureEntries } from '@testing'
import { openDatabase } from './client'
import { findAll, findById, getDbStats, getTagCounts, rebuildFts, upsert } from './entry.repository'

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

  it('inserts a new row and returns "inserted"', () => {
    const { db } = makeMemoryDb()
    const [entry] = parseSourceFile(filePath, content)
    if (!entry) throw new Error('expected entry')
    const result = upsert(db, toKnowledge(entry, Date.now()))
    expect(result).toBe('inserted')
  })

  it('updates an existing row and returns "updated"', () => {
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
})

describe('findAll()', () => {
  it('returns all entries after seeding', async () => {
    const { raw } = await createSeededMemoryDb()
    const rows = findAll(raw)
    expect(rows.length).toBe(4)
  })

  it('filters by type', async () => {
    const { raw } = await createSeededMemoryDb()
    const bookmarks = findAll(raw, { types: ['bookmark'] })
    expect(bookmarks.every(r => r.type === 'bookmark')).toBe(true)
  })

  it('returns FTS5 results when query is provided', async () => {
    const { raw } = await createSeededMemoryDb()
    const results = findAll(raw, { query: 'git' })
    expect(results.length).toBeGreaterThan(0)
  })

  it('returns empty array when FTS query matches nothing', async () => {
    const { raw } = await createSeededMemoryDb()
    const results = findAll(raw, { query: 'zzznomatch9999' })
    expect(results).toHaveLength(0)
  })

  it('second import is idempotent (row counts stable)', async () => {
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
  it('returns a knowledge row by id', async () => {
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
  it('returns correct total and byType breakdown', async () => {
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
  it('aggregates tags from JSON tag arrays', async () => {
    const { raw } = await createSeededMemoryDb()
    const tags = getTagCounts(raw)
    expect(tags.git).toBe(2)
    expect(tags.example).toBe(1)
    expect(tags.dev).toBe(1)
  })
})
