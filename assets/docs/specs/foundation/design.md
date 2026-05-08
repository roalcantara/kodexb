<!-- markdownlint-disable-file -->
# Design Document: kb Desktop

## OVERVIEW

**kb** is a macOS desktop knowledge-base app built on [Electrobun][8] and
[Bun][1]. It lets developers browse, search, and manage personal knowledge
entries (bookmarks, commands, cheat-sheets, tasks) stored as YAML files with
a local SQLite index.

The architecture is **Functional Core, Imperative Shell (FCIS)** extended with
a renderer zone:

| **Zone**         | **Location**            | **Rule**                                                  |
| ---------------- | ----------------------- | --------------------------------------------------------- |
| Functional Core  | `src/core/`             | Pure functions only. No I/O, no side-effects.             |
| Imperative Shell | `src/shell/`            | All I/O: DB, config, file system, RPC server.             |
| Shared           | `src/shared/`           | Pure utilities and shared types — no I/O.                 |
| Renderer (UI)    | `src/shell/renderer/`   | React browser app. Calls main via Eden Treaty client.     |

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
  that is structurally compatible with drizzle-typebox schemas.
- The same Elysia app runs over HTTP in the preview server (`tools/preview/server.ts`)
  without any mock shims — identical behaviour in dev and production.

**Files eliminated vs. the old approach:**

| Old                             | New equivalent                   |
|---------------------------------|----------------------------------|
| `src/shared/rpc/schema.ts`      | `RpcApp` type in `server.ts`     |
| `src/shell/main/rpc.host.ts`    | `src/shell/main/rpc/server.ts`   |
| `src/shell/renderer/rpc.client.ts` | Eden Treaty: `treaty<RpcApp>` |

### Decision 2 — TypeBox at the transport, Zod in the core

**Decision:** [TypeBox][12] (via Elysia's `t`) validates all incoming RPC
requests. [Zod][7] is restricted to `src/core/` (YAML parsing, domain
invariants) and `src/shell/app/db/import.service.ts` (config file parsing).

**Rationale:** TypeBox schemas are JSON-Schema-compatible and compose naturally
with drizzle-typebox. Zod in the transport layer creates dual-validation
overhead and import surface in the renderer bundle.

### Decision 3 — drizzle-typebox for schema unification

**Decision:** Transport-layer response shapes are derived from Drizzle table
definitions using [drizzle-typebox][13] (`createSelectSchema`,
`createInsertSchema`). Manual TypeBox objects are only written for shapes that
have no direct DB column equivalent.

**Rationale:** Keeps DB schema and RPC response shape in sync automatically;
reduces duplication between `db/schema.ts` and route definitions.

### Decision 4 — drizzle-seed for test fixtures

**Decision:** Test database fixtures are seeded with [drizzle-seed][14].
The `fishery` library is removed.

**Rationale:** drizzle-seed produces type-safe, schema-aware seed data without
a separate factory layer. Works with the in-memory SQLite databases used in all
integration tests.

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
│  src/shell/app/db/          — bun:sqlite + Drizzle             │
│  src/core/                  — pure domain logic               │
│                                                               │
│                │  Electrobun IPC  │                           │
│  ┌─────────────▼────────────────────────────────────────┐    │
│  │  BrowserWindow — src/shell/renderer/                  │    │
│  │  React app (pure browser JS, no Bun APIs)             │    │
│  │  Eden Treaty client: treaty<RpcApp>('kb-app')         │    │
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

export const rpc = treaty<RpcApp>('kb-app')
// Usage: const { data } = await rpc.list.get({ query: { limit: 20 } })
```

The renderer imports `rpc` from a path alias (`@rpc/client`). It never imports
from `src/shell/app/` or any Bun module directly.

---

## SCHEMA LAYERS

```
YAML files
  → js-yaml parse()
  → Zod validate (Knowledge schema)       ← domain invariants
  → derive stable id: crc32(type:key)
  → assembleDoc(entry)                    ← pure, no I/O
  → Drizzle upsert (knowledges table)

Query path:
  Elysia route receives request
  → TypeBox (t.*) validates query/body    ← transport boundary
  → AppService method (domain logic)
  → drizzle-typebox schema validates response shape
  → JSON over IPC → Eden Treaty client
```

Zod lives in `src/core/` and import service only. TypeBox lives at Elysia
route definitions only. They do not mix.

---

## STABLE IDENTITY

Entry IDs are deterministic: `crc32(type + ":" + yamlKey)`. Rebuilds never
change IDs. This makes deep links (`kb://entry/<id>`) stable across syncs.

---

## DATA LAYER

- **Engine:** SQLite via `bun:sqlite` + Drizzle ORM
- **Primary table:** `knowledges` — one row per entry
- **FTS5 virtual table:** `knowledges_fts` (content=knowledges, content_rowid=id)
- **`doc` column:** pre-assembled Markdown from `assembleDoc()` — read directly
  by the renderer via RPC
- **Schema file:** `src/shell/app/db/schema.ts`
- **Migrations:** `drizzle/` at project root (drizzle-kit)
- **Seed:** `src/shell/app/db/seed.ts` (drizzle-seed — used in tests and dev)

### drizzle-typebox integration

```ts
// src/shell/app/db/schema-types.ts
import { createSelectSchema } from 'drizzle-typebox'
import { knowledges } from './schema'

// Use in Elysia routes as the response schema — stays in sync with DB
export const SelectKnowledgeSchema = createSelectSchema(knowledges)
```

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
│   └── skills/                  # Project-specific agent skills
│       ├── kb-context/SKILL.md  # Always-loaded project context
│       ├── kb-rpc/SKILL.md      # Elysia + Eden Treaty patterns
│       ├── kb-testing/SKILL.md  # Testing conventions
│       └── kb-quality-gate/     # DoD gate + gate.sh script
├── assets/
│   └── docs/                    # design.md, requirements.md, roadmap.md
├── docs/
│   └── specs/                   # Per-feature SDD specs (generated by sdd skill)
│       └── <feature-slug>/
│           ├── requirements.md  # EARS format
│           ├── design.md        # Technical design
│           └── tasks.md         # 2-4h task breakdown
├── drizzle/                     # Drizzle migration files
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
│   │       └── validators/            # Zod schemas for YAML shapes
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
│       │       ├── schema.ts           # Drizzle table definitions
│       │       ├── schema-types.ts     # drizzle-typebox derived schemas
│       │       ├── index.ts            # openDatabase(path) — accepts :memory:
│       │       ├── import.service.ts   # YAML → SQLite pipeline
│       │       ├── entry.repository.ts # upsert, findAll, findById, FTS
│       │       ├── task.repository.ts  # task queries, dependency graph
│       │       └── seed.ts             # drizzle-seed (tests + dev)
│       ├── app/config/
│       │   └── config.loader.ts # loadConfig() — file I/O, js-yaml
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
│           │   └── client.ts    # treaty<RpcApp>('kb-app')
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
~/.config/kb/sources/**/*.yaml
  → fs.promises.readFile()       [import.service]
  → js-yaml parse()
  → Zod validate (Knowledge)     [src/core/domain/validators/]
  → derive stable id: crc32(type:key)
  → assembleDoc(entry)           [doc.builder.ts — pure]
  → Drizzle upsert               [entry.repository]
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

| Phase         | When emitted                           |
|---------------|----------------------------------------|
| `config_load` | After config file read + validated     |
| `sqlite`      | After each SQLite query                |
| `import`      | After each file processed during sync  |
| `cache_hit`   | Query served from in-memory cache      |
| `cache_miss`  | Cache bypassed, SQLite queried         |
| `rpc`         | Each RPC call (route + duration)       |

---

## WINDOW SIZING

| Width            | CSS class          | Panels visible                    |
|------------------|--------------------|-----------------------------------|
| < 1050 px        | `layout--compact`  | List only                         |
| ≥ 1050 px        | `layout--comfort`  | List + detail                     |
| ≥ 1300 px        | `layout--expanded` | List + detail + metadata sidebar  |

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
const userData = app.getPath('userData')  // ~/.config/kb on macOS

const DEFAULT_PATHS = {
  configPath: path.join(userData, 'config.yaml'),
  dbPath:     path.join(userData, 'kb.sqlite'),
  sourcesDir: path.join(userData, 'sources'),
}
```

---

## DESIGN SYSTEM — ANDROMEDA VOID

| Token            | Value     | Role                          |
|------------------|-----------|-------------------------------|
| bg               | `#0b0e14` | App background                |
| surface          | `#121721` | Cards, panels                 |
| accent-command   | `#5ecfbe` | Commands, primary actions     |
| accent-cheat     | `#a855f7` | Cheat-sheets                  |
| accent-task      | `#ffae57` | Tasks                         |
| accent-bookmark  | `#3399ff` | Bookmarks                     |
| radius           | `6px`     | All interactive controls      |
| shadow           | none      | Depth = tonal contrast only   |

System font stack. No web fonts. No drop-shadows except floating overlays.

---

## CORRECTNESS PROPERTIES

| Property                        | Validates                      |
|---------------------------------|--------------------------------|
| Sync idempotency                | V1-2                           |
| Stable ID across rebuilds       | V1-2                           |
| FTS consistency post-sync       | V1-3                           |
| Platform path resolution        | V1-1                           |
| RPC type safety                 | Compile-time (TypeScript)      |
| Renderer has no Bun APIs        | dependency-cruiser rules       |
| Task circular dep rejection     | V1-7 §8 (max depth 3)          |
| Task YAML write-back atomicity  | V1-7 §2, §4                    |

---

## TESTING STRATEGY

| Layer          | Approach                                                  |
|----------------|-----------------------------------------------------------|
| Core parsers   | Pure unit — data in, assertions out. No mocks.            |
| AppService     | In-memory SQLite + drizzle-seed fixtures                  |
| Elysia routes  | `server.handle(new Request(...))` — no real port          |
| Renderer       | React Testing Library + Happy-DOM; Eden Treaty via context double |
| Import service | Real YAML fixture files in `src/__tests__/fixtures/`      |

See `kb-testing` skill for patterns and gotchas.

---

## BUILD & PACKAGING

```ts
// electrobun.config.ts
import { defineConfig } from 'electrobun'

export default defineConfig({
  name: 'kb',
  version: '0.1.0',
  main: './src/shell/main/main.ts',
  renderer: './src/shell/renderer/index.html',
  targets: ['darwin-arm64'],
})
```

Output: `.app` bundle (macOS), code-signed + notarized for Gatekeeper.

---

## RELATED DOCS

- [requirements.md](requirements.md) — EARS feature specs (V1-1 through V1-8)
- [roadmap.md](roadmap.md) — Phase sequence and delivery order
- `docs/specs/<slug>/` — Per-feature SDD specs (generated by `sdd` skill)

---

## REFERENCES

[1]: https://bun.sh 'Bun'
[2]: https://www.typescriptlang.org 'TypeScript'
[3]: https://orm.drizzle.team 'Drizzle ORM'
[7]: https://zod.dev 'Zod'
[8]: https://blackboard.sh/electrobun/docs/ 'Electrobun'
[9]: https://react.dev 'React'
[10]: https://elysiajs.com 'Elysia'
[11]: https://elysiajs.com/eden/treaty/overview 'Eden Treaty'
[12]: https://typebox.github.io 'TypeBox'
[13]: https://github.com/drizzle-team/drizzle-typebox 'drizzle-typebox'
[14]: https://orm.drizzle.team/docs/seed-overview 'drizzle-seed'
