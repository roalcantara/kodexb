import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { getBindingScore, recordBindingVisit } from './binding_frecency.repository'
import { CREATE_BINDING_FRECENCY_INDEXES_SQL, CREATE_BINDING_FRECENCY_SQL } from './schema'

function createDb(): Database {
  const db = new Database(':memory:')
  db.run(CREATE_BINDING_FRECENCY_SQL)
  for (const sql of CREATE_BINDING_FRECENCY_INDEXES_SQL) db.run(sql)
  return db
}

describe('binding_frecency.repository', () => {
  let db: Database

  beforeEach(() => {
    db = createDb()
  })

  afterEach(() => {
    db.close()
  })

  describe('recordBindingVisit', () => {
    it('creates a new frecency row for unknown binding', () => {
      recordBindingVisit(db, 'vscode:go-to-file')
      expect(getBindingScore(db, 'vscode:go-to-file')).toBeGreaterThan(0)
    })

    it('updates score on subsequent visit', () => {
      recordBindingVisit(db, 'test:action', 1.0, '2026-01-01T00:00:00.000Z')
      const first = getBindingScore(db, 'test:action')
      recordBindingVisit(db, 'test:action', 1.0, '2026-06-01T00:00:00.000Z')
      const second = getBindingScore(db, 'test:action')
      expect(second).toBeGreaterThan(first)
    })

    it('applies weight multiplier', () => {
      recordBindingVisit(db, 'test:half', 0.5)
      const halfScore = getBindingScore(db, 'test:half')
      recordBindingVisit(db, 'test:full', 1.0)
      const fullScore = getBindingScore(db, 'test:full')
      expect(fullScore).toBeGreaterThan(halfScore)
    })
  })

  describe('getBindingScore', () => {
    it('returns 0 for unknown binding', () => {
      expect(getBindingScore(db, 'nonexistent')).toBe(0)
    })
  })
})
