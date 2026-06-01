import type { Database } from 'bun:sqlite'
import type { FindAllOpts } from '@core/helpers/list_opts/find_all_opts.types'
import { repositoryStmts } from '@shared/logging'
import type { UnknownRecord } from 'type-fest'
import type { EntryType, Knowledge, ShortcutKnowledge } from '../../../core'
import {
  DEFAULT_QUERY_LIMIT,
  DELETE_BY_ID_SQL,
  DOUBLE_QUOTE_RE,
  EXISTS_BY_ID_SQL,
  FIND_BY_ID_SQL,
  FRECENCY_JOIN_SQL,
  FRECENCY_SELECT_SQL,
  FTS_SPACE_RE,
  ORDER_BY_FRECENCY_TAIL_SQL,
  REBUILD_FTS_SQL,
  STATS_BY_TYPE_SQL,
  TAG_COUNT_SQL,
  UPSERT_SQL
} from './entry_repository.const'
import { rowToParams } from './entry_upsert_params.util'
import type { KnowledgeRow } from './schema'

export type KnowledgeWithFrecency = Knowledge & {
  frecencyScore: number
  visitCount: number
}

type KnowledgeRowWithFrecency = KnowledgeRow & {
  frecency_score: number
  visit_count: number
}

export type { FindAllOpts }

export type DbStats = {
  total: number
  byType: Record<string, number>
}

// `rebuildFts` lives outside the bag because the FTS virtual table is not
// present in every test fixture (e.g., `task.repository.spec.ts` builds the
// `knowledges` table directly). Bagging it would force a prepare at every
// call site and crash before any non-FTS work could run.
type KnowledgeStmts = ReturnType<
  typeof repositoryStmts<{
    upsert: string
    existsById: string
    findById: string
    tagCounts: string
    statsByType: string
    deleteById: string
  }>
>

const knowledgeStmtsByDb = new WeakMap<Database, KnowledgeStmts>()

function initStmts(db: Database): KnowledgeStmts {
  const cached = knowledgeStmtsByDb.get(db)
  if (cached) return cached
  const stmts = repositoryStmts(db, 'Knowledge', {
    upsert: UPSERT_SQL,
    existsById: EXISTS_BY_ID_SQL,
    findById: FIND_BY_ID_SQL,
    tagCounts: TAG_COUNT_SQL,
    statsByType: STATS_BY_TYPE_SQL,
    deleteById: DELETE_BY_ID_SQL
  })
  knowledgeStmtsByDb.set(db, stmts)
  return stmts
}

function toFts5MatchQuery(input: string): string {
  const raw = input.trim()
  if (!raw) return raw
  const tokens = raw.split(FTS_SPACE_RE).filter(Boolean)
  return tokens.map(token => `"${token.replaceAll(DOUBLE_QUOTE_RE, '""')}"*`).join(' ')
}

/** AND semantics: row must contain every tag (matches prior in-memory filter). */
function sqlKnowHasEveryTag(aliasTable: string, tags: string[]): { clause: string; params: string[] } {
  if (tags.length === 0) return { clause: '', params: [] }
  const clause = tags
    .map(() => `EXISTS (SELECT 1 FROM json_each(${aliasTable}.tags) AS tag_row WHERE tag_row.value = ?)`)
    .join(' AND ')
  return { clause, params: [...tags] }
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function rowToKnowledge(row: KnowledgeRow): Knowledge {
  const base = {
    id: row.id,
    type: row.type as EntryType,
    key: row.key,
    source: row.source,
    desc: row.desc,
    tags: parseJson<string[]>(row.tags, []),
    links: parseJson(row.links, []),
    notes: parseJson(row.notes, []),
    meta: parseJson(row.meta, {}),
    doc: row.doc,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }

  if (row.type === 'task') {
    return {
      ...base,
      type: 'task',
      priority: row.priority as Knowledge extends { priority?: infer P } ? P : never,
      status: row.status as Knowledge extends { status?: infer S } ? S : never,
      dueDate: row.due_date ?? undefined,
      taskOrder: row.task_order ?? undefined,
      dependsOn: parseJson<number[]>(row.depends_on, [])
    }
  }

  if (row.type === 'shortcut') {
    return {
      ...base,
      type: 'shortcut',
      bindings: parseJson<ShortcutKnowledge['bindings']>(row.bindings, []),
      ...(row.platform ? { platform: row.platform as ShortcutKnowledge['platform'] } : {})
    }
  }

  return base as Knowledge
}

export function upsert(db: Database, row: Knowledge): 'inserted' | 'updated' {
  const s = initStmts(db)
  const exists = s.existsById.get(row.id) as { one: 1 } | null
  s.upsert.run(...rowToParams(row))
  return exists ? 'updated' : 'inserted'
}

export function rebuildFts(db: Database): void {
  db.query(REBUILD_FTS_SQL).run('rebuild')
}

function findAllRowsFts(
  db: Database,
  match: string,
  tagFilter: { clause: string; params: string[] },
  limitParam: number,
  offset: number
): UnknownRecord[] {
  const tagWhere = tagFilter.clause === '' ? '' : ` AND (${tagFilter.clause})`
  const sql = `
      SELECT k.*, ${FRECENCY_SELECT_SQL}
      FROM knowledges k
      ${FRECENCY_JOIN_SQL}
      JOIN knowledges_fts ON k.id = knowledges_fts.id
      WHERE knowledges_fts MATCH ?${tagWhere}
      ORDER BY bm25(knowledges_fts),
               COALESCE(f.frecency_score, 0) DESC,
               k.task_order ASC NULLS LAST,
               k.updated_at DESC,
               k.id DESC
      LIMIT ? OFFSET ?
    `
  return db.query(sql).all(match, ...tagFilter.params, limitParam, offset) as UnknownRecord[]
}

function findAllRowsPlain(
  db: Database,
  types: EntryType[] | undefined,
  tagFilter: { clause: string; params: string[] },
  limitParam: number,
  offset: number
): UnknownRecord[] {
  const conditions: string[] = []
  const params: string[] = []

  if (types && types.length > 0) {
    conditions.push(`k.type IN (${types.map(() => '?').join(',')})`)
    params.push(...types)
  }

  if (tagFilter.clause !== '') {
    conditions.push(`(${tagFilter.clause})`)
    params.push(...tagFilter.params)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sql = `SELECT k.*, ${FRECENCY_SELECT_SQL} FROM knowledges k ${FRECENCY_JOIN_SQL} ${where}${ORDER_BY_FRECENCY_TAIL_SQL} LIMIT ? OFFSET ?`
  return db.query(sql).all(...params, limitParam, offset) as UnknownRecord[]
}

function rowToKnowledgeWithFrecency(row: KnowledgeRowWithFrecency): KnowledgeWithFrecency {
  return {
    ...rowToKnowledge(row),
    frecencyScore: row.frecency_score,
    visitCount: row.visit_count
  }
}

export function findAll(db: Database, opts: FindAllOpts = {}): KnowledgeWithFrecency[] {
  const { query, tags, types, offset = 0 } = opts
  const limit = opts.limit ?? DEFAULT_QUERY_LIMIT
  const limitParam = limit === -1 ? -1 : limit

  const tagFilter = sqlKnowHasEveryTag('k', tags && tags.length > 0 ? tags : [])

  const rows = query
    ? findAllRowsFts(db, toFts5MatchQuery(query), tagFilter, limitParam, offset)
    : findAllRowsPlain(db, types, tagFilter, limitParam, offset)

  let list = rows.map(row => rowToKnowledgeWithFrecency(row as KnowledgeRowWithFrecency))

  if (query && types && types.length > 0) {
    list = list.filter(entry => types.includes(entry.type))
  }

  return list
}

export function findById(db: Database, id: number): Knowledge | null {
  const s = initStmts(db)
  const row = s.findById.get(id) as KnowledgeRow | null
  return row ? rowToKnowledge(row) : null
}

export function getDbStats(db: Database): DbStats {
  const s = initStmts(db)
  const rows = s.statsByType.all() as Array<{ type: string; count: number }>

  const byType: Record<string, number> = {}
  let total = 0
  for (const row of rows) {
    byType[row.type] = row.count
    total += row.count
  }

  return { total, byType }
}

export function getTagCounts(db: Database): Record<string, number> {
  const s = initStmts(db)
  const rows = s.tagCounts.all() as Array<{ tag: string; cnt: number }>
  const out: Record<string, number> = {}
  for (const row of rows) {
    if (row.tag) out[row.tag] = row.cnt
  }
  return out
}

export function deleteById(db: Database, id: number): boolean {
  const s = initStmts(db)
  const result = s.deleteById.run(id)
  return result.changes > 0
}
