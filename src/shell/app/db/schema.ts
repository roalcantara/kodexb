export const CREATE_KNOWLEDGES_SQL = `
CREATE TABLE IF NOT EXISTS knowledges (
  id          INTEGER PRIMARY KEY,
  type        TEXT    NOT NULL,
  key         TEXT    NOT NULL,
  source      TEXT    NOT NULL,
  desc        TEXT    NOT NULL,
  tags        TEXT    NOT NULL DEFAULT '[]',
  links       TEXT             DEFAULT '[]',
  notes       TEXT             DEFAULT '[]',
  doc         TEXT    NOT NULL DEFAULT '',
  priority    TEXT,
  status      TEXT,
  due_date    INTEGER,
  task_order  INTEGER,
  depends_on  TEXT             DEFAULT '[]',
  meta        TEXT             DEFAULT '{}',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
`

export const CREATE_FTS_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS knowledges_fts USING fts5(
  id UNINDEXED,
  type,
  key,
  desc,
  tags,
  doc,
  content='knowledges',
  content_rowid='id'
);
`

export const CREATE_INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_knowledges_type       ON knowledges(type);',
  'CREATE INDEX IF NOT EXISTS idx_knowledges_task_order ON knowledges(task_order);',
  'CREATE INDEX IF NOT EXISTS idx_knowledges_due_date   ON knowledges(due_date);'
] as const

export type KnowledgeRow = {
  id: number
  type: string
  key: string
  source: string
  desc: string
  tags: string
  links: string | null
  notes: string | null
  doc: string
  priority: string | null
  status: string | null
  due_date: number | null
  task_order: number | null
  depends_on: string | null
  meta: string | null
  created_at: number
  updated_at: number
}
