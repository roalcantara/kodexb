import { describe, expect, it } from 'bun:test'
import { factoryFor } from '@testing'
import { openDatabase } from './client'
import { upsert } from './entry.repository'
import { recordEntryVisit } from './frecency.repository'

describe('recordEntryVisit()', () => {
  it('creates row on first visit', () => {
    const { raw } = openDatabase(':memory:')
    const row = factoryFor('bookmark')
    upsert(raw, row)
    const now = 1_700_000_000_000
    expect(recordEntryVisit(raw, row.id, now)).toBe(true)

    const stored = raw
      .query<{ frecency_score: number; visit_count: number }, [number]>(
        'SELECT frecency_score, visit_count FROM entry_frecency WHERE entry_id = ?'
      )
      .get(row.id)
    expect(stored?.visit_count).toBe(1)
    expect(stored?.frecency_score).toBe(1)
  })

  it('returns false for unknown id', () => {
    const { raw } = openDatabase(':memory:')
    expect(recordEntryVisit(raw, 999)).toBe(false)
  })

  it('cascades on knowledge delete', () => {
    const { raw } = openDatabase(':memory:')
    const row = factoryFor('bookmark')
    upsert(raw, row)
    recordEntryVisit(raw, row.id)
    raw.query('DELETE FROM knowledges WHERE id = ?').run(row.id)
    const left = raw.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM entry_frecency').get()
    expect(left?.n).toBe(0)
  })
})
