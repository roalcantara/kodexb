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
  bindings    TEXT             DEFAULT '[]',
  platform    TEXT,
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

export const CREATE_ENTRY_FRECENCY_SQL = `
CREATE TABLE IF NOT EXISTS entry_frecency (
  entry_id         INTEGER PRIMARY KEY
                   REFERENCES knowledges(id) ON DELETE CASCADE,
  visit_count      INTEGER NOT NULL DEFAULT 0,
  last_visited_at  INTEGER NOT NULL,
  frecency_score   REAL    NOT NULL DEFAULT 0
);
`

export const CREATE_INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_knowledges_type       ON knowledges(type);',
  'CREATE INDEX IF NOT EXISTS idx_knowledges_task_order ON knowledges(task_order);',
  'CREATE INDEX IF NOT EXISTS idx_knowledges_due_date   ON knowledges(due_date);',
  'CREATE INDEX IF NOT EXISTS idx_entry_frecency_score  ON entry_frecency(frecency_score DESC);'
] as const

export type EntryFrecencyRow = {
  entry_id: number
  visit_count: number
  last_visited_at: number
  frecency_score: number
}

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
  bindings: string | null
  platform: string | null
  created_at: number
  updated_at: number
}

export const CREATE_ENTRY_BINDINGS_SQL = `
CREATE TABLE IF NOT EXISTS entry_bindings (
  id            TEXT PRIMARY KEY,
  entry_key     TEXT NOT NULL,
  app           TEXT NOT NULL,
  platform      TEXT NOT NULL DEFAULT 'any',
  scope         TEXT NOT NULL,
  chord_hash    TEXT NOT NULL,
  chord_prefix  TEXT,
  action        TEXT NOT NULL,
  intent        TEXT,
  when_clause   TEXT,
  tags_json     TEXT
);
`

export const CREATE_BINDING_INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_bindings_chord       ON entry_bindings(chord_hash);',
  'CREATE INDEX IF NOT EXISTS idx_bindings_chord_app   ON entry_bindings(chord_hash, app);',
  'CREATE INDEX IF NOT EXISTS idx_bindings_chord_scope ON entry_bindings(chord_hash, scope);',
  'CREATE INDEX IF NOT EXISTS idx_bindings_app         ON entry_bindings(app);',
  'CREATE INDEX IF NOT EXISTS idx_bindings_prefix      ON entry_bindings(chord_prefix) WHERE chord_prefix IS NOT NULL;'
] as const

export const CREATE_BINDING_FRECENCY_SQL = `
CREATE TABLE IF NOT EXISTS binding_frecency (
  binding_id    TEXT PRIMARY KEY,
  score         REAL NOT NULL DEFAULT 0,
  last_event_at TEXT NOT NULL
);
`

export const CREATE_BINDING_FRECENCY_INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_binding_frecency_score ON binding_frecency(score DESC);'
] as const

export type BindingRow = {
  id: string
  entry_key: string
  app: string
  platform: string
  scope: string
  chord_hash: string
  chord_prefix: string | null
  action: string
  intent: string | null
  when_clause: string | null
  tags_json: string | null
}

export type BindingFrecencyRow = {
  binding_id: string
  score: number
  last_event_at: string
}
