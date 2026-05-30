export const DEFAULT_QUERY_LIMIT = 50

export const EMPTY_JSON_ARRAY = '[]'

export const FRECENCY_SELECT_SQL =
  'COALESCE(f.frecency_score, 0) AS frecency_score, COALESCE(f.visit_count, 0) AS visit_count'

export const FRECENCY_JOIN_SQL = 'LEFT JOIN entry_frecency f ON f.entry_id = k.id'

export const ORDER_BY_FRECENCY_TAIL_SQL = `
      ORDER BY COALESCE(f.frecency_score, 0) DESC,
               k.task_order ASC NULLS LAST,
               k.updated_at DESC,
               k.id DESC`

export const UPSERT_SQL = `
INSERT INTO knowledges (
  id, type, key, source, desc, tags, links, notes, doc,
  priority, status, due_date, task_order, depends_on, meta,
  bindings, platform,
  created_at, updated_at
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?,
  ?, ?,
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
  bindings    = excluded.bindings,
  platform    = excluded.platform,
  updated_at  = excluded.updated_at
`

export const FIND_BY_ID_SQL = 'SELECT * FROM knowledges WHERE id = ?'

export const EXISTS_BY_ID_SQL = 'SELECT 1 AS one FROM knowledges WHERE id = ?'

export const TAG_COUNT_SQL = `SELECT json_each.value AS tag, COUNT(*) AS cnt
FROM knowledges, json_each(knowledges.tags) AS json_each
GROUP BY json_each.value`

export const STATS_BY_TYPE_SQL = 'SELECT type, COUNT(*) as count FROM knowledges GROUP BY type'

export const DELETE_BY_ID_SQL = 'DELETE FROM knowledges WHERE id = ?'

export const REBUILD_FTS_SQL = 'INSERT INTO knowledges_fts(knowledges_fts) VALUES(?)'

export const FTS_SPACE_RE = /\s+/g

export const DOUBLE_QUOTE_RE = /"/g
