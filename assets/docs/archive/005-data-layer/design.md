<!-- markdownlint-disable-file -->
# Phase 4 — Data Layer

## OVERVIEW

Phase 4 lands the **data substrate** that V1-2 (Sync) requires and that V1-3,
V1-5, and V1-7 will read from in later phases:

- A `knowledges` table on `bun:sqlite` (no Drizzle — see
  [`foundation/design.md`][1] Decision 5).
- An FTS5 virtual table for full-text search.
- An idempotent `ImportService` that walks YAML sources, validates with the
  Phase 3 core, and upserts into SQLite.
- A typed query API in `entry.repository.ts` for list / detail / stats.
- The `src/shared/logging/` adapter that all I/O code uses to emit
  `phase=<label> dur_ms=<n>` lines.
- Shared test infrastructure under `src/__tests__/` (Fishery factories,
  in-memory DB helpers, and a curated 5-file YAML corpus for end-to-end
  import tests only).

It is the smallest viable scope that:

1. Eliminates the last Zod usage (`config.schema.ts` migrates to TypeBox).
2. Adds every column the foundation eventually requires, so future phases do
   not need a schema migration.
3. Reuses legacy code that already worked (commit `cc3d08b`) wherever the
   shape is right; rewrites where the new decisions diverge.
4. Defers anything that has no consumer in this phase (`task.repository.ts`,
   the migration runner, drizzle-typebox response shapes,
   `assembleDoc()` integration).

[1]: ../foundation/design.md

The phase delivers exactly **one atomic commit**: `feat(data): Add SQLite
schema, repositories, import service` (subject ≤ 50 chars).

---

## SCOPE DECISIONS

| Decision                                         | Choice                                                             | Rationale                                                                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AppService (`src/shell/app/app.ts`)              | **defer to Phase 5**                                               | Heavy `@shared/rpc` coupling. Roadmap puts AppService in Phase 5.                                                                                                           |
| `task.repository.ts`                             | **defer to Phase 9**                                               | No consumer in Phase 4; V1-3 §4 task views work via `findAll(types: ['task'])` + `lib/task_views.util.ts`.                                                                  |
| RPC response schemas (`schema.types.ts`)         | **defer to Phase 5**                                               | Hand-written TypeBox per [`foundation/design.md`][2] Decision 3. No drizzle-typebox.                                                                                        |
| Migration runner + `tools/db/migrations/` folder | **defer until first real schema change** (≥ Phase 9)               | Phase 4 declares all Phase 5–8 columns up-front. Bootstrap-only is enough; runner is YAGNI until needed.                                                                    |
| `seed.service.ts`                                | **drop entirely**                                                  | `ImportService.runOnce(sourcesDir)` is the seed primitive. `createSeededMemoryDb` covers tests via factories. No abstraction layer needed.                                  |
| `assembleDoc()` integration in import            | **defer to Phase 7**                                               | Phase 4 declares the `doc` column (default `''`) but does not populate it. Phase 7 wires `assembleDoc()` into `import.service.ts` when the detail view consumes the column. |
| Schema columns                                   | **add all 4 now**: `doc`, `task_order`, `due_date`, `depends_on`   | Nullable / defaulted; inert until consumer phase populates them. Avoids migrations across Phases 5–8.                                                                       |
| Validation library                               | **TypeBox only**                                                   | Zod is removed from the stack ([`foundation/design.md`][3] Decision 2). Phase 4 migrates the last hold-out (`config.schema.ts`).                                            |
| Test fixtures library                            | **Fishery** ([`foundation/design.md`][4] Decision 4)               | drizzle-seed not added.                                                                                                                                                     |
| Test fixture corpus                              | **5 curated YAML files under `fixtures/sample/`**                  | Down from 56. Used **only** by `import.service.spec.ts`. Repository specs use factories.                                                                                    |
| `minimal/entries.yml`                            | **keep unchanged**                                                 | Deterministic 4-entry fixture for exact-count and idempotency assertions in `import.service.spec.ts`.                                                                       |
| `bun:sqlite` vs Drizzle                          | **`bun:sqlite` directly** ([`foundation/design.md`][5] Decision 5) | Legacy used Drizzle in 1 of 6 functions. Drop it; use `db.query<KnowledgeRow, [params]>()` for typed prepared statements.                                                   |
| `DbHandle` shape                                 | **`type DbHandle = Database`**                                     | Single API surface. No `{ db, raw }` flowing through every signature.                                                                                                       |
| Commit strategy                                  | **one atomic commit**                                              | Mirrors Phase 3. Subject `feat(data): Add SQLite schema, repositories, import service`.                                                                                     |
| Stash topology                                   | **collapse to single `phase-pending`**                             | Existing `phase-{4..misc-docs}` stashes are nested supersets, not deltas. Conflict-free recovery requires consolidation before Phase 4 work begins.                         |
| `docs/superpowers/`                              | **delete + add to `.gitignore`**                                   | This path is a brainstorming-skill default; app uses `assets/docs/archive/<slug>/` instead. Never lands in any commit or stash.                                               |
| Recovery source                                  | **`~/Work/bun/app_legacy` worktree at `cc3d08b`**                  | The "phase-4-data-layer" stash's `entry.repository.ts` is truncated to ~80 lines; the legacy version is the complete 193-line implementation.                               |

[2]: ../foundation/design.md
[3]: ../foundation/design.md
[4]: ../foundation/design.md
[5]: ../foundation/design.md

---

## PRE-FLIGHT — STASH RECONCILIATION

The five existing stashes (`phase-4-data-layer` … `phase-misc-docs`) were
created as cumulative working-tree snapshots, not deltas. After auditing:

```
stash@{0} = phase-4-data-layer       =  153 files
stash@{1} = phase-5-rpc              =  167 files (= 153 + 14)
stash@{2} = phase-6-renderer-list    = 1064 files (= 167 + 897)
stash@{3} = phase-7-renderer-detail  = 1069 files (= 1064 + 5)
stash@{4} = phase-misc-docs          = 1070 files (= 1069 + 1)
```

`stash@{4}` is a superset of every pending file. Splitting them into proper
deltas would require ~150 conflict resolutions (since Phase 4 modifies files
present in every stash). **Collapsing to a single `phase-pending` stash is
the recoverable path.**

The pre-flight sequence (executed once, before any code change):

```bash
# 1. Materialise everything into the working tree.
git stash apply stash@{4}
git stash drop  stash@{4}
git stash drop  stash@{3}
git stash drop  stash@{2}
git stash drop  stash@{1}
git stash drop  stash@{0}
git status --porcelain | wc -l                # expect ~1070

# 2. Permanently remove docs/superpowers/ — never lands anywhere.
rm -rf docs/superpowers/

# 3. Add docs/superpowers/ to .gitignore (commit-eligible in Phase 4).
#    See "Modified in Phase 4 (incremental)" table.

# 4. (Phase 4 work happens here.)

# 5. After Phase 4 commits, re-stash everything not in the commit.
git stash push -u -m phase-pending -- $(<list of paths NOT committed in Phase 4>)
```

`tmp/phase-3-stash-manifest.md` is replaced by `tmp/phase-4-stash-manifest.md`
documenting the new single-stash topology and listing what the next phase
should expect to find.

> **Note for future phases.** Treat `~/Work/bun/app_legacy` (commit `cc3d08b`)
> as the authoritative legacy reference for any code that the stash claims to
> hold but doesn't fully — see [`foundation/design.md` § REFERENCE
> IMPLEMENTATION (LEGACY WORKTREE)][6].

[6]: ../foundation/design.md#reference-implementation-legacy-worktree

---

## ARCHITECTURE — FILE INVENTORY

### Restored from legacy (`cc3d08b`) — Drizzle-stripped during restore

| File                                       | Source                                                | Notes                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shell/app/db/client.ts`               | legacy + Drizzle removed                              | `openDatabase(path): Database`. Sets PRAGMAs, runs idempotent bootstrap DDL. Accepts `:memory:`. Returns plain `Database` (no `{ db, raw }` wrapper).                                                                                                                                                                 |
| `src/shell/app/db/import.service.ts`       | legacy + signature update                             | `class ImportService { runOnce(sourcesDir, opts?): Promise<ImportResult> }`. Walks `**/*.{yaml,yml}` via `fast-glob`, parses with `@core` `parseSourceFile`, validates with `isValidSourceRowMin`, upserts via `upsert()`. Wraps each bundle's upserts in `db.transaction()`. Calls `rebuildFts(db)` once at the end. |
| `src/shell/app/config/config.loader.ts`    | legacy + TypeBox call + Bun.YAML                      | `loadConfig(path?)`, `saveConfig(current, patch)`, `resolveDefaultConfigPath()`. Reads YAML via `Bun.YAML.parse()` (project standard); validates via the new TypeBox `parseConfig()` instead of Zod's `safeParse`.                                                                                                    |
| `src/shell/app/lib/task_views.util.ts`     | legacy + import retarget                              | Pure helper used by Phase 5 `AppService.list`. Imports `TaskView` from local `task_views.types.ts` (1-line literal union) instead of the Phase 5 `@shared/rpc` shape.                                                                                                                                                 |
| `src/shared/logging/console.logger.ts`     | legacy                                                | `createLogger({ debug })` exposing `phase(label, desc, durMs)` and standard console method shadows.                                                                                                                                                                                                                   |
| `src/shared/logging/logtape.adapter.ts`    | legacy                                                | `syncLogging(debug)` — idempotent Logtape configuration.                                                                                                                                                                                                                                                              |
| `src/shared/logging/index.ts`              | legacy                                                | Barrel: `createLogger`, `syncLogging`.                                                                                                                                                                                                                                                                                |
| `src/shared/logging/package.json`          | legacy                                                | Sub-package marker (sets the package name for Logtape category resolution).                                                                                                                                                                                                                                           |
| `src/shared/types/logger.types.ts`         | legacy (was held in pre-collapse `phase-5-rpc` stash) | Pure types: `PhaseLabel`, `LogProps`, `ConsoleMethod`, `CreateLoggerOpts`. Re-exported from `src/shared/types/index.ts` (reverts the temporary Phase 3 omission).                                                                                                                                                     |
| `src/__tests__/index.ts`                   | legacy + export list updated                          | `@testing` barrel. New surface listed in **TEST INFRASTRUCTURE** below.                                                                                                                                                                                                                                               |
| `src/__tests__/paths.ts` + `paths.spec.ts` | legacy + `minimalEntriesYml` removed                  | `testingPaths` constants point at the new `fixtures/sample/` dir.                                                                                                                                                                                                                                                     |

### Rewritten in Phase 4

| File                                                                                | Lines (≈)                         | Reason                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/shell/app/db/schema.ts`                                                        | ~70                               | No Drizzle table builder. Exports `CREATE_KNOWLEDGES_SQL`, `CREATE_FTS_SQL`, `CREATE_INDEXES_SQL` constants and the `KnowledgeRow` / `KnowledgeInsert` TypeScript types.                                                                   |
| `src/shell/app/db/entry.repository.ts`                                              | ~200                              | Same public API as legacy (`upsert`, `rebuildFts`, `findAll`, `findById`, `getDbStats`, `getTagCounts`). Uses `db.query<Row, Params>(…)` typed prepared statements. `upsert()` is hand-written `INSERT … ON CONFLICT(id) DO UPDATE SET …`. |
| `src/shell/app/config/config.schema.ts`                                             | ~50                               | Zod → TypeBox. Same exports: `configSchema`, `DEFAULT_CONFIG_BODY`, `RawConfig`, `ResolvedConfig`, `parseConfig` (replaces `safeParse`). Page-size constants unchanged.                                                                    |
| `src/__tests__/factories/entries.factory.ts` (was `factories.builder.ts`)           | ~90                               | Identical Fishery factories; renamed file + sequence-based ids carry over.                                                                                                                                                                 |
| `src/__tests__/helpers/factory.helper.ts` (was `testing.factory.ts`)                | ~75                               | `createFactoryFor(registry)` typed builder.                                                                                                                                                                                                |
| `src/__tests__/helpers/seed.helper.ts` (was `testing.seed.ts`)                      | ~25                               | Now synchronous: `createSeededMemoryDb(now?)` builds 4 rows via factories and calls `upsert()` directly. No `readMinimalFixtureEntries`, no `seedMinimalFixture`.                                                                          |
| `src/__tests__/helpers/tmp.helper.ts` (was `testing.tmp.ts`)                        | ~20                               | `createTempDir` for filesystem-touching tests. Unchanged behaviour.                                                                                                                                                                        |
| `src/__tests__/helpers/factory.types.ts` (was `testing.types.ts`)                   | ~25                               | `FactoryBuildOpts`, `WrappedFactoryOpts`, `isFactoryOpts`.                                                                                                                                                                                 |
| `src/__tests__/helpers/react.helper.ts` (was `testing.react.helper.ts`)             | ~10                               | Carried for Phase 6. No spec exercises it in Phase 4.                                                                                                                                                                                      |
| `src/__tests__/fixtures/sample/{bookmarks,commands,cheats,tasks,mixed_invalid}.yml` | 5 files, ~140 lines, ~6 app total | Curated subset replacing the former 56-file YAML smoke corpus. `minimal/entries.yml` stays for deterministic assertions and idempotency checks.                                                                                            |
| `src/__tests__/fixtures/config.invalid.yaml` (unchanged)                            | unchanged                         | Existing config-failure corpus used by `config.loader.spec.ts`.                                                                                                                                                                            |

### Net-new files in Phase 4

| File                                    | Lines (≈) | Role                                                                                                          |
| --------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| `src/shell/app/index.ts`                | ~6        | Thin barrel: re-exports `db`, `config/config.loader`, `config/config.schema`, `lib`.                          |
| `src/shell/app/db/index.ts`             | ~5        | Sub-barrel: re-exports `schema`, `client`, `entry.repository`, `import.service`.                              |
| `src/shell/app/lib/task_views.types.ts` | 3         | `export type TaskView = 'actionable' \| 'today' \| 'overdue' \| 'this_week' \| 'all_pending' \| 'all_doing'`. |
| `src/shell/app/lib/index.ts`            | ~3        | Sub-barrel: re-exports `task_views.util`, `task_views.types`.                                                 |
| `tmp/phase-4-stash-manifest.md`         | ~25       | Replaces `tmp/phase-3-stash-manifest.md`. Documents the single-stash topology.                                |

### Modified in Phase 4 (incremental)

| File                                  | Change                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/types/index.ts`           | Re-add `export * from './logger.types'` (reverts the Phase 3 temporary removal).                                                                                                                                                                                                                                                                                                               |
| `package.json`                        | Declare `@logtape/logtape`, `@logtape/pretty`, `fast-glob`, `fishery` (deps); `happy-dom` (dev). **No** `drizzle-orm`, `drizzle-kit`, `drizzle-typebox`, `drizzle-seed`, `js-yaml`, `@types/js-yaml`. YAML parsing uses `Bun.YAML.parse()` everywhere (already standard in `@core` per `tools/rules/no-bun-in-core.rule.yml`).                                                                      |
| `tsconfig.json`                       | +6 path aliases (no wildcards — barrel-only public surfaces): `@shared/logging`, `@shell/app`, `@shell/app/db`, `@shell/app/config`, `@shell/app/lib`, `@testing`.                                                                                                                                                                                                                             |
| `.ls-lint.yml`                        | New rules for `src/__tests__/`, `src/__tests__/factories/`, `src/__tests__/helpers/`, `src/__tests__/fixtures/`, `src/__tests__/fixtures/sample/`. New rule for `src/shell/app/lib/` (`util` / `types`).                                                                                                                                                                                       |
| `.dependency-cruiser.cjs`             | Verify (or add) the three forbidden-import rules: `renderer→shell/app`, `core→shell`, `shared→shell`.                                                                                                                                                                                                                                                                                          |
| `.gitignore`                          | Append `docs/superpowers/` (defensive — the path is the brainstorming skill's default and must never resurface).                                                                                                                                                                                                                                                                               |
| `.agents/skills/app-context/SKILL.md` | Drop the legacy `seed.ts` row, replace `drizzle-typebox` mention with hand-written TypeBox + `Value.Check`, retarget the migrations sentence to `tools/db/migrations/` (introduced ≥ Phase 9 — see [`foundation/design.md`][7] § Migration mechanism).                                                                                                                                         |
| `.agents/skills/app-testing/SKILL.md` | Strip the entire "drizzle-seed (secondary)" subsection (Decision 4); remove the `import { drizzle } from 'drizzle-orm/bun-sqlite'` example; update the `@testing` exports table to drop `minimalEntriesYml`, `seedMinimalFixture`, `readMinimalFixtureEntries`; rewrite `createSeededMemoryDb` example as synchronous (`db: Database`, no `Awaited<>`); fix `@app/app.service` → `@shell/app`. |
| `.agents/skills/app-rpc/SKILL.md`     | Replace the `drizzle-typebox` schema-derivation guidance with hand-written TypeBox response schemas (Decision 3); drop the `createSelectSchema` / `createInsertSchema` example; update the response-shape checklist to point at hand-written schemas in `src/shared/rpc/` (Phase 5).                                                                                                           |

### Files **deferred** (re-stashed as part of `phase-pending`)

```
src/shell/app/app.{ts,spec.ts}                    → Phase 5
src/shell/main/main.spec.ts                       → Phase 5
src/shell/main/helpers/error.helper.{ts,spec.ts}  → Phase 5
src/shell/main/window/state.{ts,spec.ts}          → Phase 8
src/shell/main/rpc/                               → Phase 5
src/shell/renderer/components/                    → Phase 6/7
src/shell/renderer/{hooks,pages,utils,…}          → Phase 6
src/shared/rpc/                                   → Phase 5
tools/preview/                                    → Phase 5
tools/benchmarks/                                 → Phase 5
```

`docs/superpowers/` is **deleted, not stashed** (Decision: it never exists in
this repo).

---

## SCHEMA

### `src/shell/app/db/schema.ts`

```ts
/** SQL DDL constants and TypeScript row shapes for the knowledges table. */

export const CREATE_KNOWLEDGES_SQL = `
CREATE TABLE IF NOT EXISTS knowledges (
  id          INTEGER PRIMARY KEY,            -- crc32(type:key) — see @core
  type        TEXT    NOT NULL,               -- 'bookmark' | 'command' | 'cheat' | 'task'
  key         TEXT    NOT NULL,
  source      TEXT    NOT NULL,               -- absolute YAML path
  desc        TEXT    NOT NULL,
  tags        TEXT    NOT NULL DEFAULT '[]',  -- JSON string[]
  links       TEXT             DEFAULT '[]',  -- JSON LinkItem[]
  notes       TEXT             DEFAULT '[]',  -- JSON NoteBlock[]
  doc         TEXT    NOT NULL DEFAULT '',    -- pre-assembled Markdown (Phase 7 populates)
  priority    TEXT,                            -- task: 'low' | 'mid' | 'high' | 'urgent'
  status      TEXT,                            -- task: 'todo' | 'doing' | 'done'
  due_date    INTEGER,                         -- task: unix-ms (Phase 9 populates)
  task_order  INTEGER,                         -- task: integer (Phase 9 populates)
  depends_on  TEXT             DEFAULT '[]',  -- JSON number[] (Phase 9 populates)
  meta        TEXT             DEFAULT '{}',  -- JSON Record<string,string>
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
  `CREATE INDEX IF NOT EXISTS idx_knowledges_type       ON knowledges(type);`,
  `CREATE INDEX IF NOT EXISTS idx_knowledges_task_order ON knowledges(task_order);`,
  `CREATE INDEX IF NOT EXISTS idx_knowledges_due_date   ON knowledges(due_date);`,
] as const

/** SQLite row shape — column names are snake_case to match the DDL. */
export type KnowledgeRow = {
  id: number
  type: string
  key: string
  source: string
  desc: string
  tags: string                   // JSON string[]
  links: string | null           // JSON LinkItem[]
  notes: string | null           // JSON NoteBlock[]
  doc: string
  priority: string | null
  status: string | null
  due_date: number | null
  task_order: number | null
  depends_on: string | null      // JSON number[]
  meta: string | null            // JSON Record<string,string>
  created_at: number
  updated_at: number
}

/** All columns are required at insert time — caller stringifies JSON columns. */
export type KnowledgeInsert = KnowledgeRow
```

### `src/shell/app/db/client.ts`

```ts
import { Database } from 'bun:sqlite'
import { CREATE_FTS_SQL, CREATE_INDEXES_SQL, CREATE_KNOWLEDGES_SQL } from './schema'

export type DbHandle = Database  // alias kept for readability across consumers

export function openDatabase(dbPath: string): DbHandle {
  const resolved = dbPath === ':memory:'
    ? dbPath
    : expandPath(dbPath)                        // from @shared/utils
  const db = new Database(resolved, { strict: true })
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  db.run(CREATE_KNOWLEDGES_SQL)
  db.run(CREATE_FTS_SQL)
  for (const sql of CREATE_INDEXES_SQL) db.run(sql)
  return db
}
```

`strict: true` lets prepared-statement bindings drop the `$` prefix, which
makes `entry.repository.ts` significantly more readable.

`rebuildFts(db)` is called by `ImportService.runOnce()` once at the end of
each run. Phase 4 does **not** introduce FTS triggers — explicit rebuild is
sufficient until concurrent inserts become a Phase 9 concern.

---

## MIGRATION MECHANISM

Phase 4 has **no migrations folder, no migration runner, and no
`_app_migrations` table.** The bootstrap-only stage from
[`foundation/design.md`][7] § Migration mechanism applies. `client.ts`
runs the three idempotent DDL constants on every open; that is the entire
mechanism in Phase 4.

The runner and `tools/db/migrations/` folder are introduced **only** when
the first real schema change ships (earliest Phase 9). At that point:

1. Extract the contents of `CREATE_KNOWLEDGES_SQL`, `CREATE_FTS_SQL`, and
   `CREATE_INDEXES_SQL` into `tools/db/migrations/0001_initial.sql`
   verbatim.
2. Add `src/shell/app/db/migrate.ts` (≈ 35 lines — see foundation spec).
3. Replace the three `db.run(…)` calls in `openDatabase()` with
   `migrate(db, migrationsDir)`.
4. Add `0002_<change>.sql` for the new change.

Phase 4 must not pre-create the runner, the folder, or the bookkeeping
table. They are YAGNI until step 4 above has a concrete trigger.

[7]: ../foundation/design.md

---

## VALIDATION FLOW

| Boundary                           | Library                                                  | File                                                                     |
| ---------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| YAML → core domain                 | TypeBox (`Value.Check`)                                  | `src/core/domain/models/entries/schemas/*.schema.ts` (committed Phase 3) |
| Config file → loaded config        | TypeBox (`Value.Check`) — **rewritten in Phase 4**       | `src/shell/app/config/config.schema.ts`                                  |
| `KnowledgeRow` → typed `Knowledge` | TypeScript only (mapper in repository)                   | `src/shell/app/db/entry.repository.ts` `rowToKnowledge()`                |
| RPC body / query / response        | TypeBox via Elysia `t.*` + hand-written response schemas | (Phase 5)                                                                |

After Phase 4: `bun run lint:depcruise` finds zero `import` of `'zod'`
anywhere in `src/`. `package.json` has no Zod dependency. The invariant
holds.

### `config.schema.ts` (TypeBox)

```ts
import { type Static, Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { err, ok, type Result } from 'neverthrow'
import { DEFAULTS } from '@core/constants'

export const PAGE_SIZE_SMALL  = 25
export const PAGE_SIZE_MEDIUM = 50
export const PAGE_SIZE_LARGE  = 100
export const PAGE_SIZE_XL     = 200

const PageSize = Type.Union([
  Type.Literal('25'),
  Type.Literal('50'),
  Type.Literal('100'),
  Type.Literal('200'),
])

const DisplayConfig = Type.Object({
  terminalApp: Type.Optional(Type.String()),
  editorApp:   Type.Optional(Type.String()),
  pageSize:    Type.Optional(PageSize),
})

export const configSchema = Type.Object({
  database: Type.Optional(Type.Object({ path: Type.Optional(Type.String()) })),
  sources:  Type.Optional(Type.Object({ path: Type.Optional(Type.String()) })),
  display:  Type.Optional(DisplayConfig),
})

export type RawConfig = Static<typeof configSchema>

export type ResolvedConfig = {
  database: { path: string }
  sources:  { path: string }
  display:  { terminalApp?: string; editorApp?: string; pageSize: '25' | '50' | '100' | '200' }
}

export const DEFAULT_CONFIG_BODY: RawConfig = {
  database: { path: DEFAULTS.database.path },
  sources:  { path: DEFAULTS.sources.path },
  display:  {},
}

export function parseConfig(raw: unknown): Result<RawConfig, string[]> {
  if (!Value.Check(configSchema, raw)) {
    const issues = [...Value.Errors(configSchema, raw)]
      .map(e => `${e.path || '(root)'}: ${e.message}`)
    return err(issues)
  }
  return ok(raw as RawConfig)
}
```

`config.loader.ts` updates: replace `configSchema.safeParse(raw)` with
`parseConfig(raw)`. Defaults that Zod applied via `.default()` are now
injected by `loadConfig()` after a successful `Value.Check` (the Zod
chain's `.default()` calls move to the *resolution* step, not the
*validation* step).

---

## REPOSITORY APIs (`entry.repository.ts`)

The legacy public API is preserved; the internals are rewritten in raw
`bun:sqlite` with typed prepared statements.

```ts
import { type Database } from 'bun:sqlite'
import type { EntryType, Knowledge } from '@core'
import type { KnowledgeRow } from './schema'

export type FindAllOpts = {
  query?:  string                         // FTS5 MATCH expression (raw user input — escaped internally)
  tags?:   string[]                       // AND semantics
  types?:  EntryType[]                    // restrict to one or more types
  limit?:  number                         // default 50; -1 = no limit
  offset?: number                         // default 0
}

export type DbStats = {
  total: number
  byType: Record<string, number>
}

export function upsert(db: Database, row: Knowledge): 'inserted' | 'updated'
export function rebuildFts(db: Database): void
export function findAll(db: Database, opts?: FindAllOpts): Knowledge[]
export function findById(db: Database, id: number): Knowledge | null
export function getDbStats(db: Database): DbStats
export function getTagCounts(db: Database): Record<string, number>
```

### Hot-path implementations

`upsert` is hand-written `INSERT … ON CONFLICT(id) DO UPDATE SET …`:

```ts
const UPSERT_SQL = `
INSERT INTO knowledges (
  id, type, key, source, desc, tags, links, notes, doc,
  priority, status, due_date, task_order, depends_on, meta,
  created_at, updated_at
) VALUES (
  $id, $type, $key, $source, $desc, $tags, $links, $notes, $doc,
  $priority, $status, $due_date, $task_order, $depends_on, $meta,
  $created_at, $updated_at
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

export function upsert(db: Database, row: Knowledge): 'inserted' | 'updated' {
  const exists = db.query<{ one: 1 } | null, [number]>(
    'SELECT 1 AS one FROM knowledges WHERE id = ?'
  ).get(row.id)
  db.query(UPSERT_SQL).run(rowToParams(row))
  return exists ? 'updated' : 'inserted'
}
```

`findById` uses `db.query<KnowledgeRow, [number]>(…)` — the result row is
typed without any external mapper:

```ts
const FIND_BY_ID_SQL = 'SELECT * FROM knowledges WHERE id = ?'

export function findById(db: Database, id: number): Knowledge | null {
  const row = db.query<KnowledgeRow, [number]>(FIND_BY_ID_SQL).get(id)
  return row ? rowToKnowledge(row) : null
}
```

`findAll` keeps the legacy two-branch dispatch (FTS5 join when `query`
is non-empty, plain `SELECT` otherwise) and the in-process tag-AND
filtering. The `types: EntryType[]` filter is parameterised via a
dynamically-built `IN (?,?,…)` clause — no prepared-statement caching
across length-varying clauses, but the filter is short.

`toFts5MatchQuery(input)` (private) splits on whitespace, escapes embedded
quotes, and appends `*` for prefix matching. Avoids exposing FTS5 syntax
to callers.

`rowToKnowledge(row: KnowledgeRow): Knowledge` reads only the columns
`Knowledge` exposes today. Phase 4's new columns (`doc`, `task_order`,
`due_date`, `depends_on`) are **stored but not surfaced** until Phase 7/9
extends the `Knowledge` type and the mapper.

### `_id_query_cache` not introduced

Phase 4 does **not** add the in-memory query cache from
[`foundation/design.md`][1] § In-memory query cache. That cache lives in
`AppService`, which is Phase 5.

---

## IMPORT SERVICE (`import.service.ts`)

```ts
class ImportService {
  constructor(dbPath: string, opts?: { debug?: boolean })
  async runOnce(
    sourcesDir: string,
    options?: { onProgress?: (processed: number, total: number) => void }
  ): Promise<ImportResult>
}

type ImportResult = {
  filesProcessed: number
  inserted: number
  updated: number
  errors: string[]
}
```

Flow:

```
sourcesDir
  → fast-glob('**/*.{yaml,yml}', { absolute: true })
  → for each file (sequential — onProgress reflects committed bundles):
      → fs.readFile(filePath, 'utf-8')
      → parseSourceFile(filePath, content)            [@core, Phase 3 —
                                                       internally Bun.YAML.parse]
      → db.transaction(() => {
          → for each entry:
              → isValidSourceRowMin(entry)            [@core guard, Phase 3]
              → toKnowledge(entry, now)               [@core, Phase 3]
              → upsert(db, row)
        })()
      → log phase=import label=<filePath> dur_ms=<n>
  → rebuildFts(db)
  → return ImportResult { filesProcessed, inserted, updated, errors }
```

Idempotency (V1-2 §4) is provided by `upsert` (deterministic crc32 IDs +
`ON CONFLICT(id) DO UPDATE`). Second run with no source changes returns
`inserted: 0, updated: N`.

Partial failure (V1-2 §3) is captured per file: a parse / validation error
on one bundle pushes a string into `result.errors` and continues with the
next file. The transaction wrapper means a partially-applied bundle rolls
back — successful bundles up to that point stay committed.

Phase 4 does **not** call `assembleDoc()` here. The `doc` column stays at
its default `''` until Phase 7 extends this flow.

---

## TEST INFRASTRUCTURE

### Public surface (`src/__tests__/index.ts`)

```ts
export { factoryFor }                       from './factories/entries.factory'
export { createFactoryFor }                 from './helpers/factory.helper'
export { createSeededMemoryDb }             from './helpers/seed.helper'
export { createTempDir }                    from './helpers/tmp.helper'
export {
  type FactoryBuildOpts,
  isFactoryOpts,
  type WrappedFactoryOpts,
}                                           from './helpers/factory.types'
export { testingPaths }                     from './paths'
```

Removed (vs. legacy): `seedMinimalFixture`, `readMinimalFixtureEntries`,
`minimalEntriesYml`. The synchronous `createSeededMemoryDb` covers every
former consumer.

### Pattern

The canonical app spec shape (Better Specs §Naming, §Single expectation —
see [`assets/guides/TESTING_GUIDE.md`][12] and `app-testing` skill):

```ts
import type { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createSeededMemoryDb, factoryFor } from '@testing'
import { findById, upsert } from '@shell/app/db'

describe('entry.repository', () => {
  let db: Database
  beforeEach(() => { db = createSeededMemoryDb() })
  afterEach(() => db.close())

  describe('#upsert', () => {
    describe('when the row id is new', () => {
      it("returns 'inserted'", () => {
        const row = factoryFor('bookmark', { overrides: { key: 'https://example.com/x' } })
        expect(upsert(db, row)).toBe('inserted')
      })
    })

    describe('when the row id already exists', () => {
      it("returns 'updated'", () => {
        const row = factoryFor('bookmark', { overrides: { key: 'https://example.com/x' } })
        upsert(db, row)
        expect(upsert(db, { ...row, desc: 'edited' })).toBe('updated')
      })
    })
  })

  describe('#findById', () => {
    describe('when the row was upserted', () => {
      it('returns the persisted entry', () => {
        const row = factoryFor('bookmark', { overrides: { key: 'https://example.com/x' } })
        upsert(db, row)
        expect(findById(db, row.id)?.key).toBe('https://example.com/x')
      })
    })
  })
})
```

Conventions enforced above (`app-testing` Better Specs table):

- `describe` per unit, inner `describe` per method (`#upsert`, `#findById`).
- Inner `describe` blocks start with **when / with / without**.
- `it(...)` only — `test(...)` is banned.
- One `expect` per `it`; multi-fact specs split into nested describes.
- Description ≤ 40 chars, present tense, third person ("returns",
  not "should return").
- Imports alphabetised (Biome rule); type imports first.
- Sub-barrel import: `from '@shell/app/db'` (no wildcard alias).

Note: `bun:sqlite` is **synchronous**. `upsert`, `findById`, etc. drop
their `async` modifiers compared to the legacy Drizzle versions. Tests
follow suit (no `await` in the body, no `async` on the `it` callback).

[12]: ../../../guides/TESTING_GUIDE.md

### Specs added or extended in Phase 4

| Spec                                              | Disposition           | Coverage                                                                                                                                                    |
| ------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shell/app/db/client.spec.ts`                 | **new**               | Bootstrap runs on `:memory:`; PRAGMA settings; double-open is idempotent; new columns + indexes exist; `strict` mode rejects missing parameters.            |
| `src/shell/app/db/entry.repository.spec.ts`       | rewritten from legacy | All 6 public functions; FTS5 prefix-matching; tag-AND filtering; `getDbStats` totals; `getTagCounts` JSON parsing; `upsert` insert vs. update branch.       |
| `src/shell/app/db/import.service.spec.ts`         | rewritten from legacy | Idempotent re-run; partial failure with `mixed_invalid.yml`; progress callback emits before/after each bundle; transactional rollback when one entry fails. |
| `src/shell/app/config/config.schema.spec.ts`      | **new**               | `parseConfig` accepts valid; rejects each invalid case in `fixtures/config.invalid.yaml`; error messages preserve field paths.                              |
| `src/shell/app/config/config.loader.spec.ts`      | rewritten from legacy | Works with the TypeBox `parseConfig`; defaults injection; round-trip through `saveConfig`.                                                                  |
| `src/__tests__/factories/entries.factory.spec.ts` | renamed               | All factories build without overrides; sequence-based `id` is unique.                                                                                       |
| `src/__tests__/helpers/factory.helper.spec.ts`    | renamed               | `createFactoryFor` returns a typed builder; overrides shallow-merge correctly.                                                                              |
| `src/__tests__/helpers/seed.helper.spec.ts`       | rewritten             | `createSeededMemoryDb` returns a populated `Database` with one entry per type.                                                                              |
| `src/__tests__/helpers/tmp.helper.spec.ts`        | renamed               | `createTempDir` produces isolated dirs; cleanup callback removes them.                                                                                      |
| `src/__tests__/paths.spec.ts`                     | trimmed               | `testingPaths` constants resolve; the `sample/` directory exists.                                                                                           |

Coverage target ≥ 80 % per `app-quality-gate`. Phase 4 measured: at least the
new `client` / `config.schema` specs plus the rewritten legacy specs all
green.

---

## TEST FIXTURE CORPUS

`src/__tests__/fixtures/sample/` holds **5 files** used by
`import.service.spec.ts` for the coarse import smoke path. The importer records
errors per file bundle, so the invalid sample is intentionally one failing file
alongside four valid sibling files:

| File                | Purpose                                                                                                     | Entries |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ------- |
| `bookmarks.yml`     | Bare bookmark, placeholder-search URL, titled links, markdown notes, unusual-but-valid URL shapes           | 3       |
| `commands.yml`      | Heavy markdown command, shorter command note, titled links                                                  | 3       |
| `cheats.yml`        | Portuguese text, keyboard glyphs, PlantUML note block                                                       | 3       |
| `tasks.yml`         | All task statuses, multiple priorities, markdown checklist, `meta.due`                                      | 4       |
| `mixed_invalid.yml` | One file containing both valid and invalid rows; entry-level error isolation imports valid siblings while skipping invalid rows with errors | 2–3       |

Total target: 13 valid imported entries plus 1 expected file-level error.

`src/__tests__/fixtures/config.invalid.yaml` remains the existing config-failure
corpus.

`src/__tests__/fixtures/minimal/entries.yml` remains unchanged and is the
deterministic fixture for exact-count and idempotency assertions.

All other tests build typed rows via `factoryFor(...)` and call `upsert()`
directly — no YAML, no disk I/O.

---

## PATH ALIASES

The Phase 4 additions intentionally drop the legacy `<alias>/*` wildcard
form. Wildcards expose internal layout and give consumers two ways to
import the same thing — a smell that bites during refactors. The new
convention is **explicit, named sub-barrels**: each public surface is a
specific `index.ts` that the alias points at, so refactoring a sub-module
cannot break consumers.

```jsonc
"paths": {
  // Legacy aliases — kept verbatim (committed in earlier phases).
  // Future cleanup may audit and remove the /* form.
  "@core":             ["./src/core/index.ts"],
  "@core/*":           ["./src/core/*"],
  "@shared/utils":     ["./src/shared/utils/index.ts"],
  "@shared/utils/*":   ["./src/shared/utils/*"],
  "@shared/types":     ["./src/shared/types/index.ts"],
  "@shared/types/*":   ["./src/shared/types/*"],

  // Phase 4 additions — barrel-only, explicit sub-barrels, no wildcards.
  "@shared/logging":   ["./src/shared/logging/index.ts"],
  "@shell/app":        ["./src/shell/app/index.ts"],
  "@shell/app/db":     ["./src/shell/app/db/index.ts"],
  "@shell/app/config": ["./src/shell/app/config/index.ts"],
  "@shell/app/lib":    ["./src/shell/app/lib/index.ts"],
  "@testing":          ["./src/__tests__/index.ts"]
}
```

A direct file import like
`from '@shell/app/db/entry.repository'` therefore **does not resolve** —
consumers must go through one of the four named barrels. Inside
`src/shell/app/` itself, relative imports stay unconstrained
(`from './entry.repository'`, `from '../config'`).

Barrel files (all minimal — no logic, just re-exports):

```ts
// src/shell/app/index.ts (~5 lines)
export * from './db'
export * from './config'
export * from './lib'
```

```ts
// src/shell/app/db/index.ts (~5 lines)
export * from './client'
export * from './entry.repository'
export * from './import.service'
export * from './schema'
```

```ts
// src/shell/app/config/index.ts (~3 lines)
export * from './config.loader'
export * from './config.schema'
```

```ts
// src/shell/app/lib/index.ts (~3 lines)
export * from './task_views.types'
export * from './task_views.util'
```

---

## DEPENDENCIES

```jsonc
// package.json — declarations Phase 4 must add
"dependencies": {
  "@logtape/logtape": "^2.0.5",
  "@logtape/pretty":  "^2.0.5",
  "fast-glob":        "^3.3.3",
  "fishery":          "^2.4.0"
},
"devDependencies": {
  "happy-dom":        "^20.9.0"
}
```

`bun install` reconciles the lockfile after `package.json` is amended.

**Not added** (and confirmed absent from `package.json`):

- `drizzle-orm`, `drizzle-kit`, `drizzle-typebox`, `drizzle-seed` — see
  [Decision 5][5].
- `zod` — see [Decision 2][3]. After Phase 4, `bun run knip` fails the
  lint stage if `zod` reappears.
- `js-yaml`, `@types/js-yaml` — `Bun.YAML.parse()` is the project
  standard for YAML deserialisation. `@core`'s
  `parseSourceFile()` already uses it (committed Phase 3); the
  `tools/rules/no-bun-in-core.rule.yml` ast-grep rule explicitly allow-lists
  `Bun.YAML.parse` and `Bun.YAML.stringify` as the only Bun globals
  permitted in the pure core (they are string-in / object-out, no I/O).
  `config.loader.ts` follows the same pattern. `js-yaml` is never
  imported anywhere in `src/`; declaring it would be cargo-culting the
  legacy `node_modules/` snapshot.

---

## LINT CONFIG UPDATES

### `.ls-lint.yml`

Add new sections for `src/__tests__/` (currently uncovered) and
`src/shell/app/lib/` (new sub-folder):

```yaml
# Tests root: barrel + paths constants only.
src/__tests__:
  .ts: regex:^(index|paths)(\.spec)?$

# Factory files own a domain + .factory suffix.
src/__tests__/factories:
  .ts: regex:^[a-z][a-z0-9_]*\.factory(\.spec)?$

# Helpers carry .helper or .types; no compound prefixes.
src/__tests__/helpers:
  .ts: regex:^[a-z][a-z0-9_]*\.(helper|types)(\.spec)?$

# YAML / yaml fixtures must be snake_case basenames.
src/__tests__/fixtures:
  .yml:  regex:^[a-z][a-z0-9_]*$
  .yaml: regex:^[a-z][a-z0-9_]*$

src/__tests__/fixtures/sample:
  .yml: regex:^[a-z][a-z0-9_]*$

# AppService support utilities.
src/shell/app/lib:
  .ts: regex:^[a-z][a-z0-9_]*\.(util|types)(\.spec)?$
```

Confirm the existing regex for `src/shell/app/db/` still passes the
restored / rewritten files (`client`, `schema`, `*.repository`,
`*.service` — all match `^([a-z][a-z0-9_]*\.(repository|service)|client|schema)(\.spec)?$`).

### `.dependency-cruiser.cjs`

Verify these forbidden-import rules exist (add if missing):

```js
{ name: 'no-renderer-to-shell-app', severity: 'error',
  from: { path: '^src/shell/renderer' }, to: { path: '^src/shell/app' } },
{ name: 'no-core-to-shell',         severity: 'error',
  from: { path: '^src/core' },           to: { path: '^src/shell' } },
{ name: 'no-shared-to-shell',       severity: 'error',
  from: { path: '^src/shared' },         to: { path: '^src/shell' } },
```

### `.gitignore`

Append at the end of the file:

```gitignore
# Brainstorming-skill default path; app uses assets/docs/archive/ instead.
docs/superpowers/
```

---

## VERIFICATION (per [`assets/guides/DoD.md`][9] and [`.agents/skills/app-quality-gate`][10])

1. `bun run lint:fix` (Stage 0).
2. `bun test` — all green; coverage ≥ 80 %.
3. `bun run lint` — biome, knip, depcruise, mise tombi, jscpd, ls-lint,
   ast-grep all clean.
4. `bun run build` — macOS smoke build succeeds (skipped on Linux hosts
   per `gate.sh`).
5. `git status` after re-stashing — only the Phase 4 commit visible;
   `phase-pending` stash holds everything else; no `docs/superpowers/`.
6. `bun pm ls --all | grep -i drizzle` returns nothing.
7. `rg -n "from 'zod'" src/` returns nothing.
8. `rg -n "from 'js-yaml'|require\('js-yaml'\)" src/ tools/` returns nothing
   (Bun.YAML standard).
9. `tsconfig.json` `paths` for `@shell/app*`, `@shared/logging`, and
   `@testing` contain **no** `/*` form (barrel-only invariant).
10. Final commit message matches `^feat\(data\): [A-Z][^.]{0,49}$`
    (Conventional Commits + ≤ 50-char subject).

[9]: ../../../guides/DoD.md
[10]: ../../../../.agents/skills/app-quality-gate/SKILL.md

---

## OPEN-QUESTION RESOLUTIONS (locked)

| Question                           | Resolution                                                                                                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AppService scope                   | Defer to Phase 5.                                                                                                                                                             |
| Schema scope                       | Add all 4 future columns now (nullable / defaulted, populated by consumer phases).                                                                                            |
| Migration mechanism                | Bootstrap-only in Phase 4. Runner + `tools/db/migrations/` introduced when first real schema change ships (≥ Phase 9). See [`foundation/design.md`][7] § Migration mechanism. |
| `due_date` storage                 | Integer unix-ms (column reserved; legacy reads `meta.due` until Phase 9).                                                                                                     |
| FTS5 triggers vs. explicit rebuild | Explicit `rebuildFts(db)` at end of `ImportService.runOnce`. Triggers deferred.                                                                                               |
| Fixtures library                   | Fishery. drizzle-seed not added.                                                                                                                                              |
| Fixture YAML corpus                | 5 curated files under `fixtures/sample/`; `minimal/` deleted.                                                                                                                 |
| Test helper / factory naming       | All 11 renames per §LINT CONFIG UPDATES.                                                                                                                                      |
| ORM                                | None. `bun:sqlite` directly.                                                                                                                                                  |
| Commit strategy                    | One atomic commit. Subject `feat(data): Add SQLite schema, repositories, import service`.                                                                                     |
| Stash strategy                     | Collapse to single `phase-pending`.                                                                                                                                           |
| `docs/superpowers/`                | Delete + `.gitignore`.                                                                                                                                                        |
| Recovery source                    | `~/Work/bun/app_legacy` worktree at `cc3d08b`.                                                                                                                                |

---

## RELATED DOCS

- [`assets/docs/archive/foundation/design.md`](../foundation/design.md) — full
  architecture (Decisions 1–5, RPC contract, schema layers, migration
  mechanism, design system).
- [`assets/docs/archive/foundation/requirements.md`](../foundation/requirements.md) — V1-2 (Sync), V1-3 (List), V1-5 (Stats), V1-7 (Tasks).
- [`assets/docs/archive/foundation/roadmap.md`](../foundation/roadmap.md) — Phase 4 entry.
- [`assets/docs/archive/core-domain/design.md`](../core-domain/design.md) — Phase 3 (committed).
- [`assets/guides/DoD.md`](../../../guides/DoD.md), [`assets/guides/TESTING_GUIDE.md`](../../../guides/TESTING_GUIDE.md), [`assets/guides/FISHERY_GUIDE.md`](../../../guides/FISHERY_GUIDE.md), [`assets/guides/CODESTYLE_GUIDE.md`](../../../guides/CODESTYLE_GUIDE.md), [`assets/guides/FCIS.guide.md`](../../../guides/FCIS.guide.md), [`assets/guides/GIT_COMMITS_GUIDE.md`](../../../guides/GIT_COMMITS_GUIDE.md), [`assets/guides/BUN_RUNTIME.md`](../../../guides/BUN_RUNTIME.md), [`assets/guides/ELECTROBUN.md`](../../../guides/ELECTROBUN.md).
