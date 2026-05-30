import type { Database } from 'bun:sqlite'
import { bumpFrecency } from '@core/helpers/frecency/bump_frecency.util'
import { repositoryStmts } from '@shared/logging'
import type { BindingFrecencyRow } from './schema'

const SELECT_FRECENCY_SQL = 'SELECT score, last_event_at FROM binding_frecency WHERE binding_id = ?'

const UPSERT_FRECENCY_SQL = `
INSERT INTO binding_frecency (binding_id, score, last_event_at)
VALUES (?, ?, ?)
ON CONFLICT(binding_id) DO UPDATE SET
  score         = excluded.score,
  last_event_at = excluded.last_event_at
`

export function recordBindingVisit(
  db: Database,
  bindingId: string,
  weight = 1.0,
  nowIso = new Date().toISOString()
): void {
  const stmts = repositoryStmts(db, 'BindingFrecency', {
    select: SELECT_FRECENCY_SQL,
    upsert: UPSERT_FRECENCY_SQL
  })

  const row = stmts.select.get(bindingId) as BindingFrecencyRow | undefined
  const previous = row
    ? {
        visitCount: Math.round(row.score),
        lastVisitedAt: new Date(row.last_event_at).getTime(),
        frecencyScore: row.score
      }
    : null
  const next = bumpFrecency(previous, new Date(nowIso).getTime())

  const adjustedScore = next.frecencyScore * weight
  stmts.upsert.run(bindingId, adjustedScore, nowIso)
}

export function getBindingScore(db: Database, bindingId: string): number {
  const row = db.query<BindingFrecencyRow, [string]>(SELECT_FRECENCY_SQL).get(bindingId)
  return row?.score ?? 0
}
