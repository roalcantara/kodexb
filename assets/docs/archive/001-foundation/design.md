<!-- markdownlint-disable-file -->
# Design Document: app Desktop

## OVERVIEW

**app** is a macOS desktop knowledge-base app built on [Electrobun][8] and
[Bun][1]. It lets developers browse, search, and manage personal knowledge
entries (bookmarks, commands, cheat-sheets, tasks) stored as YAML files with
a local SQLite index.

The architecture is **Functional Core, Imperative Shell (FCIS)** extended with
a renderer zone:

| **Zone**         | **Location**          | **Rule**                                              |
| ---------------- | --------------------- | ----------------------------------------------------- |
| Functional Core  | `src/core/`           | Pure functions only. No I/O, no side-effects.         |
| Imperative Shell | `src/shell/`          | All I/O: DB, config, file system, RPC server.         |
| Shared           | `src/shared/`         | Pure utilities and shared types — no I/O.             |
| Renderer (UI)    | `src/shell/renderer/` | React browser app. Calls main via Eden Treaty client. |

YAML sources are the source of truth. SQLite is a derived, rebuildable index.
The main process owns all I/O. The renderer owns all UI. They communicate
**exclusively** via the Elysia RPC server.

---

## ARCHITECTURE DECISIONS

### Decision 1 — Elysia + Eden Treaty as the RPC bridge

**Decision:** The RPC contract between the main process and the renderer is
defined by an [Elysia][10] app exported from `src/shell/main/rpc/server.ts`.
[Eden Treaty][11] auto-generates a fully type-safe client from that app's type.

**Rationale:**

- A single exported `RpcApp` type replaces the manually-authored
  `src/shared/rpc/schema.ts` file — no schema drift.
- Eden Treaty produces end-to-end TypeScript types (request + response) without
  any code generation step.
- Elysia's `t` (TypeBox) provides runtime validation at the transport boundary
  using the same TypeBox dialect as the rest of the codebase (see Decision 2).
- The same Elysia app runs over HTTP in the preview server (`tools/preview/server.script.ts`)
  without any mock shims — identical behaviour in dev and production.

**Files eliminated vs. the old approach:**

| Old                                | New equivalent                 |
| ---------------------------------- | ------------------------------ |
| `src/shared/rpc/schema.ts`         | `RpcApp` type in `server.ts`   |
| `src/shell/main/rpc.host.ts`       | `src/shell/main/rpc/server.ts` |
| `src/shell/renderer/rpc.client.ts` | Eden Treaty: `treaty<RpcApp>`  |

### Decision 2 — TypeBox everywhere; Zod removed from the stack

**Decision:** [TypeBox][12] (via Elysia's `t`) is the **sole** validation
library. It validates RPC requests at the transport boundary, YAML inputs in
`src/core/` (`*.schema.ts` files), config files in
`src/shell/app/config/config.schema.ts`, and DB-row response shapes returned
from Elysia routes. `zod` is **not** a dependency of the project.

**Rationale:** A single validation library means one schema dialect, one error
format, one mental model, and one bundle. Cross-layer schemas (e.g. an entry
schema reused by core parsing and route response validation) need no adapter.

### Decision 3 — RPC response schemas are hand-written TypeBox

**Decision:** Elysia route response shapes are described by hand-written
TypeBox objects co-located with the route file (or under
`src/shared/rpc/schemas/`). Database row shapes are TypeScript types declared
in `src/shell/app/db/schema.ts` next to the raw SQL DDL; route schemas mirror
them when needed.

**Rationale:** With Drizzle removed (Decision 5), `drizzle-typebox` is no
longer applicable. The duplication cost of hand-writing one TypeBox schema per
RPC response shape is bounded (~10 routes in MVP, each schema ≈ 20 lines) and
buys explicit, audit-friendly contracts at the transport boundary. A single
`KnowledgeSchema` in `src/shared/rpc/schemas/` covers the common entry-row
shape used by `/list`, `/entry/:id`, and similar routes.

### Decision 4 — Fishery factories for test fixtures; drizzle-seed not used

**Decision:** Test fixtures are produced by [Fishery][15] factories registered
through `factoryFor(...)` in `src/__tests__/factories/`. YAML fixture files in
`src/__tests__/fixtures/sample/` are kept **only** for end-to-end tests of
`ImportService.runOnce()` and partial-failure paths (V1-2 §3). All other
tests build typed rows via factories and call `upsert()` directly.

**Rationale:** Fishery aligns with FCIS — factories are pure, sequence-based,
override-friendly, and have no SQLite coupling. drizzle-seed is schema-bound,
which conflicts with Decision 5 (no Drizzle). YAML fixtures still earn their
keep where the unit-under-test is the YAML→DB pipeline itself.

### Decision 5 — bun:sqlite directly; Drizzle ORM removed

**Decision:** The data layer uses [`bun:sqlite`][16] directly. `drizzle-orm`,
`drizzle-kit`, and `drizzle-typebox` are **not** dependencies of the project.

**Rationale:** Empirical audit of the legacy implementation showed only
`upsert()` used Drizzle; the other five exported functions (`findAll`,
`findById`, `getDbStats`, `getTagCounts`, `rebuildFts`) all bypassed it
because Drizzle cannot express FTS5 `MATCH`, virtual tables, or `json_each`.
That ratio means Drizzle was paying its cost (~5 MB of deps, two parallel
APIs flowing through every consumer signature, an extra abstraction) for
≈ 10 % of the surface area.

`bun:sqlite` recovers what was useful from Drizzle:

- **Type-safe rows** via `db.query<KnowledgeRow, [number]>('SELECT …')`.
- **`db.transaction()`** wraps `ImportService` bundles in a single
  transaction — a real bulk-import perf win.
- **Deterministic, fast drivers** (3–6× faster than `better-sqlite3` per the
  Bun docs); no Drizzle layer between us and that performance.

Trade-offs accepted:

- `upsert()` is hand-written `INSERT … ON CONFLICT(id) DO UPDATE SET …`
  (~25 lines instead of a Drizzle DSL chain).
- `KnowledgeRow` / `KnowledgeInsert` are explicit TypeScript types in
  `db/schema.ts`, declared once next to the raw `CREATE TABLE`.
- Migrations land as numbered `*.sql` files under `tools/db/migrations/`,
  applied by a small in-process runner (≈ 30 lines) when the first real
  schema change ships (Phase 9 or whenever).

This decision was registered after Phase 4 brainstorming. The earlier draft
of this document referenced Drizzle, drizzle-typebox, drizzle-seed, and a
project-root `drizzle/` migration directory; all such references have been
purged.

---

## PROCESS MODEL

```
┌───────────────────────────────────────────────────────────────┐
│  Electrobun Main Process  (Bun runtime)                       │
│                                                               │
│  src/shell/main/main.ts     — app init, BrowserWindow         │
│  src/shell/main/rpc/                                          │
│    server.ts                — Elysia app (all routes + types) │
│    host.ts                  — binds Elysia app to IPC          │
│  src/shell/app/app.ts       — AppService (orchestrator)        │
│  src/shell/app/db/          — bun:sqlite (raw SQL + FTS5)      │
│  src/core/                  — pure domain logic               │
│                                                               │
│                │  Electrobun IPC  │                           │
│  ┌─────────────▼────────────────────────────────────────┐    │
│  │  BrowserWindow — src/shell/renderer/                  │    │
│  │  React app (pure browser JS, no Bun APIs)             │    │
│  │  Eden Treaty client: treaty<RpcApp>('app-app')         │    │
│  └───────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

---

## RPC CONTRACT

The Elysia app type is the **single source of truth** for the main↔renderer
interface. No separate schema file is needed.

```ts
// src/shell/main/rpc/server.ts (simplified)
import { Elysia, t } from 'elysia'
import type { AppService } from '../../app/app'

export function createRpcServer(app: AppService) {
  return new Elysia()
    .get('/list',       ({ query }) => app.list(query),       { query: ListQuerySchema })
    .get('/entry/:id',  ({ params }) => app.getEntry(+params.id), { params: t.Object({ id: t.String() }) })
    .get('/list-stats', () => app.getListStats())
    .get('/stats',      () => app.getStats())
    .get('/config',     () => app.getConfig())
    .post('/sync',      ({ body }) => app.sync(body.sourcesDir), { body: SyncBodySchema })
    .post('/config',    ({ body }) => app.applyConfigPatch(body), { body: ConfigPatchSchema })
    .post('/task',      ({ body }) => app.createTask(body),    { body: TaskCreateSchema })
    .put('/task/:id',   ({ params, body }) => app.updateTask(+params.id, body), { ... })
    .delete('/task/:id', ({ params }) => app.deleteTask(+params.id))
    .post('/open-external',   ({ body }) => app.openExternal(body.url))
    .post('/paste-terminal',  ({ body }) => app.pasteInTerminal(body.cmd))
    .post('/open-editor',     ({ body }) => app.openInEditor(body.filePath))
    .post('/show-dialog',     ({ body }) => app.showOpenDialog(body.opts))
    .post('/fetch-og-image',  ({ body }) => app.fetchPreviewImage(body.url))
    .post('/suggest-tags',    ({ body }) => app.suggestTags(body.entryId))
    .post('/resize-window',   ({ body }) => app.resizeWindow(body.width, body.height))
}

export type RpcApp = ReturnType<typeof createRpcServer>
```

### Eden Treaty client (renderer)

```ts
// src/shell/main/rpc/client.ts
import { treaty } from '@elysiajs/eden'
import type { RpcApp } from './server'

export const rpc = treaty<RpcApp>('app-app')
// Usage: const { data } = await rpc.list.get({ query: { limit: 20 } })
```

The renderer imports `rpc` from a path alias (`@rpc/client`). It never imports
from `src/shell/app/` or any Bun module directly.

---

## SCHEMA LAYERS

```
YAML files
  → js-yaml parse()
  → TypeBox validate (Knowledge schema)   ← domain invariants
  → derive stable id: crc32(type:key)
  → assembleDoc(entry)                    ← pure, no I/O
  → bun:sqlite upsert (raw INSERT … ON CONFLICT, knowledges table)

Query path:
  Elysia route receives request
  → TypeBox (t.*) validates query/body    ← transport boundary
  → AppService method (domain logic)
  → TypeBox response schema (hand-written, mirrors KnowledgeRow)
  → JSON over IPC → Eden Treaty client
```

TypeBox is the sole validation library across core and transport. `*.schema.ts`
files define shapes, and `*.parser.ts` files apply coercion plus custom
messages.

---

## STABLE IDENTITY

Entry IDs are deterministic: `crc32(type + ":" + yamlKey)`. Rebuilds never
change IDs. This makes deep links (`app://entry/<id>`) stable across syncs.

---

## DATA LAYER

- **Engine:** SQLite via [`bun:sqlite`][16] (raw SQL + prepared statements).
  No Drizzle ORM (Decision 5).
- **Primary table:** `knowledges` — one row per entry.
- **FTS5 virtual table:** `knowledges_fts` (content=`knowledges`,
  content_rowid=`id`); rebuilt on demand at the end of each
  `ImportService.runOnce()`.
- **`doc` column:** pre-assembled Markdown from `assembleDoc()` — read
  directly by the renderer via RPC. Phase 4 declares the column (default
  `''`); Phase 7 populates it.
- **Schema file:** `src/shell/app/db/schema.ts` — exports raw `CREATE TABLE`
  / `CREATE VIRTUAL TABLE` / `CREATE INDEX` strings plus the `KnowledgeRow`
  and `KnowledgeInsert` TypeScript types used across the repository.
- **Migrations:** see "Migration mechanism" below. Phase 4 uses an
  idempotent `CREATE TABLE IF NOT EXISTS` bootstrap in `client.ts` and
  declares **all** Phase 5–8 columns up-front, so no migrations are
  required between Phases 4 and the first real schema change.
- **Seed:** Tests build typed rows via Fishery `factoryFor(...)` and call
  `upsert()` directly (Decision 4). YAML fixtures under
  `src/__tests__/fixtures/sample/` exist only for `ImportService` end-to-end
  specs.

### Typed prepared statements

```ts
// src/shell/app/db/entry.repository.ts
import type { Database } from 'bun:sqlite'
import type { KnowledgeRow } from './schema'

const findByIdStmt = (db: Database) =>
  db.query<KnowledgeRow, [number]>(`SELECT * FROM knowledges WHERE id = ?`)

export function findById(db: Database, id: number): Knowledge | null {
  const row = findByIdStmt(db).get(id)
  return row ? rowToKnowledge(row) : null
}
```

`bun:sqlite` caches the compiled statement on the `Database` instance, so the
function-local prepared statement above is constant-cost across calls.

### Migration mechanism

There is no Drizzle, no `drizzle-kit`, and no schema diffing. Migrations are
plain `*.sql` files applied by a small in-process runner. The mechanism has
three phases of existence:

| Stage                | When                                                                      | What exists                                                                                                                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bootstrap-only**   | Phase 4 (now)                                                             | `client.ts` runs idempotent `CREATE TABLE IF NOT EXISTS …` (+ FTS5 virtual table + indexes). No `tools/db/migrations/` folder. No runner. No `_app_migrations` table.                                                                                                                                                                 |
| **Runner activated** | First phase that needs a schema change (earliest Phase 9, possibly later) | `tools/db/migrations/0001_initial.sql` (extracted verbatim from the Phase 4 bootstrap) plus `0002_<change>.sql` for the new change. `src/shell/app/db/migrate.ts` (≈ 35 lines) is added. `client.ts` stops running the bootstrap and calls `migrate(db, migrationsDir)` instead. The `_app_migrations` table is created on first run. |
| **Steady state**     | Phase ≥ runner activation                                                 | Each schema change is one new `<NNNN>_<snake_case_label>.sql` file. The runner replays everything not in `_app_migrations` in filename order, each in its own transaction.                                                                                                                                                            |

The runner's contract:

```ts
// src/shell/app/db/migrate.ts (introduced when the first schema change ships)
export function migrate(db: Database, dir: string): string[]
//   - ensures _app_migrations(filename PRIMARY KEY, applied_at INTEGER) exists
//   - selects already-applied filenames into a Set
//   - reads dir, keeps files matching /^\d{4}_[a-z0-9_]+\.sql$/, sorts ascending
//   - for each pending file: db.transaction(() => { db.run(sql); insert(filename, now) })
//   - returns the list of newly-applied filenames (for logging at phase=migrate)
```

Properties:

- **Idempotent.** Already-applied files are skipped on every startup.
- **Atomic per file.** Each migration runs in its own `db.transaction()`
  — a SQL error rolls back the whole file *and* its `_app_migrations`
  insert.
- **Deterministic ordering.** The 4-digit prefix is sorted as a string,
  which is identical to numeric order up to file 9999. (We will not have
  9999 migrations.)
- **Hand-authored SQL.** Same level of care as the bootstrap DDL in
  `client.ts`. No reverse-engineering, no implicit semantics.
- **Testable.** A spec exercises empty DB, partial-applied DB, malformed
  filename rejection, and SQL-error rollback.

This is enough complexity for app's data shape (one table family + FTS5 +
a handful of indexes). Drizzle-kit's value proposition (auto-generated
migrations from schema diffs) doesn't apply when we own a single, mostly
stable schema.

### In-memory query cache

A `Map<string, Entry[]>` keyed by normalised query string lives in `AppService`.
Invalidated on sync, config change, or any task mutation. Log phases `cache_hit`
and `cache_miss` are emitted at debug level.

---

## KEY DESIGN PRINCIPLES

1. **AppService as the only orchestrator.** RPC routes call `AppService` methods
   only. Routes never open SQLite directly or read the filesystem.

2. **Thin routes.** Each Elysia route: validates input (TypeBox), calls AppService,
   returns the result. No domain logic, no formatting inline.

3. **Renderer has no Bun.** The renderer is pure browser JS. Clipboard, file
   dialogs, OS APIs — all go through Eden Treaty. No `import` of Bun modules or
   `src/shell/app/` in `src/shell/renderer/`.

4. **Elysia is the contract.** `RpcApp` is the single source of truth for
   main↔renderer communication. TypeScript catches mismatches at compile time.

5. **Shared utilities are pure.** `src/shared/` has no I/O. Both `src/core/`
   and `src/shell/` may import from it. Neither may import from the other.

---

## REPOSITORY STRUCTURE

```tree
.
├── .agents/
│   └── skills/                   # Project-specific agent skills
│       ├── app-context/SKILL.md  # Always-loaded project context
│       ├── app-rpc/SKILL.md      # Elysia + Eden Treaty patterns
│       ├── app-testing/SKILL.md  # Testing conventions
│       └── app-quality-gate/     # DoD gate + gate.sh script
├── assets/
│   └── docs/                    # design.md, requirements.md, roadmap.md
├── docs/
│   └── specs/                   # Per-feature SDD specs (generated by sdd skill)
│       └── <feature-slug>/
│           ├── requirements.md  # EARS format
│           ├── design.md        # Technical design
│           └── tasks.md         # 2-4h task breakdown
├── src/
│   ├── core/                    # PURE — no I/O
│   │   ├── config/
│   │   │   ├── config.types.ts  # ResolvedConfig type
│   │   │   └── defaults.config.ts
│   │   └── domain/
│   │       ├── types/
│   │       │   └── entry.types.ts     # Entry, EntryType, LinkItem, etc.
│   │       ├── parsers/
│   │       │   ├── entry.parser.ts    # parseYamlFile(), deriveId()
│   │       │   ├── link.parser.ts
│   │       │   └── note.parser.ts
│   │       ├── doc/
│   │       │   ├── doc.builder.ts     # assembleDoc() — pure
│   │       │   ├── notes.parser.ts
│   │       │   ├── preamble.parser.ts
│   │       │   └── youtube.parser.ts
│   │       └── validators/            # TypeBox schemas for YAML shapes
│   ├── shared/                  # PURE — importable by all layers
│   │   ├── types/
│   │   │   └── index.ts         # Re-exports of domain types
│   │   ├── utils/               # path expansion, result helpers, crc32
│   │   └── logging/             # createLogger() over Logtape
│   └── shell/                   # IMPERATIVE — all I/O
│       ├── app/
│       │   ├── app.ts           # AppService (sync, list, view, stats, task ops)
│       │   ├── og.service.ts    # fetchPreviewImage() — HTTP + cache
│       │   └── db/
│       │       ├── schema.ts           # Raw CREATE TABLE/INDEX SQL + KnowledgeRow types
│       │       ├── client.ts           # openDatabase(path) — accepts :memory:; runs bootstrap DDL
│       │       ├── import.service.ts   # YAML → SQLite pipeline (transactional)
│       │       ├── entry.repository.ts # upsert, findAll, findById, FTS, stats
│       │       └── task.repository.ts  # task queries, dependency graph (Phase 9)
│       ├── app/config/
│       │   ├── config.loader.ts # loadConfig() — file I/O, js-yaml
│       │   └── config.schema.ts # TypeBox config schema + parseConfig()
│       ├── main/
│       │   ├── main.ts          # Electrobun app init, BrowserWindow
│       │   ├── rpc/
│       │   │   ├── server.ts    # Elysia app — all routes + RpcApp type
│       │   │   └── host.ts      # Binds Elysia to Electrobun IPC
│       │   └── window/
│       │       └── state.ts     # Persist/restore window bounds
│       └── renderer/
│           ├── index.html
│           ├── app.tsx          # React app root
│           ├── rpc/
│           │   └── client.ts    # treaty<RpcApp>('app-app')
│           ├── constants/
│           │   └── icons.const.ts
│           ├── utils/
│           │   ├── get_icon.util.ts
│           │   └── task_state.util.ts
│           ├── pages/
│           │   ├── list.page.tsx
│           │   ├── detail.page.tsx
│           │   ├── stats.page.tsx
│           │   └── settings.page.tsx
│           └── components/
│               ├── entry/
│               │   ├── EntryRow.component.tsx
│               │   ├── EntryBadge.component.tsx
│               │   └── BadgeAccessory.component.tsx
│               ├── layout/
│               │   ├── FilterDropdown.component.tsx
│               │   ├── Toolbar.component.tsx
│               │   └── DetailPanel.component.tsx
│               ├── task/
│               │   ├── TaskSheet.component.tsx
│               │   └── DependencyGraph.component.tsx
│               ├── actions/
│               │   └── ActionPalette.component.tsx
│               ├── og/
│               │   └── OgImage.component.tsx
│               └── markdown/
│                   └── MarkdownView.component.tsx
├── tools/
│   ├── db/
│   │   └── migrations/          # Numbered *.sql migration files (no Drizzle — applied by an in-house runner)
│   └── preview/
│       ├── server.ts            # Bun HTTP server — same Elysia app, HTTP mode
│       └── mock_electroview.ts  # Replaces electrobun/view for browser preview
├── electrobun.config.ts
├── biome.jsonc
├── knip.jsonc
├── package.json
└── tsconfig.json
```

---

## DATA FLOWS

### Sync

```
~/.config/app/sources/**/*.yaml
  → fs.promises.readFile()       [import.service]
  → js-yaml parse()
  → TypeBox validate (Knowledge) [src/core/domain/models/entries/schemas/]
  → derive stable id: crc32(type:key)
  → assembleDoc(entry)           [doc.assembler.ts — pure, populated in Phase 7]
  → bun:sqlite upsert            [entry.repository — INSERT … ON CONFLICT]
  → rebuild FTS5 virtual table
  → IPC push: syncProgress / syncComplete → renderer
```

### Query (list, detail)

```
User action in renderer
  → rpc.list.get({ query }) / rpc.entry[':id'].get()   [Eden Treaty]
  → Electrobun IPC → Elysia route
  → TypeBox validates query params
  → AppService.list() / getEntry()
  → entry.repository → SQLite (or cache hit)
  → JSON response → Eden Treaty client → React state
```

### Task mutation

```
Renderer (TaskSheet / keyboard shortcut)
  → rpc.task.post(input) / rpc.task[':id'].put(patch)
  → Elysia route → AppService.createTask / updateTask
  → task.repository (SQLite upsert + YAML write-back)
  → Response → renderer React state
  → rpc.list.get() re-fetch
```

YAML write-back: `AppService` locates the source file from the entry's `source`
field and performs an atomic read → mutate → write. New tasks with no source
file are written to the `write_target` path from config.

### Observability

Structured log lines (Logtape) to the Electrobun console:

```
ts=<ISO> phase=<label> label=<desc> dur_ms=<n>
```

| Phase         | When emitted                          |
| ------------- | ------------------------------------- |
| `config_load` | After config file read + validated    |
| `sqlite`      | After each SQLite query               |
| `import`      | After each file processed during sync |
| `cache_hit`   | Query served from in-memory cache     |
| `cache_miss`  | Cache bypassed, SQLite queried        |
| `rpc`         | Each RPC call (route + duration)      |

---

## WINDOW SIZING

| Width     | CSS class          | Panels visible                   |
| --------- | ------------------ | -------------------------------- |
| < 1050 px | `layout--compact`  | List only                        |
| ≥ 1050 px | `layout--comfort`  | List + detail                    |
| ≥ 1300 px | `layout--expanded` | List + detail + metadata sidebar |

App launches at **820 × 600 px** (compact). Pressing ↵ on a selected entry
calls `resizeWindow(1200, current_height)` before the CSS slide-in fires, so
the panel expansion and window grow happen simultaneously.

Detail panel CSS:

```css
.detail-panel {
  width: 0;
  overflow: hidden;
  opacity: 0;
  transition: width 180ms ease-out, opacity 180ms ease-out;
}
.detail-panel.visible {
  width: var(--detail-width, 380px);
  opacity: 1;
}
```

---

## CONFIG LIFECYCLE

`loadConfig()` is called once at app ready. The result is passed to `AppService`
and the Elysia host. There is no singleton — the `AppService` instance is passed
by reference through the call graph.

`applyConfigPatch(patch)` writes new values to `config.yaml`, invalidates caches,
and (if paths changed) re-opens the database at the new path.

---

## PLATFORM PATHS

Resolved by `loadConfig()` using Electrobun's `app.getPath('userData')`:

```ts
const userData = app.getPath('userData')  // ~/.config/app on macOS

const DEFAULT_PATHS = {
  configPath: path.join(userData, 'config.yaml'),
  dbPath:     path.join(userData, 'app.sqlite'),
  sourcesDir: path.join(userData, 'sources'),
}
```

---

## DESIGN SYSTEM — ANDROMEDA VOID

| Token           | Value     | Role                        |
| --------------- | --------- | --------------------------- |
| bg              | `#0b0e14` | App background              |
| surface         | `#121721` | Cards, panels               |
| accent-command  | `#5ecfbe` | Commands, primary actions   |
| accent-cheat    | `#a855f7` | Cheat-sheets                |
| accent-task     | `#ffae57` | Tasks                       |
| accent-bookmark | `#3399ff` | Bookmarks                   |
| radius          | `6px`     | All interactive controls    |
| shadow          | none      | Depth = tonal contrast only |

System font stack. No web fonts. No drop-shadows except floating overlays.

---

## CORRECTNESS PROPERTIES

| Property                       | Validates                 |
| ------------------------------ | ------------------------- |
| Sync idempotency               | V1-2                      |
| Stable ID across rebuilds      | V1-2                      |
| FTS consistency post-sync      | V1-3                      |
| Platform path resolution       | V1-1                      |
| RPC type safety                | Compile-time (TypeScript) |
| Renderer has no Bun APIs       | dependency-cruiser rules  |
| Task circular dep rejection    | V1-7 §8 (max depth 3)     |
| Task YAML write-back atomicity | V1-7 §2, §4               |

---

## TESTING STRATEGY

| Layer          | Approach                                                                          |
| -------------- | --------------------------------------------------------------------------------- |
| Core parsers   | Pure unit — data in, assertions out. No mocks.                                    |
| AppService     | In-memory `bun:sqlite` + Fishery `factoryFor(...)` rows                           |
| Elysia routes  | `server.handle(new Request(...))` — no real port                                  |
| Renderer       | React Testing Library + Happy-DOM; Eden Treaty via context double                 |
| Import service | Real YAML fixtures in `src/__tests__/fixtures/sample/` (5 curated files, ~10 app) |

See `app-testing` skill for patterns and gotchas.

---

## BUILD & PACKAGING

```ts
// electrobun.config.ts
import { defineConfig } from 'electrobun'

export default defineConfig({
  name: 'app',
  version: '0.1.0',
  main: './src/shell/main/main.ts',
  renderer: './src/shell/renderer/index.html',
  targets: ['darwin-arm64'],
})
```

Output: `.app` bundle (macOS), code-signed + notarized for Gatekeeper.

---

## REFERENCE IMPLEMENTATION (LEGACY WORKTREE)

The codebase was rebuilt from an orphan branch with phases re-committed in
sequence. A working **"ported from KodexB"** snapshot exists at commit
`cc3d08b` (`feat(lint): Add ast-grep to lint pipeline`). When implementing or
rewriting code in `src/shell/app/`, `src/shell/main/`, `src/shared/logging/`, or
the test infrastructure under `src/__tests__/`, **prefer this commit as the
authoritative reference** instead of digging through `git stash` entries (which
were created as nested supersets and are not reliable for per-phase recovery).

To inspect:

```bash
git worktree add ~/Work/bun/app_legacy cc3d08b
ls ~/Work/bun/app_legacy/src/shell/app/db/
```

Files in `cc3d08b` that are partially or fully reusable in upcoming phases:

| Phase | Path                                            | Notes                                                            |
| ----- | ----------------------------------------------- | ---------------------------------------------------------------- |
| 5     | `src/shell/app/app.ts`                          | AppService orchestrator (300 lines)                              |
| 5     | `src/shell/main/rpc/{host,requests,schemas}.ts` | Pre-Elysia RPC bridge — pattern reference for the Elysia rewrite |
| 5     | `src/shell/main/helpers/error.helper.ts`        | RPC error formatting                                             |
| 8     | `src/shell/main/window/state.ts`                | Window position persistence (V1-1 §4)                            |

Pending work that does **not** exist in legacy and must be net-new when the
consumer phase needs it:

- `src/shell/app/db/task.repository.ts` (Phase 9) — task dependency graph,
  `wouldCreateCycle`, `maxTaskOrder`. Operates on the `task_order`,
  `due_date`, and `depends_on` columns added in Phase 4.
- Hand-written TypeBox response schemas under `src/shared/rpc/schemas/`
  (Phase 5) — replace the `drizzle-typebox`-derived schemas the legacy
  branch never had. Reference: `KnowledgeRow` in `src/shell/app/db/schema.ts`.
- `tools/db/migrations/0001_*.sql` and a small in-process migration runner
  (≈ 30 lines) — added when the first real schema change lands. Phase 4
  uses an idempotent `CREATE TABLE IF NOT EXISTS` bootstrap and declares
  every Phase 5–8 column up-front, so no migration is required mid-roadmap.
- `assembleDoc()` integration in `import.service.ts` (Phase 7) — populate
  the `doc` column at sync time instead of on-demand at detail-view RPC.

Phase 4 lands the four design.md columns (`doc`, `task_order`, `due_date`,
`depends_on`) as nullable / defaulted up-front so consumer phases (5, 7, 9) can
start writing to them without a schema migration. Legacy code referenced by
those phases (e.g. `src/shell/app/lib/task_views.util.ts`) must be re-pointed
at hand-written TypeBox types instead of the legacy `@shared/rpc.TaskView`
import — `task_views.types.ts` (1-line literal union) is added in Phase 4.

---

## RELATED DOCS

- [requirements.md](requirements.md) — EARS feature specs (V1-1 through V1-8)
- [roadmap.md](roadmap.md) — Phase sequence and delivery order
- `docs/specs/<slug>/` — Per-feature SDD specs (generated by `sdd` skill)

---

## Decision: Observability

**Context:** kb debug and operational visibility was limited to `console.*`
with no per-request correlation or SQL tracing.

**Decision:** Adopt LogTape as the structured logging backbone with
a `LOG_LEVEL` environment-variable dial. Main process logging uses
`AsyncLocalStorage` for per-request context; renderer uses independent
configuration. DB instrumentation uses a typed statement wrapper.

**Outcome:** Debug logging is controllable via a single env var.
RPC requests are correlated by `requestId`. SQL queries are timed and
logged only when enabled. Default verbosity is unchanged.

**Roadmap items (deferred):** OpenTelemetry export, Sentry sink, file
sink, SQLite sink, renderer→main ferry, field-level redaction.

**Reference:** `assets/docs/archive/debugging/design.md`

---

## REFERENCES

[1]: https://bun.sh 'Bun'
[2]: https://www.typescriptlang.org 'TypeScript'
[8]: https://blackboard.sh/electrobun/docs/ 'Electrobun'
[9]: https://react.dev 'React'
[10]: https://elysiajs.com 'Elysia'
[11]: https://elysiajs.com/eden/treaty/overview 'Eden Treaty'
[12]: https://typebox.github.io 'TypeBox'
[15]: https://github.com/thoughtbot/fishery 'Fishery'
[16]: https://bun.com/docs/runtime/sqlite 'bun:sqlite'
