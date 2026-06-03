<!-- markdownlint-disable-file -->
# Architectural review — kb v0.10.0

**Status**: First-pass review · **Date**: 2026-06-01 · **Branch**: `release/v0.10.0`
**Scope**: Repository-wide structural audit of `src/`, `assets/`, and quality
tooling. Excludes runtime performance, security posture, and visual design.

---

## 1. Executive summary

kb is a small-to-mid sized desktop app (≈ 17.7k LOC across 333 source files,
24.8k graph edges) implemented as an Electrobun + Bun + React project on a
strictly enforced FCIS architecture. The structure is clean enough that
machine-checked layer rules (dependency-cruiser, ast-grep, `.ls-lint.yml`)
hold without `biome-ignore` escape hatches in production code. The
foundation design doc, the guides under `assets/guides/`, and three prior
audits (`codebase-best-practices-audit`, `codebase-quality-audit`,
`codebase-consolidation`) constitute an unusually mature self-reflective
record for a v0.x project.

**The architecture is healthy.** The dominant risks are not structural
fractures; they are the steady, low-energy cost of **conceptual duplication
at the seams between core schemas, shared transport types, and shell RPC
TypeBox**, plus a renderer that has out-grown its current "one-file-per-
concept" hook layout. None of these are blockers for v0.10.0. They are
maintenance costs that compound at the rate of feature work touching the
RPC surface, the list page, or the entry-type literal set.

**Top three concerns**, in priority order:

1. **Quadruple representation of the discriminated-union core domain**
   (`EntryType`, `TaskView`, task `status` / `priority`, page sizes) across
   core schemas, the `@shared/rpc` TS types, and `shell/main/rpc/schemas.ts`
   TypeBox. Each new variant requires four coordinated edits; the contract
   note in `desktop_rpc_schema.ts` openly acknowledges the drift surface.
2. **`shared/rpc/` is acting as a domain-types junk drawer**, not a
   transport surface. `TaskView`, `ListStats`, and `RpcListEntry` are
   domain concepts living under an `rpc` name, and `core/` reaches into
   `@shared/rpc` to import them. The dependency direction is technically
   legal but semantically inverted.
3. **`App` (`src/shell/app/app.ts`, 297-line class, 25+ methods)** is the
   single orchestrator for DB, sync, config, task CRUD, OS handoffs, and
   window control. The renderer has its mirror image: a 211-line
   `useListPageShell` composing 12+ child hooks across a `hooks/list/`
   directory of 27 files. Both are growing along the same axis (new
   feature → new method / new hook).

**Two notable assumptions challenged.** The user prompt mentioned a
concern that pure logic may have been pushed into the shell because it
sits adjacent to I/O. After auditing `shell/app/lib/` and
`shell/main/handoff/`, **this is not currently the dominant problem.**
The 2026 codebase-consolidation pass already moved tag ranking, task-view
predicates, and tag co-occurrence into `src/core/`. What remains in
`shell/app/lib/` is genuinely orchestration (it calls `findAll`, holds a
`Map` cache, formats a `ListStats` reply). The unresolved issue is the
**shape** of those payloads, not the location of the logic — a duplication
problem, not a layering problem.

---

## 2. Key strengths to preserve

### 2.1 Machine-enforced architecture

The FCIS rules are not aspirational documentation; they are tested:

- `dependency-cruiser` rejects `renderer → shell/app`, `shared → shell`,
  and route → repository imports.
- `.ls-lint.yml` ties every directory to a suffix vocabulary
  (`*.component.tsx`, `*.routes.ts`, `*.repository.ts`, …) so a misplaced
  file fails CI before it reaches review.
- Biome enforces snake_case on every dot-separated segment.
- `knip` errors on unused exports.

This is the single most valuable cultural asset in the repo. **Do not
relax these for convenience.** The recommendations below preserve every
guard.

### 2.2 Thin RPC routes

`src/shell/main/rpc/routes/` files are 13–31 lines each. Every route
validates with TypeBox, calls one `App` method, returns. This is exactly
the design-doc contract ("thin routes") and it works.

### 2.3 Direct `bun:sqlite` with typed prepared statements

The Decision-5 trade-off (raw SQL + `repositoryStmts` wrapper instead of
Drizzle) has aged well. FTS5 + `json_each` + `bm25` ordering in
`entry.repository.ts` would be painful through a generic ORM; here they
are direct SQL with explicit `KnowledgeRow` typing. No abstraction debt.

### 2.4 Single validation library

TypeBox everywhere (transport, config, core domain) — no Zod adapter, no
schema-dialect translation tax. The Fishery factory layer also rides on
TypeBox types via `factoryFor`.

### 2.5 Prior audits and the self-audit habit

Four spec directories (`codebase-best-practices-audit`,
`codebase-quality-audit`, `codebase-consolidation`, `foundation`) plus a
purpose-built `app-quality-gate` skill mean architectural discussions
happen in writing, not just in code. The codebase-consolidation pass
(44/44 tasks complete) demonstrably moved tag suggestion / task-view
predicates into `src/core/` and cut `utils/list/` from 17 modules to
their consolidated set. **This rhythm — periodic, scoped, evidence-
backed consolidation — is the right shape for kb's size.**

### 2.6 Same Elysia app in dev preview and production

`tools/preview/server.ts` runs the real `RpcApp` over HTTP with the same
TypeBox validation. There is no preview-only mock layer for the contract.
This is rare and worth preserving.

---

## 3. Architectural concerns, risks, and code smells

Each finding cites concrete evidence and is tagged with severity:

- **P1** — change-amplification or correctness risk; pay down before the
  next feature touching this surface.
- **P2** — cognitive-load and onboarding cost; pay down opportunistically.
- **P3** — local cleanups; queue for batch passes.

### P1. Quadruple representation of core discriminants

The same enumerations are redeclared in up to four places:

| Concept                 | Core schema                                                                                                                                | Core constant                                                                                              | Shared TS type                                                                                                                      | Shell RPC TypeBox                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Entry type discriminant | `entryTypeSchema` ([entry.schema.ts#L13](../../../../../src/core/domain/models/entries/schemas/entry.schema.ts#L13))                       | `ENTRY_TYPE_VALUES` ([entry.const.ts#L4](../../../../../src/core/domain/constants/entry.const.ts#L4))      | `types: Array<'bookmark' \| 'command' \| …>` ([desktop_rpc_schema.ts#L85](../../../../../src/shared/rpc/desktop_rpc_schema.ts#L85)) | `entryTypeSchema` re-built from `ENTRY_TYPE_VALUES` ([schemas.ts#L27-33](../../../../../src/shell/main/rpc/schemas.ts#L27)) |
| Task view               | `TASK_VIEW_ORDER` ([task_view_order.const.ts#L3](../../../../../src/core/domain/models/knowledges/task_views/task_view_order.const.ts#L3)) | —                                                                                                          | `TaskView = 'actionable' \| …` ([desktop_rpc_schema.ts#L80](../../../../../src/shared/rpc/desktop_rpc_schema.ts#L80))               | `taskViewValues` literal array ([schemas.ts#L18-26](../../../../../src/shell/main/rpc/schemas.ts#L18))                      |
| Task priority           | `taskEntrySchema` Type.Union ([entry.schema.ts#L27](../../../../../src/core/domain/models/entries/schemas/entry.schema.ts#L27))            | `TASK_PRIORITY_VALUES` ([entry.const.ts#L43](../../../../../src/core/domain/constants/entry.const.ts#L43)) | `'low' \| 'mid' \| 'high' \| 'urgent'` ([desktop_rpc_schema.ts#L141](../../../../../src/shared/rpc/desktop_rpc_schema.ts#L141))     | `priorityUnionSchema` ([schemas.ts#L75-80](../../../../../src/shell/main/rpc/schemas.ts#L75))                               |
| Task status             | `taskEntrySchema` ([entry.schema.ts#L28](../../../../../src/core/domain/models/entries/schemas/entry.schema.ts#L28))                       | `TASK_STATUS_VALUES` ([entry.const.ts#L46](../../../../../src/core/domain/constants/entry.const.ts#L46))   | `'todo' \| 'doing' \| 'done'` ([desktop_rpc_schema.ts#L149](../../../../../src/shared/rpc/desktop_rpc_schema.ts#L149))              | inline Type.Union in `taskUpdateSchema` ([schemas.ts#L103](../../../../../src/shell/main/rpc/schemas.ts#L103))              |
| Page size               | `DEFAULT_LIST_PAGE_SIZE = 50` ([default_page_size.const.ts#L2](../../../../../src/core/helpers/list_opts/default_page_size.const.ts#L2))   | —                                                                                                          | `25 \| 50 \| 100 \| 200` ([desktop_rpc_schema.ts#L110](../../../../../src/shared/rpc/desktop_rpc_schema.ts#L110))                   | `PAGE_SIZE_SMALL=25 …` redeclared ([schemas.ts#L5-13](../../../../../src/shell/main/rpc/schemas.ts#L5))                     |

[`config.schema.ts#L6-12`](../../../../../src/shell/app/config/config.schema.ts#L6-L12) **also** redeclares
the same four page-size constants for the YAML config. That is **four
copies** of `[25, 50, 100, 200]` and four copies of the entry-type tuple.

The contract note inside [`desktop_rpc_schema.ts#L23-39`](../../../../../src/shared/rpc/desktop_rpc_schema.ts#L23) explicitly
acknowledges the duplication and offloads drift detection to a test:

> The shared types are intentionally hand-written because:
> 1. src/shared/ must not import from src/shell/ (FCIS).
> 2. The renderer imports shared types for Eden Treaty typing;
>    TypeBox schemas live in shell/main/ for transport validation.
> 3. Route-contract tests in src/shell/main/rpc/schemas.spec.ts
>    assert that valid payloads match both the schema and the
>    shared type's shape, catching drift at test time.

This is a workable solution but it pays the cost of drift forever. The
premise — that `shared/` cannot import a TypeBox schema from `shell/` — is
correct. The real fix is to **own the literal tuples in `@core` and have
every other layer derive from them**. `shell/main/rpc/schemas.ts` already
imports `ENTRY_TYPE_VALUES` from `@core/domain/constants`; it just
re-builds a five-position Type.Union by hand instead of mapping the
tuple. The same pattern works for `TASK_VIEW_ORDER`,
`TASK_PRIORITY_VALUES`, `TASK_STATUS_VALUES`, and the four-element page-
size tuple.

**Why this matters now**: every variant added (a sixth entry type, a
seventh task view, a 500-row page size) is at least four coordinated
edits across two layers. Forgetting one fails a test but produces
confusing error messages when narrowing fails at the renderer.

### P1. `@shared/rpc` is masquerading as transport

`src/shared/rpc/desktop_rpc_schema.ts` is the only file in `shared/rpc/`
(plus `index.ts`). It defines:

- `RpcKnowledge` (literally `= Knowledge`)
- `RpcListEntry` (Knowledge + frecency)
- `RpcDbStats`, `RpcGetConfigPayload`, `RpcImportResult`, `RpcSyncFileResult`,
  `RpcSyncProgressPayload`
- `TaskView`, `ListOpts`, `ListStats`, `ConfigPatch`, `OpenDialogOpts`,
  `PreviewImageResult`, `BindingRef`, `TaskCreateInput`, `TaskUpdateInput`
- `DesktopRpcSchema` Electrobun bridge contract

`TaskView` and `ListStats` are not transport concepts. They are domain
concepts that happen to be returned over RPC. Yet [`task_view_order.const.ts#L1`](../../../../../src/core/domain/models/knowledges/task_views/task_view_order.const.ts#L1) imports
`TaskView` *from `@shared/rpc`*:

```ts
import type { TaskView } from '@shared/rpc'
export const TASK_VIEW_ORDER: TaskView[] = ['actionable', 'today', …]
```

This is legal under the FCIS rules (`shared → all`), but the
**meaning** is wrong: a domain concept's home is core, and the RPC layer
should reference it. Today the arrow points the other way.

A second symptom: the `Rpc*` prefix carries no information. `RpcKnowledge
= Knowledge` is a synonym; `RpcListEntry` is `Knowledge & {frecency, visits}`.
Renaming throughout to drop the prefix would remove a meaningless
distinction from every import site.

### P1. `App` class growth and method spray

[`src/shell/app/app.ts`](../../../../../src/shell/app/app.ts) is the largest production file (342 lines,
297-line class). It now exposes **31 public methods** spanning seven
distinct responsibilities:

- catalog reads (list, listMatchCount, getEntry, suggestTags, ...)
- frecency writes (recordEntryVisit, recordBindingVisit)
- bindings (listBindings, listBindingsByChord)
- list-stats (getListStats, getStats)
- config (getConfig, getSyncInfo, applyConfigPatch)
- task CRUD (createTask, updateTask, deleteTask, cycleStatus, cyclePriority, reorderTask)
- OS surface (openExternal, pasteInTerminal, runInTerminal, pasteDoc,
  openInEditor, showOpenDialog, fetchPreviewImage, resizeWindow,
  hideWindow, getWindowPosition, setWindowPosition, quit, sync)

The `shellDelegates` extraction (via `createAppShellDelegates`) shows the
problem was felt — Biome `file-length` lint pressure forced 11 methods
out into [`app_shell_surface.util.ts`](../../../../../src/shell/app/lib/app_shell_surface.util.ts). But the result is **eleven
near-identical `try / resolve / reject` Promise wrappers around hook
calls** ([app_shell_surface.util.ts#L9-114](../../../../../src/shell/app/lib/app_shell_surface.util.ts#L9)) — a layer of boilerplate that
exists only because the underlying `AppShellHooks` use synchronous-with-
exceptions semantics while `App` promises async. This is a textbook
adapter shape; right now it is hand-rolled 11 times.

`App` itself is acting as **three separate services bundled into one
class**: a Catalog service (reads + frecency + suggestions), a TaskCrud
service (create/update/delete/cycle/reorder + YAML write-back), and a
ShellSurface façade (delegates only). The DB connection cache, list-stats
cache, and `dbStatsCache` belong with Catalog; the sync mutex belongs
with the importer; the OS handoffs belong with ShellSurface.

**This is not a "split the god class today" rebuke.** App.ts works.
But every new feature adds another method, and the cohesion of the
"single orchestrator" idea is eroding.

### P2. Renderer hook fragmentation under `hooks/list/`

27 hooks in [`src/shell/renderer/hooks/list/`](../../../../../src/shell/renderer/hooks/list) — that is more files than
the renderer has list components (12). [`useListPageShell`](../../../../../src/shell/renderer/hooks/list/use_list_page_shell.hook.ts) (211 lines) is
the orchestration root and composes 12+ child hooks; it carries a
`biome-ignore lint/complexity/noExcessiveLinesPerFunction` suppression at
[line 23](../../../../../src/shell/renderer/hooks/list/use_list_page_shell.hook.ts#L23). The codebase-consolidation pass already merged the
`use_compact_filter_overlay_*` family (down to 2) and the
`utils/list/` directory (down to 7 files); the same pressure is now
visible in the hooks layer.

Observed sub-problems:

- **Single-caller hooks**: `use_list_surface_keydown.hook.ts`,
  `use_list_surface_wheel_scroll.hook.ts`,
  `use_list_surface_scroll_restore.hook.ts` are each consumed only by
  `useListPageShell`. They are extracted purely for file-length lint
  relief, not for reuse.
- **Hook-shaped pure data**: `list_sync_complete_toast.util.ts`,
  `list_sync_message_handlers.util.ts` live under `hooks/list/` but are
  not hooks. The `.ls-lint.yml` contract says `hooks/` is the home of
  `use_*.hook.ts(x)`; these `.util.ts` files weaken that signal.
- **`ListMain` component** ([list_main.component.tsx#L34-L301](../../../../../src/shell/renderer/components/list/list_main.component.tsx#L34), 268 lines)
  exists because the page-shell hook's outputs are spread inline into a
  monolithic component. The orchestration pressure has not been split;
  it has been pushed across the hook/component boundary.

### P2. Redundant fields in `ListStats`

[`ListStats`](../../../../../src/shared/rpc/desktop_rpc_schema.ts#L91) carries:

```ts
export type ListStats = {
  total: number
  bookmark: number
  command: number
  cheat: number
  shortcut: number
  task: number
  taskViews: Record<TaskView, number>
  tags: Record<string, number>
  byType: Record<string, number>
}
```

`bookmark/command/cheat/shortcut/task` and `byType` carry the same data.
Both builders ([`buildListStats`](../../../../../src/shell/app/lib/app_list_stats.util.ts#L17), [`buildListStatsForFilters`](../../../../../src/shell/app/lib/app_list_stats_for_filters.util.ts#L62)) populate
each field twice. Any new entry type means editing two output shapes,
two builders, and the renderer consumers. Pick `byType` and delete the
explicit five fields; the renderer can read `byType.bookmark`.

### P2. `app_shell_surface.util.ts` is 11 Promise wrappers

Already covered above under "App class growth." Calling out
separately because the fix can land independently: replace the 11
`new Promise((resolve, reject) => { try { hooks.foo?.(...) ; resolve() } catch (e) { reject(...) } })`
blocks with a single generic helper, or — better — change `AppShellHooks`
so the hooks themselves return `Promise<void>`. Either path collapses
~80 lines to ~20.

### P3. Constant directories are scattered and partially empty

| Directory                       | Files                                                                                                  | Purpose                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `src/core/constants/`           | `app.const.ts` (version), `defaults.const.ts` (config paths), `lang.const.ts`                          | App-wide                                        |
| `src/core/domain/constants/`    | `entry.const.ts`, `key.const.ts`                                                                       | Domain enums                                    |
| `src/shared/constants/`         | `binding_frecency_weight.const.ts`, `quick_lookup_row_limit.const.ts`                                  | "Shared between core and shell, but not domain" |
| `src/shell/renderer/constants/` | `entry_type_icon_basename`, `filter_labels`, `icons`, `layout`, `page_size`, `tag_brand_svg_map`, `ui` | Renderer-only constants                         |

The four-way split is over-engineered for this scale. `core/constants/`
holds three modules (semver, default paths, language list) that do not
really group; `shared/constants/` holds two modules. **`core/handoff/`**
is even more striking — a top-level directory inside core holding a
single `known_browsers.const.ts`. **`core/validation/`** holds one
TypeBox helper plus an index re-export. These are real concepts but
they are not "directories" in any useful sense.

### P3. `core/domain/constants/key.const.ts` (216 lines) is the biggest constants file

The keyboard taxonomy file conflates KeyModifier values, glyph maps for
macOS/Linux, alias maps, the KEY_GLYPHS table, precedence tables, and
type narrowing helpers. It is 216 lines of mostly data with several
small functions inline. Splitting along the seams (modifiers / glyphs /
aliases) or extracting the function set into a sibling
`key.glyphs.util.ts` would reduce cognitive load when adding a new key.

### P3. The `Rpc*` prefix is purely decorative

Every type prefixed `Rpc` either equals a `@core` type
(`RpcKnowledge = Knowledge`), adds two scalar fields (`RpcListEntry`),
or is a brand-new payload that has no non-RPC counterpart (`RpcSyncProgressPayload`).
The prefix is doing no disambiguation work and adds three characters to
every import. Either drop it everywhere or restrict it to types that
genuinely differ from the domain shape.

### P3. `entry.repository.ts` `findAll` post-filter on `types`

[`entry.repository.ts#L219-221`](../../../../../src/shell/app/db/entry.repository.ts#L219):

```ts
if (query && types && types.length > 0) {
  list = list.filter(entry => types.includes(entry.type))
}
```

The FTS5 path does not push `types` into the SQL `WHERE` (only the plain
path does). For a YAML-fixture-sized dataset this is invisible; for
real-world usage with thousands of entries and a search-with-type-filter
query, it materialises the whole match set into memory. Cheap to fix when
the right SQL touches it.

---

## 4. Opportunities for simplification

| #   | Simplification                                                                                                                                                                                                      | Effect                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| S1  | Single-source the entry-type / task-view / priority / status tuples in `@core/domain/constants` and **derive** the TypeBox unions and TS types from them throughout.                                                | One owner per discriminant; deletes ~30 hand-redeclarations.          |
| S2  | Single-source the page-size tuple in `@core/helpers/list_opts` (or a new `@core/constants/pagination.const.ts`). Have `config.schema.ts`, `rpc/schemas.ts`, and `renderer/constants/page_size.const.ts` all derive. | Removes 3 separate `25 \| 50 \| 100 \| 200` redeclarations.           |
| S3  | Replace 11 hand-rolled Promise wrappers in `app_shell_surface.util.ts` with one generic `asPromise(fn)` helper, or switch `AppShellHooks` to async signatures.                                                      | ~60 LOC deleted; one adapter shape instead of eleven copies.          |
| S4  | Drop the `bookmark/command/cheat/shortcut/task` explicit fields from `ListStats`; keep only `byType`.                                                                                                               | Removes per-type editing in two places when a new entry type lands.   |
| S5  | Drop the `Rpc*` prefix on types that equal their core counterpart (`RpcKnowledge`, `RpcListEntry`). Rename to `Knowledge`, `ListEntry`.                                                                             | Less visual noise at every renderer import.                           |
| S6  | Inline the four single-caller list hooks (`use_list_surface_*`) into `useListPageShell` or split `useListPageShell` into 2-3 coherent hooks with named return shapes.                                               | Either path resolves the "27 files of which 8 are 1-caller" pressure. |
| S7  | Move `list_sync_complete_toast.util.ts` and `list_sync_message_handlers.util.ts` out of `hooks/list/` into `utils/list/`.                                                                                           | Restores the "`hooks/` only contains hooks" invariant.                |
| S8  | Collapse `core/constants/`, `core/handoff/`, `core/validation/`, `shared/constants/` into the directories where their content already belongs (or into one `core/lib/`).                                            | Fewer 1–2 file folders; reduces nav depth for newcomers.              |

---

## 5. Opportunities for consolidation

### 5.1 Domain enum ownership

Promote `core/domain/constants/entry.const.ts` to the **only** source of
truth for the entry-type / task-priority / task-status literal tuples,
and `core/domain/models/knowledges/task_views/task_view_order.const.ts`
for `TaskView`. Provide a tiny helper:

```ts
// src/core/domain/constants/typebox.helper.ts (or add to validation/)
export const typeUnion = <T extends readonly string[]>(values: T) =>
  Type.Union(values.map(v => Type.Literal(v)))
```

Then in [`shell/main/rpc/schemas.ts`](../../../../../src/shell/main/rpc/schemas.ts):

```ts
import { ENTRY_TYPE_VALUES, TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from '@core/domain/constants'
import { TASK_VIEW_ORDER } from '@core/domain/models/knowledges/task_views/task_view_order.const'
import { typeUnion } from '@core/domain/constants/typebox.helper'

const entryTypeSchema = typeUnion(ENTRY_TYPE_VALUES)
const taskViewSchema = typeUnion(TASK_VIEW_ORDER)
const priorityUnionSchema = typeUnion(TASK_PRIORITY_VALUES)
const taskStatusSchema = typeUnion(TASK_STATUS_VALUES)
```

And in [`shared/rpc/desktop_rpc_schema.ts`](../../../../../src/shared/rpc/desktop_rpc_schema.ts) derive the TS literal types
from the same tuple:

```ts
import type { ENTRY_TYPE_VALUES, TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from '@core/domain/constants'
import type { TASK_VIEW_ORDER } from '@core/domain/models/knowledges/task_views/task_view_order.const'

type EntryType = (typeof ENTRY_TYPE_VALUES)[number]
type TaskView  = (typeof TASK_VIEW_ORDER)[number]
type Priority  = (typeof TASK_PRIORITY_VALUES)[number]
type Status    = (typeof TASK_STATUS_VALUES)[number]
```

The contract note in `desktop_rpc_schema.ts` becomes obsolete; the drift-
detection test can be deleted.

### 5.2 Pull domain-shaped types out of `@shared/rpc`

`TaskView`, `ListOpts`, `ListStats`, `TaskCreateInput`, `TaskUpdateInput`
are domain concepts. Move them to `@core/domain/` (most likely
`@core/domain/models/knowledges/` and a new `@core/domain/queries/` or
`@core/domain/list/` for `ListOpts`/`ListStats`). Leave in
`@shared/rpc/`:

- `RpcCallParams`, `RpcCallResponse`, `DesktopRpcSchema`,
  `RpcSyncProgressPayload`, `RpcSyncFileResult`, `RpcImportResult`,
  `OpenDialogOpts`, `RpcGetConfigPayload`, `RpcDbStats`,
  `BindingRef`, `PreviewImageResult`

That set is genuinely transport-shaped. The current arrow inversion
(`core` importing `TaskView` from `@shared/rpc`) disappears.

### 5.3 Split `App` along its three responsibilities

The shape is already visible. A possible target:

```
src/shell/app/
  catalog.service.ts        // list, listMatchCount, getEntry, getListStats,
                            // getStats, suggestTags, recordEntryVisit,
                            // listBindings, listBindingsByChord,
                            // recordBindingVisit. Owns listCache + dbStatsCache.
  tasks.service.ts          // createTask, updateTask, deleteTask,
                            // cycleStatus, cyclePriority, reorderTask.
                            // Owns the YAML write-back path.
  sync.service.ts           // sync, getSyncInfo, syncInFlight guard.
  config.service.ts         // getConfig, applyConfigPatch, saveConfig.
  shell_surface.service.ts  // OS handoffs (already 80% extracted).
  app.ts                    // Composition root: holds the 5 services,
                            // exposes a stable handle for RPC routes.
```

Routes already group along these seams (`catalog.routes.ts`,
`task.routes.ts`, `handoff.routes.ts`, `config_sync.routes.ts`,
`shell.routes.ts`). The shell façade can keep its current method names by
re-exporting; the services own the state and the logic.

This is the **highest cost** recommendation in this report. It is also
the one whose value compounds most as the app grows. Suggest deferring
to v0.11 or v0.12.

### 5.4 Hook-layer consolidation, second pass

The codebase-consolidation pass already collapsed several hook clusters.
Two patterns remain that the same playbook handles:

- **Inline `use_list_surface_*` (3 single-caller hooks) into
  `useListPageShell`.** They are 8–20 line `useEffect` wirings extracted
  for file-length lint relief, not for reuse. The function-length
  `biome-ignore` on `useListPageShell` is already in place; absorbing
  these adds < 40 lines.
- **Split `useListPageShell` into two coherent hooks**: one for
  **selection + navigation + keyboard** (sel, view nav, surface keydown,
  task keyboard), one for **data + filter + sync** (rows, palette,
  filter, sync UI). The current shell hook touches both axes; the
  consumer (`ListPage` / `ListMain`) can compose the two cleanly.

Either path works; the second is more invasive but yields more durable
boundaries.

### 5.5 Constant directories

A pragmatic target:

```
src/core/constants/         keep app.const.ts, defaults.const.ts here
src/core/domain/constants/  keep entry.const.ts, key.const.ts here
src/core/lib/               new: absorbs validation/typebox.helper.ts,
                            handoff/known_browsers.const.ts,
                            lang.const.ts (which is generic, not app-specific)
```

Drop `src/shared/constants/`: move
`binding_frecency_weight.const.ts` to `@core/domain/constants` (it's a
domain weight) and `quick_lookup_row_limit.const.ts` to
`@shell/renderer/constants/` (it's a UI cap).

---

## 6. Recommendations by priority and ROI

Each recommendation lists evidence, expected effort (S/M/L), expected
impact, and any prerequisites.

### Tier A — High impact, low effort (do these next)

| #   | Recommendation                                                                                                                                                      | Effort | Impact | Evidence                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | -------------------------------------- |
| A1  | Add `typeUnion()` helper in `@core/domain/constants`; rebuild four discriminants in `rpc/schemas.ts` from the core tuples.                                          | S      | High   | §3 P1 (quadruple representation), §5.1 |
| A2  | Single-source the page-size tuple (`@core/constants/pagination.const.ts`); derive in `config.schema.ts`, `rpc/schemas.ts`, `renderer/constants/page_size.const.ts`. | S      | High   | §3 P1 four-row page-size table         |
| A3  | Delete `bookmark/command/cheat/shortcut/task` from `ListStats`; keep only `byType`. Update two builders + renderer consumers.                                       | S      | Medium | §3 P2                                  |
| A4  | Replace 11 Promise wrappers in `app_shell_surface.util.ts` with a single `asPromise()` helper.                                                                      | S      | Medium | §3 P2                                  |
| A5  | Move `list_sync_complete_toast.util.ts` and `list_sync_message_handlers.util.ts` from `hooks/list/` to `utils/list/`.                                               | S      | Low    | §3 P2                                  |
| A6  | Drop the `Rpc*` prefix on `RpcKnowledge` and `RpcListEntry` (rename to `Knowledge`, `ListEntry`).                                                                   | S      | Low    | §3 P3                                  |

### Tier B — High impact, high effort (plan for v0.11)

| #   | Recommendation                                                                                                                                                                                                  | Effort | Impact | Evidence                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | --------------------------------------- |
| B1  | Pull domain types (`TaskView`, `ListOpts`, `ListStats`, `TaskCreateInput`, `TaskUpdateInput`) out of `@shared/rpc` into `@core/domain/`. Renderer keeps `@shared/rpc` for genuine transport types only.         | M      | High   | §3 P1 (`shared/rpc` masquerading), §5.2 |
| B2  | Split `App` into 5 services (`Catalog`, `Tasks`, `Sync`, `Config`, `ShellSurface`). `app.ts` becomes the composition root. Route files keep their current import surface via thin re-exports during transition. | L      | High   | §3 P1 (App growth), §5.3                |
| B3  | Hook-layer second-pass consolidation: inline `use_list_surface_*` single-caller hooks; consider splitting `useListPageShell` into 2 coherent shells.                                                            | M      | Medium | §3 P2 (hook fragmentation), §5.4        |

### Tier C — Nice to have (queue for batch passes)

| #   | Recommendation                                                                                                                                                                | Effort | Impact                  | Evidence                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------- | ------------------------------ |
| C1  | Collapse `core/handoff/`, `core/validation/`, `shared/constants/` into existing parent directories or a new `core/lib/`.                                                      | S      | Low                     | §3 P3, §5.5                    |
| C2  | Split `core/domain/constants/key.const.ts` (216 lines) along modifier / glyph / alias seams.                                                                                  | S      | Low                     | §3 P3                          |
| C3  | Push `types` filter into the FTS5 `WHERE` in `entry.repository.findAll`.                                                                                                      | S      | Medium-if-large-dataset | §3 P3                          |
| C4  | Refresh stale `.cursor/rules/` files (memory note: imported from another project, stale module paths).                                                                        | S      | Low                     | memory `cursor_rules_outdated` |
| C5  | Refresh the legacy reference-implementation section in `foundation/design.md` (it still mentions the `KodexB` worktree at `cc3d08b` from pre-Phase-5; mostly historical now). | S      | Low                     | design.md:643–690              |

---

## 7. Refactoring roadmap

The Tier A items are independent, can land in any order, and individually
pay back within one or two commits. They are the recommended next
sprint of architectural maintenance after v0.10.0 ships.

```
v0.10.0 (current)
  └─ release as planned. No architectural blockers.

v0.10.x — Tier A consolidation sweep (1 PR per item, ~1-3 days total)
  ├─ A1 Single-source discriminants via typeUnion()
  ├─ A2 Single-source page-size tuple
  ├─ A3 Drop redundant ListStats per-type fields
  ├─ A4 Generic asPromise() in app_shell_surface
  ├─ A5 Relocate non-hook utilities out of hooks/list/
  └─ A6 Drop Rpc* prefix on alias types

v0.11.0 — Tier B Phase 1 (domain types out of shared/rpc)
  └─ B1 Move TaskView / ListOpts / ListStats / Task*Input into core/domain/
        Test: routes still typecheck; eden treaty client still inferred.

v0.11.x — Tier B Phase 2 (App split — incremental)
  ├─ Extract CatalogService (list, getEntry, getListStats, suggestTags,
  │   recordEntryVisit, bindings*). Move listCache + dbStatsCache here.
  ├─ Extract TasksService (createTask/updateTask/deleteTask/cycle*/reorder).
  ├─ Extract SyncService (sync + syncInFlight mutex + emit).
  ├─ Extract ConfigService (getConfig + applyConfigPatch).
  └─ Reduce app.ts to a composition root that exposes the legacy method
     names by delegation. RPC routes never see the change.

v0.11.x — Tier B Phase 3 (renderer hook second pass)
  ├─ Inline use_list_surface_keydown / wheel_scroll / scroll_restore.
  └─ (Optional) Split useListPageShell into selection-shell +
     data-filter-shell.

v0.12.x — Tier C polish
  ├─ C1 Constant-folder consolidation
  ├─ C2 key.const.ts split
  ├─ C3 SQL types push-down (gated on real-world dataset signal)
  ├─ C4 .cursor/rules refresh
  └─ C5 foundation/design.md legacy-section refresh
```

### Guardrails to add as the work lands

Each tier introduces opportunities to convert "we agreed" into "the tool
enforces":

- After **A1**, add an `ast-grep` rule that flags any literal
  `'bookmark' | 'command' | 'cheat' | 'shortcut' | 'task'` union outside
  `core/`.
- After **B1**, the `shared → core` import direction can flip in
  `dependency-cruiser`: `@shared/rpc` becomes a leaf of `@core/domain/`
  for domain types.
- After **B2**, raise the per-class line cap (`noExcessiveLinesPerFunction`
  / file-length) on `shell/app/` so the temptation to extract via
  `app_*.util.ts` files disappears.

---

## 8. Assumptions challenged

The brief asked for challenge where appropriate. Two challenges:

1. **"Logic may have been pushed to the shell because it's adjacent to
   I/O."** Audited. Not currently the dominant problem — the 2026
   codebase-consolidation pass already relocated tag ranking, task-view
   predicates, and tag co-occurrence into `@core/domain/`. The
   `shell/app/lib/` files that remain (`app_list_query`, `app_list_stats`,
   `app_list_stats_for_filters`, `list_stats_tag_facets`, `app_sync`,
   `app_task_source`, `app_preview_fetch`) all genuinely call into
   `bun:sqlite` or `node:fs`. **The unresolved issue is not where the
   logic lives but where the *shapes* (ListStats, TaskView, EntryType)
   live**, which is §3 P1.

2. **"The codebase needs Rails-style conventions to reduce incidental
   complexity."** Partial agreement. kb already has strong conventions
   — the `.ls-lint.yml` suffix vocabulary is doing Rails-shaped work
   ("controller_test.rb" ↔ "*.routes.spec.ts"). What is missing is **a
   convention for *deriving* TypeBox schemas, TS types, and runtime
   tuples from a single tuple owner**. Adopting a 6-line `typeUnion()`
   helper and a documented pattern ("the tuple lives in `core/`;
   schema/transport derive") would give the Rails-like wins (delete a
   line of code, get the unions automatically) without abandoning the
   FCIS guardrails. That is the practical Rails-influence opportunity
   here, and it falls out of Tier A.

A third point was *not* raised in the brief but is worth noting:
**the audit cadence itself is the strongest convention in this repo.**
Four prior audits, each with `report.md` + `requirements.md` + `tasks.md`
+ `handoff.md`, completed and ticked off, is what got `shell/app/lib/`
into its current healthy state. The recommendations above assume that
cadence continues.

---

## 9. References

- [foundation/design.md](../../foundation/design.md) — FCIS architecture, RPC contract, Decisions 1–5
- [foundation/roadmap.md](../../foundation/roadmap.md) — phase sequence
- [codebase-consolidation/report.md](../../codebase-consolidation/report.md) — preceding consolidation audit (44/44 done)
- [codebase-best-practices-audit/report.md](../../codebase-best-practices-audit/report.md) — guards + tests pass
- [codebase-quality-audit/requirements.md](../../codebase-quality-audit/requirements.md) — suppression cleanup
- Guides: [CODESTYLE](../../../../guides/CODESTYLE_GUIDE.md), [FCIS](../../../../guides/FCIS.guide.md), [DoD](../../../../guides/DoD.md), [TESTING](../../../../guides/TESTING_GUIDE.md)

### Evidence inventory

- Total non-spec source files: 333; test files: 194.
- LOC by layer: `core` 2,604 · `shared` 712 · `shell/app` 2,199 · `shell/main` 1,679 · `shell/renderer` 10,533.
- CRG graph: 4,320 nodes, 24,795 edges, 11 communities, 4 cross-community edges, 0 architecture warnings.
- Largest production files: [app.ts](../../../../../src/shell/app/app.ts) 342, [rpc/client.ts](../../../../../src/shell/renderer/rpc/client.ts) 314, [list_main.component.tsx](../../../../../src/shell/renderer/components/list/list_main.component.tsx) 302, [use_view_navigation.hook.ts](../../../../../src/shell/renderer/hooks/list/use_view_navigation.hook.ts) 277, [entry.repository.ts](../../../../../src/shell/app/db/entry.repository.ts) 261.
- Largest constant file: [key.const.ts](../../../../../src/core/domain/constants/key.const.ts) 216 lines.
