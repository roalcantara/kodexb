import type { Database } from 'bun:sqlite'
import type { BindingFrecencyRow, EntryFrecencyRow } from '../db/schema'

export type LearnedSnapshot = {
  entries: EntryFrecencyRow[]
  bindings: BindingFrecencyRow[]
}

export type RestoreLearnedSnapshotResult = {
  entryRestored: number
  entrySkipped: number
  bindingRestored: number
  bindingSkipped: number
}

const SELECT_ALL_ENTRIES_SQL = 'SELECT entry_id, visit_count, last_visited_at, frecency_score FROM entry_frecency'

const SELECT_ALL_BINDINGS_SQL = 'SELECT binding_id, score, last_event_at FROM binding_frecency'

const ENTRY_EXISTS_SQL = 'SELECT 1 AS one FROM knowledges WHERE id = ? LIMIT 1'

const BINDING_EXISTS_SQL = 'SELECT 1 AS one FROM entry_bindings WHERE id = ? LIMIT 1'

const UPSERT_ENTRY_SQL = `
INSERT INTO entry_frecency (entry_id, visit_count, last_visited_at, frecency_score)
VALUES (?, ?, ?, ?)
ON CONFLICT(entry_id) DO UPDATE SET
  visit_count     = excluded.visit_count,
  last_visited_at = excluded.last_visited_at,
  frecency_score  = excluded.frecency_score
`

const UPSERT_BINDING_SQL = `
INSERT INTO binding_frecency (binding_id, score, last_event_at)
VALUES (?, ?, ?)
ON CONFLICT(binding_id) DO UPDATE SET
  score         = excluded.score,
  last_event_at = excluded.last_event_at
`

/** Reads all learned rows into an in-memory snapshot before catalog rebuild. */
export function exportLearnedSnapshot(db: Database): LearnedSnapshot {
  const entries = db.query<EntryFrecencyRow, []>(SELECT_ALL_ENTRIES_SQL).all()
  const bindings = db.query<BindingFrecencyRow, []>(SELECT_ALL_BINDINGS_SQL).all()
  return { entries, bindings }
}

/** Restores learned rows for ids still present in the rebuilt catalog. */
export function restoreLearnedSnapshot(db: Database, snapshot: LearnedSnapshot): RestoreLearnedSnapshotResult {
  const counts: RestoreLearnedSnapshotResult = {
    entryRestored: 0,
    entrySkipped: 0,
    bindingRestored: 0,
    bindingSkipped: 0
  }

  const entryExists = db.query<{ one: number }, [number]>(ENTRY_EXISTS_SQL)
  const bindingExists = db.query<{ one: number }, [string]>(BINDING_EXISTS_SQL)
  const upsertEntry = db.query(UPSERT_ENTRY_SQL)
  const upsertBinding = db.query(UPSERT_BINDING_SQL)

  db.transaction(() => {
    for (const row of snapshot.entries) {
      if (!entryExists.get(row.entry_id)) {
        counts.entrySkipped += 1
        continue
      }
      upsertEntry.run(row.entry_id, row.visit_count, row.last_visited_at, row.frecency_score)
      counts.entryRestored += 1
    }

    for (const row of snapshot.bindings) {
      if (!bindingExists.get(row.binding_id)) {
        counts.bindingSkipped += 1
        continue
      }
      upsertBinding.run(row.binding_id, row.score, row.last_event_at)
      counts.bindingRestored += 1
    }
  })()

  return counts
}
