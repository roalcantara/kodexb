import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { configureSync, type LogRecord } from '@logtape/logtape'
import { repositoryStmts } from './db_query.logger'

const ITEM_REPRESENTATION = /^#<Item /

type CapturedRecord = LogRecord & { category: readonly string[] }

const records: CapturedRecord[] = []

function memorySink(record: LogRecord) {
  records.push(record as CapturedRecord)
}

function configureAt(level: 'warning' | 'debug' | 'trace') {
  configureSync({
    reset: true,
    sinks: { mem: memorySink },
    loggers: [
      { category: ['logtape', 'meta'], sinks: [], lowestLevel: 'fatal' },
      // Use `parentSinks: 'override'` so records on `['kb', 'sqlite']` do not
      // double-count against the `['kb']` ancestor sink as they bubble up.
      { category: ['kb', 'sqlite'], sinks: ['mem'], lowestLevel: level, parentSinks: 'override' },
      { category: ['kb'], sinks: [], lowestLevel: level }
    ]
  })
}

function seedDb(): Database {
  const db = new Database(':memory:')
  db.run('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL, qty INTEGER NOT NULL)')
  db.run(`INSERT INTO items (name, qty) VALUES ('apple', 3), ('banana', 7), ('cherry', 12)`)
  return db
}

function bag(db: Database) {
  return repositoryStmts(db, 'Item', {
    findAll: 'SELECT * FROM items ORDER BY id',
    findById: 'SELECT * FROM items WHERE id = ?',
    countAll: 'SELECT COUNT(*) AS n FROM items',
    insert: 'INSERT INTO items (name, qty) VALUES (?, ?)',
    deleteAll: 'DELETE FROM items'
  })
}

function sqliteRecords() {
  return records.filter(r => r.category.join('.') === 'kb.sqlite')
}

function firstSqliteProps(): Record<string, unknown> {
  return (sqliteRecords()[0]?.properties as Record<string, unknown>) ?? {}
}

describe('repositoryStmts', () => {
  beforeEach(() => {
    records.length = 0
  })
  afterEach(() => {
    records.length = 0
  })

  describe('when LOG_LEVEL=default', () => {
    beforeEach(() => {
      configureAt('warning')
      const db = seedDb()
      const stmts = bag(db)
      stmts.findAll.all()
    })

    it('emits no debug records', () => {
      expect(sqliteRecords()).toHaveLength(0)
    })
  })

  describe('when LOG_LEVEL=debug', () => {
    describe('with a .all() call', () => {
      beforeEach(() => {
        configureAt('debug')
        bag(seedDb()).findAll.all()
      })

      it('emits one record', () => {
        expect(sqliteRecords()).toHaveLength(1)
      })

      it('records the noun', () => {
        expect(firstSqliteProps().noun).toBe('Item')
      })

      it('records the sql verbatim', () => {
        expect(firstSqliteProps().sql).toBe('SELECT * FROM items ORDER BY id')
      })

      it('records the row count', () => {
        expect(firstSqliteProps().rows).toBe(3)
      })

      it('records duration_ms as a number', () => {
        expect(typeof firstSqliteProps().duration_ms).toBe('number')
      })

      it('omits binds', () => {
        expect(firstSqliteProps().binds).toBeUndefined()
      })

      it('omits representation', () => {
        expect(firstSqliteProps().representation).toBeUndefined()
      })
    })

    describe('with a .get() call', () => {
      describe('when the row exists', () => {
        beforeEach(() => {
          configureAt('debug')
          bag(seedDb()).findById.get(1)
        })

        it('records rows=1', () => {
          expect(firstSqliteProps().rows).toBe(1)
        })
      })

      describe('when the row does not exist', () => {
        beforeEach(() => {
          configureAt('debug')
          bag(seedDb()).findById.get(999)
        })

        it('records rows=0', () => {
          expect(firstSqliteProps().rows).toBe(0)
        })
      })
    })

    describe('with a .run() call', () => {
      beforeEach(() => {
        configureAt('debug')
        bag(seedDb()).insert.run('date', 5)
      })

      it('records the changes count as rows', () => {
        expect(firstSqliteProps().rows).toBe(1)
      })
    })
  })

  describe('when LOG_LEVEL=trace', () => {
    describe('with a .get() call', () => {
      beforeEach(() => {
        configureAt('trace')
        bag(seedDb()).findById.get(1)
      })

      it('records binds', () => {
        const binds = firstSqliteProps().binds as unknown[]
        expect(Array.isArray(binds)).toBe(true)
        expect(binds[0]).toBe(1)
      })

      it('formats representation like #<Item …>', () => {
        expect(firstSqliteProps().representation as string).toMatch(ITEM_REPRESENTATION)
      })
    })

    describe('with a result row larger than 200 chars', () => {
      let repr: string

      beforeEach(() => {
        configureAt('trace')
        const db = new Database(':memory:')
        db.run('CREATE TABLE big (id INTEGER PRIMARY KEY, blob TEXT NOT NULL)')
        db.run(`INSERT INTO big (blob) VALUES ('${'X'.repeat(500)}')`)
        repositoryStmts(db, 'Big', { findOne: 'SELECT * FROM big WHERE id = ?' }).findOne.get(1)
        repr = firstSqliteProps().representation as string
      })

      it('truncates representation to 200 chars', () => {
        expect(repr.length).toBeLessThanOrEqual(200)
      })

      it('marks truncation with a trailing …>', () => {
        expect(repr.endsWith('…>')).toBe(true)
      })
    })
  })

  describe('when the query fails', () => {
    let caught: unknown

    beforeEach(() => {
      configureAt('debug')
      const db = new Database(':memory:')
      db.run('CREATE TABLE t (id INTEGER PRIMARY KEY)')
      const stmts = repositoryStmts(db, 'Bad', { insert: 'INSERT INTO t (id) VALUES (?)' })
      stmts.insert.run(1)
      try {
        stmts.insert.run(1)
      } catch (e) {
        caught = e
      }
    })

    it('rethrows the original error', () => {
      expect(caught).toBeInstanceOf(Error)
    })

    it('emits one error record on kb.sqlite', () => {
      const errors = sqliteRecords().filter(r => r.level === 'error')
      expect(errors).toHaveLength(1)
    })

    it('records the noun on the error', () => {
      const errors = sqliteRecords().filter(r => r.level === 'error')
      expect((errors[0]?.properties as Record<string, unknown>).noun).toBe('Bad')
    })
  })

  describe('with a { noun, sql } statement override', () => {
    beforeEach(() => {
      configureAt('debug')
      const stmts = repositoryStmts(seedDb(), 'Default', {
        special: { noun: 'Override', sql: 'SELECT 1 AS one' }
      })
      stmts.special.get()
    })

    it('uses the override noun', () => {
      expect(firstSqliteProps().noun).toBe('Override')
    })
  })
})
