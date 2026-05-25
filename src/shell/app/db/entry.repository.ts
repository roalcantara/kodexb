import type { Database } from 'bun:sqlite'
import type { UnknownRecord } from 'type-fest'
import type { EntryType, Knowledge } from '../../../core'
import type { FindAllOpts } from '../../../core/helpers/list_opts/find_all_opts.types'
import type { KnowledgeRow } from './schema'

export type KnowledgeWithFrecency = Knowledge & {
  frecencyScore: number
  visitCount: number
}

type KnowledgeRowWithFrecency = KnowledgeRow & {
  frecency_score: number
  visit_count: number
}

const FRECENCY_SELECT_SQL = 'COALESCE(f.frecency_score, 0) AS frecency_score, COALESCE(f.visit_count, 0) AS visit_count'

export type { FindAllOpts }

export type DbStats = {
  total: number
  byType: Record<string, number>
}

const DEFAULT_QUERY_LIMIT = 50

const FRECENCY_JOIN_SQL = 'LEFT JOIN entry_frecency f ON f.entry_id = k.id'

const ORDER_BY_FRECENCY_TAIL_SQL = `
      ORDER BY COALESCE(f.frecency_score, 0) DESC,
               k.task_order ASC NULLS LAST,
               k.updated_at DESC,
               k.id DESC`

const UPSERT_SQL = `
INSERT INTO knowledges (
  id, type, key, source, desc, tags, links, notes, doc,
  priority, status, due_date, task_order, depends_on, meta,
  created_at, updated_at
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?,
  ?, ?
)
ON CONFLICT(id) DO UPDATE SET
  type        = excluded.type,
  key         = excluded.key,
  source      = excluded.source,
  desc        = excluded.desc,
  tags        = excluded.tags,
  links       = excluded.links,
  notes       = excluded.notes,
  doc         = excluded.doc,
  priority    = excluded.priority,
  status      = excluded.status,
  due_date    = excluded.due_date,
  task_order  = excluded.task_order,
  depends_on  = excluded.depends_on,
  meta        = excluded.meta,
  updated_at  = excluded.updated_at
`

const FIND_BY_ID_SQL = 'SELECT * FROM knowledges WHERE id = ?'

const TAG_COUNT_SQL = `SELECT json_each.value AS tag, COUNT(*) AS cnt
FROM knowledges, json_each(knowledges.tags) AS json_each
GROUP BY json_each.value`

const FTS_SPACE_RE = /\s+/g
const DOUBLE_QUOTE_RE = /"/g

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
    .map(() => `EXISTS (SELECT 1 FROM json_each(${aliasTable}.tags) AS kb_tag_row WHERE kb_tag_row.value = ?)`)
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

  return base as Knowledge
}

function rowToParams(
  row: Knowledge
): [
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string | null,
  string | null,
  number | null,
  number | null,
  string,
  string,
  number,
  number
] {
  return [
    row.id,
    row.type,
    row.key,
    row.source,
    row.desc,
    JSON.stringify(row.tags),
    JSON.stringify(row.links ?? []),
    JSON.stringify(row.notes ?? []),
    row.doc,
    'priority' in row ? (row.priority ?? null) : null,
    'status' in row ? (row.status ?? null) : null,
    'dueDate' in row ? (row.dueDate ?? null) : null,
    'taskOrder' in row ? (row.taskOrder ?? null) : null,
    'dependsOn' in row ? JSON.stringify(row.dependsOn ?? []) : JSON.stringify([]),
    JSON.stringify(row.meta ?? {}),
    row.createdAt,
    row.updatedAt
  ]
}

export function upsert(db: Database, row: Knowledge): 'inserted' | 'updated' {
  const exists = db.query<{ one: 1 } | null, [number]>('SELECT 1 AS one FROM knowledges WHERE id = ?').get(row.id)
  db.query(UPSERT_SQL).run(...rowToParams(row))
  return exists ? 'updated' : 'inserted'
}

export function rebuildFts(db: Database): void {
  db.query('INSERT INTO knowledges_fts(knowledges_fts) VALUES(?)').run('rebuild')
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
  const row = db.query<KnowledgeRow, [number]>(FIND_BY_ID_SQL).get(id)
  return row ? rowToKnowledge(row) : null
}

export function getDbStats(db: Database): DbStats {
  const rows = db
    .query<{ type: string; count: number }, []>('SELECT type, COUNT(*) as count FROM knowledges GROUP BY type')
    .all()

  const byType: Record<string, number> = {}
  let total = 0
  for (const row of rows) {
    byType[row.type] = row.count
    total += row.count
  }

  return { total, byType }
}

export function getTagCounts(db: Database): Record<string, number> {
  const rows = db.query<{ tag: string; cnt: number }, []>(TAG_COUNT_SQL).all()
  const out: Record<string, number> = {}
  for (const row of rows) {
    if (row.tag) out[row.tag] = row.cnt
  }
  return out
}

export function deleteById(db: Database, id: number): boolean {
  const result = db.query('DELETE FROM knowledges WHERE id = ?').run(id)
  return result.changes > 0
}
