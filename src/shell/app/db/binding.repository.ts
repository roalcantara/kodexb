import type { Database } from 'bun:sqlite'
import type { BindingRef } from '@shared/rpc'
import type { BindingRow } from './schema'

// Re-export for backward compatibility (ARCH-1 AC2/AC6).
export type { BindingRef }

function toBindingRef(row: BindingRow): BindingRef {
  return {
    bindingId: row.id,
    entryKey: row.entry_key,
    app: row.app,
    platform: row.platform as BindingRef['platform'],
    scope: row.scope as BindingRef['scope'],
    chordHash: row.chord_hash,
    chordPrefix: row.chord_prefix,
    action: row.action
  }
}

const SELECT_ALL = `
SELECT * FROM entry_bindings ORDER BY entry_key, id
`

const SELECT_BY_CHORD = `
SELECT * FROM entry_bindings
WHERE chord_hash = ?1
   OR (chord_prefix IS NOT NULL AND chord_prefix = ?1)
ORDER BY app, scope
`

const SELECT_BY_APP = `
SELECT * FROM entry_bindings
WHERE app = ?1 AND (platform = ?2 OR platform = 'any')
ORDER BY id
`

const DELETE_BY_ENTRY_KEY = `
DELETE FROM entry_bindings WHERE entry_key = ?1
`

const INSERT_SQL = `
INSERT INTO entry_bindings (id, entry_key, app, platform, scope, chord_hash, chord_prefix, action, intent, when_clause, tags_json)
VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
ON CONFLICT(id) DO UPDATE SET
  entry_key    = excluded.entry_key,
  app          = excluded.app,
  platform     = excluded.platform,
  scope        = excluded.scope,
  chord_hash   = excluded.chord_hash,
  chord_prefix = excluded.chord_prefix,
  action       = excluded.action
`

export function upsertBindings(db: Database, entryKey: string, refs: BindingRef[]): void {
  const del = db.query(DELETE_BY_ENTRY_KEY)
  const ins = db.query(INSERT_SQL)

  const txn = db.transaction(() => {
    del.run(entryKey)
    for (const ref of refs) {
      ins.run(
        ref.bindingId,
        ref.entryKey,
        ref.app,
        ref.platform,
        ref.scope,
        ref.chordHash,
        ref.chordPrefix,
        ref.action,
        null,
        null,
        null
      )
    }
  })
  txn()
}

export function deleteBindings(db: Database, entryKey: string): void {
  db.query(DELETE_BY_ENTRY_KEY).run(entryKey)
}

export function listAllBindings(db: Database): BindingRef[] {
  return db.query<BindingRow, []>(SELECT_ALL).all().map(toBindingRef)
}

export function listBindingsByChord(db: Database, hash: string): BindingRef[] {
  return db.query<BindingRow, [string]>(SELECT_BY_CHORD).all(hash).map(toBindingRef)
}

export function listBindingsForApp(db: Database, app: string, platform: string): BindingRef[] {
  return db.query<BindingRow, [string, string]>(SELECT_BY_APP).all(app, platform).map(toBindingRef)
}
