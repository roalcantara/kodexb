import type { Database } from 'bun:sqlite'
import { bumpFrecency, type FrecencyState } from '@core/helpers/frecency/bump_frecency.util'
import type { EntryFrecencyRow } from './schema'

const SELECT_FRECENCY_SQL = 'SELECT visit_count, last_visited_at, frecency_score FROM entry_frecency WHERE entry_id = ?'

const UPSERT_FRECENCY_SQL = `
INSERT INTO entry_frecency (entry_id, visit_count, last_visited_at, frecency_score)
VALUES (?, ?, ?, ?)
ON CONFLICT(entry_id) DO UPDATE SET
  visit_count     = excluded.visit_count,
  last_visited_at = excluded.last_visited_at,
  frecency_score  = excluded.frecency_score
`

const KNOWLEDGE_EXISTS_SQL = 'SELECT 1 AS one FROM knowledges WHERE id = ? LIMIT 1'

function rowToState(row: EntryFrecencyRow): FrecencyState {
  return {
    visitCount: row.visit_count,
    lastVisitedAt: row.last_visited_at,
    frecencyScore: row.frecency_score
  }
}

/** Records one visit for an existing knowledge row; no-op when id is missing. */
export function recordEntryVisit(db: Database, entryId: number, nowMs = Date.now()): boolean {
  const exists = db.query<{ one: 1 } | null, [number]>(KNOWLEDGE_EXISTS_SQL).get(entryId)
  if (!exists) return false

  const row = db.query<EntryFrecencyRow, [number]>(SELECT_FRECENCY_SQL).get(entryId)
  const previous = row ? rowToState(row) : null
  const next = bumpFrecency(previous, nowMs)

  db.query(UPSERT_FRECENCY_SQL).run(entryId, next.visitCount, next.lastVisitedAt, next.frecencyScore)
  return true
}
