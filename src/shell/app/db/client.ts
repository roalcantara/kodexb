import { Database } from 'bun:sqlite'
import {
  CREATE_BINDING_FRECENCY_INDEXES_SQL,
  CREATE_BINDING_FRECENCY_SQL,
  CREATE_BINDING_INDEXES_SQL,
  CREATE_ENTRY_BINDINGS_SQL,
  CREATE_ENTRY_FRECENCY_SQL,
  CREATE_FTS_SQL,
  CREATE_INDEXES_SQL,
  CREATE_KNOWLEDGES_SQL
} from './schema'

export type DbHandle = {
  db: Database
  raw: Database
}

/**
 * Opens (or creates) a SQLite database at the given path.
 * Accepts `:memory:` for in-process tests.
 */
export function openDatabase(dbPath: string): DbHandle {
  const resolved = dbPath === ':memory:' ? dbPath : dbPath
  const db = new Database(resolved, { strict: true })
  db.run('PRAGMA journal_mode = WAL;')
  db.run('PRAGMA foreign_keys = ON;')
  db.run(CREATE_KNOWLEDGES_SQL)
  db.run(CREATE_ENTRY_FRECENCY_SQL)
  db.run(CREATE_FTS_SQL)
  for (const sql of CREATE_INDEXES_SQL) db.run(sql)
  db.run(CREATE_ENTRY_BINDINGS_SQL)
  for (const sql of CREATE_BINDING_INDEXES_SQL) db.run(sql)
  db.run(CREATE_BINDING_FRECENCY_SQL)
  for (const sql of CREATE_BINDING_FRECENCY_INDEXES_SQL) db.run(sql)
  return { db, raw: db }
}
