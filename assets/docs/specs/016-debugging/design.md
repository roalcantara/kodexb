<!-- markdownlint-disable-file -->
# Debug logging mode — Design

## Overview

This change adds a verbosity-dialed, context-aware logging pipeline to kb,
built on LogTape. The dial is the `LOG_LEVEL` environment variable read once
at main process startup. At default verbosity nothing changes for end users;
at `verbose` the app emits Rails-style RPC start/complete lines; at `debug`
every SQL query is logged with full text, duration, and row count; at
`trace` SQL bind values and first-row representations are also logged.

The implementation has four parts:

1. **Two configuration entry points** — `configureMainLogging()` for the Bun
   main process (sinks, context storage, sink fan-out by `LOG_LEVEL`) and
   `configureRendererLogging()` for the React renderer (single console sink,
   hardcoded level by `NODE_ENV`).
2. **An Elysia plugin bundle** — `rpcCommonPlugins` composes the existing
   `rpcErrorContract` with a new `rpcLogger` plugin. The bundle is used by
   `createRpcServer` (production) and `tools/preview/server.ts` (preview).
   The plugin binds `requestId`, `action`, `method`, `path` to Logtape's
   `contextLocalStorage`, so every downstream `getLogger([...]).info|debug(…)`
   call inside the handler chain inherits those fields.
3. **A DB statement wrapper** — `repositoryStmts(db, '<Noun>', { …sql })`
   returns a typed bag of instrumented prepared statements. Each method
   (`.all`, `.get`, `.run`, `.values`) is timed via `performance.now()` and
   emits one `debug` record on `['kb', 'sqlite']` with the full SQL on the
   continuation line. At `trace` it additionally logs bind values and a
   Rails-style representation of the first result row.
4. **A call-site migration** — every `createLogger(...)` call in `src/`
   becomes `getLogger([...])`. The existing `createLogger` wrapper and its
   spec are deleted. The barrel `src/shared/logging/index.ts` re-exports
   the new public surface.

The renderer is independent of main: no cross-process ferry, no
`X-Request-Id` propagation from renderer to main, no `LOG_LEVEL` reading in
the webview. The renderer category prefix `['kb', 'ui', …]` keeps the door
open for a future ferry without renames.

## Architecture & layout

All logging code lives under `src/shared/logging/`. No new top-level
directory is introduced.

Lifecycle:

- `configureMainLogging()` runs as the **first import-time side effect** in
  `src/shell/main/main.ts`. It is the only module that reads `LOG_LEVEL`
  in this spec.
- `configureRendererLogging()` runs as the **first executable statement** in
  `src/shell/renderer/app.tsx`, ahead of `react-dom/client`. It is the only
  module that reads `process.env.NODE_ENV` for the renderer dial in this
  spec.
- Both configure functions are idempotent via a private `configured`
  boolean. Calling them again is a no-op (HMR-safe).

The main process uses `node:async_hooks.AsyncLocalStorage` to thread
`requestId` and the other context fields through `await` boundaries inside
RPC handlers. The renderer cannot use `node:async_hooks` (unavailable in
the webview runtime) and has no per-request boundary in this spec, so it
omits `contextLocalStorage` entirely.

## Public APIs

The new surface exported from `src/shared/logging/index.ts`:

| Symbol                     | Kind          | Purpose                                                                                                   |
| -------------------------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| `getLogger`                | function      | Re-export of `@logtape/logtape`'s `getLogger`. Categories begin with `['kb', '<area>', …]`.               |
| `withContext`              | function      | Re-export of `@logtape/logtape`'s `withContext`. Used by `rpcLogger` and by any future caller.            |
| `isEnabledFor`             | function      | Re-export of Logtape's level-gate helper. Used by `repositoryStmts` to short-circuit at default.          |
| `configureMainLogging`     | function      | Calls `configureSync({ … })`. Reads `LOG_LEVEL`. Registers fingers-crossed at default; plain at verbose+. |
| `configureRendererLogging` | function      | Calls `configureSync({ … })`. Hardcodes `info` (dev) / `warning` (prod).                                  |
| `parseLogVerbosity`        | function      | Pre-existing helper from `log_verbosity.ts`. Returned shape unchanged.                                    |
| `LogVerbosity`             | type          | Pre-existing union from `log_verbosity.ts`. Unchanged.                                                    |
| `repositoryStmts`          | function      | `<R, P>(db, noun, sqlMap) => InstrumentedStmtBag`. Section "DB instrumentation".                          |
| `rpcCommonPlugins`         | Elysia plugin | Composed plugin bundle (`rpcErrorContract` + `rpcLogger`). Mounted by both servers.                       |
| `rpcErrorContract`         | Elysia plugin | Moved from `src/shell/main/rpc/server.ts`. Behavior unchanged.                                            |

The removed surface:

| Symbol                          | Removed in | Replacement                       |
| ------------------------------- | ---------- | --------------------------------- |
| `createLogger(name)`            | Phase D    | `getLogger(['kb', '<area>', …])`. |
| `console.logger.ts` (file)      | Phase D    | Deleted; barrel updated.          |
| `console.logger.spec.ts` (file) | Phase D    | Deleted.                          |

## Verbosity dial

`LOG_LEVEL` is read exactly once, inside `configureMainLogging()`. The
mapping table is normative:

| `LOG_LEVEL` (case-insensitive) | `LogVerbosity` value | Effective Logtape level for `['kb']` | Sink mode       |
| ------------------------------ | -------------------- | ------------------------------------ | --------------- |
| unset                          | `default`            | `warning`                            | fingers-crossed |
| `default`                      | `default`            | `warning`                            | fingers-crossed |
| `verbose`                      | `verbose`            | `info`                               | plain           |
| `debug`                        | `debug`              | `debug`                              | plain           |
| `trace`                        | `trace`              | `trace`                              | plain           |
| any other string               | `default` + warning  | `warning`                            | fingers-crossed |

When `LOG_LEVEL` is unrecognized, `parseLogVerbosity` returns `'default'`
and `configureMainLogging` emits exactly one `warning` record on
`['logtape', 'meta']`: `Unrecognized LOG_LEVEL "<value>"; falling back to
"default"`.

The fingers-crossed sink wraps the underlying pretty console sink and
buffers per-context (per-`requestId`) records below `warning`. When an
`error` record is logged in the same context, the buffer is flushed to the
underlying sink, then released.

## Log line format

All pretty-formatter output uses the canonical shape:

```
HH:MM:SS.mmm LVL kb·<area>  <message>                                req=<short_id>
                            <indented continuation when needed>
```

- `HH:MM:SS.mmm` — wall-clock timestamp with millisecond precision.
- `LVL` — three-letter level: `TRC`, `DBG`, `INF`, `WRN`, `ERR`.
- `kb·<area>` — rendered from the `string[]` category by `@logtape/pretty`.
  The dot is the formatter's default separator and is not configurable in
  this spec.
- `<message>` — single line of text. Long content (full SQL, request
  parameters) is placed on the next line indented to align with `<message>`.
- `req=<short_id>` — first 8 hex characters of the `requestId` UUID v4,
  appended as a trailing field when the record carries a `requestId` in
  `context`. Records without a `requestId` have no `req=` field.

### Records emitted by this spec

At `LOG_LEVEL=debug`, the request lifecycle reads:

```
22:30:15.123 INF kb·rpc        Started POST /api/list                                      req=a1b2c3d4
22:30:15.125 DBG kb·rpc        Parameters: { limit: 50, offset: 0 }                        req=a1b2c3d4
22:30:15.126 DBG kb·sqlite     Knowledge (0.8ms) rows=12                                   req=a1b2c3d4
                               SELECT k.*, COALESCE(f.frecency_score, 0) AS frecency_score
                               FROM knowledges k LEFT JOIN entry_frecency f ON k.id = f.entry_id
                               ORDER BY frecency_score DESC LIMIT ? OFFSET ?
22:30:15.128 INF kb·rpc        Completed 200 OK in 4.2ms                                   req=a1b2c3d4
```

At `LOG_LEVEL=trace`, the SQL record adds bind values and the first-row
representation on additional continuation lines:

```
22:30:15.126 TRC kb·sqlite     Knowledge (0.8ms) rows=12                                   req=a1b2c3d4
                               SELECT k.*, COALESCE(f.frecency_score, 0) AS frecency_score
                               FROM knowledges k LEFT JOIN entry_frecency f ON k.id = f.entry_id
                               ORDER BY frecency_score DESC LIMIT ? OFFSET ?
                               binds: [50, 0]
                               first: #<Knowledge id: "k_0001", kind: "doc", title: "Welcome", …>
```

At `LOG_LEVEL=default`, only `warning` and `error` records reach the
console; on error, the fingers-crossed sink flushes the buffered records
for the same `requestId` ahead of the error.

## Category convention

Categories begin with `['kb', '<area>', …]`. The canonical map (also
in `requirements.md` Appendix B; the two SHALL stay in sync):

| Category                      | Owner file                                                |
| ----------------------------- | --------------------------------------------------------- |
| `['kb', 'main']`              | `src/shell/main/main.ts`                                  |
| `['kb', 'app']`               | `src/shell/app/app.ts`                                    |
| `['kb', 'app', 'sync']`       | `src/shell/app/db/import.service.ts` + `app_sync.util.ts` |
| `['kb', 'app', 'task']`       | `src/shell/app/lib/app_task_source.util.ts`               |
| `['kb', 'rpc']`               | `src/shared/logging/rpc.middleware.ts`                    |
| `['kb', 'sqlite']`            | `src/shared/logging/db_query.logger.ts`                   |
| `['kb', 'ui']`                | renderer top-level                                        |
| `['kb', 'ui', 'list-page']`   | `src/shell/renderer/pages/list/`                          |
| `['kb', 'ui', 'detail-page']` | `src/shell/renderer/pages/detail/`                        |
| `['kb', 'ui', 'rpc-client']`  | `src/shell/renderer/rpc/client.ts`                        |
| `['kb', 'ui', 'sync']`        | renderer sync handlers                                    |

Adding a new `['kb', 'ui', …]` sub-category does not require re-opening
this spec; `LOGGING_GUIDE.md` is the living document for that.

## RPC instrumentation

### Plugin shape

`rpcLogger` is an Elysia plugin defined in
`src/shared/logging/rpc.middleware.ts`:

```ts
import { Elysia } from 'elysia'
import { getLogger, withContext } from './logger'

const rpcLog = getLogger(['kb', 'rpc'])

export const rpcLogger = new Elysia({ name: 'kb-rpc-logger' })
  .derive({ as: 'global' }, ({ request, headers }) => {
    const requestId = headers['x-request-id'] ?? crypto.randomUUID()
    const url = new URL(request.url)
    const action = `${request.method} ${url.pathname}`
    return {
      requestId,
      action,
      method: request.method,
      path: url.pathname,
      startedAt: performance.now(),
    }
  })
  .onTransform(({ requestId, action, method, path }) => {
    withContext({ requestId, action, method, path }, () => {
      rpcLog.info`Started ${method} ${path}`
    })
  })
  .onBeforeHandle({ as: 'global' }, ({ requestId, action, method, path, body, query }) => {
    withContext({ requestId, action, method, path }, () => {
      rpcLog.debug`Parameters: ${inspectParams({ body, query })}`
    })
  })
  .onAfterResponse({ as: 'global' }, ({ requestId, action, method, path, startedAt, set }) => {
    const duration = Math.round((performance.now() - startedAt) * 10) / 10
    withContext({ requestId, action, method, path }, () => {
      rpcLog.info`Completed ${set.status ?? 200} in ${duration}ms`
    })
  })
  .onError({ as: 'global' }, ({ requestId, action, method, path, error }) => {
    withContext({ requestId, action, method, path }, () => {
      rpcLog.error`${error.message}`, { stack: error.stack, code: (error as any).code }
    })
  })
  .as('global')
```

Notes:

- All lifecycle hooks use `{ as: 'global' }` so the bundle composes
  cleanly into both servers.
- The `withContext(...)` wrap inside each hook re-binds the context
  fields. `derive` itself does **not** automatically bind to
  `contextLocalStorage` — the explicit `withContext` call is what
  guarantees downstream loggers inherit the fields.
- `inspectParams({ body, query })` is a small helper in the same file:

  ```ts
  function inspectParams(input: { body?: unknown; query?: unknown }): string {
    const result = input.body !== undefined ? input.body : input.query ?? {}
    const text = Bun.inspect(result, { depth: 3 })
    return text.length > 2048 ? `${text.slice(0, 2048)}…(truncated)` : text
  }
  ```

### Bundle composition

`src/shared/logging/rpc_common.plugin.ts`:

```ts
import { Elysia } from 'elysia'
import { rpcErrorContract } from './rpc_error.contract'
import { rpcLogger } from './rpc.middleware'

export const rpcCommonPlugins = new Elysia({ name: 'kb-rpc-common' })
  .use(rpcErrorContract)
  .use(rpcLogger)
  .as('global')
```

### Mount points

```ts
// src/shell/main/rpc/server.ts
export function createRpcServer(appInstance: AppService) {
  return new Elysia({ prefix: '/api' })
    .use(rpcCommonPlugins)
    .post('/list', /* … unchanged … */)
    // …
}

// tools/preview/server.ts
const previewApp = new Elysia({ prefix: '/api' })
  .use(rpcCommonPlugins)
  .post('/list', /* … mirror of production routes … */)
```

`src/shell/main/rpc/host.ts` requires no edits in this spec.

## DB instrumentation

### Public API

```ts
// src/shared/logging/db_query.logger.ts
import type { Database, Statement } from 'bun:sqlite'

export type SqlEntry = string | { noun: string; sql: string }

export type RepositoryStmts<S extends Record<string, SqlEntry>> = {
  [K in keyof S]: Statement<unknown, unknown[]>
}

export function repositoryStmts<S extends Record<string, SqlEntry>>(
  db: Database,
  defaultNoun: string,
  sqlMap: S,
): RepositoryStmts<S>
```

### Log record shape

Every record on `['kb', 'sqlite']` carries the structured props:

| Field            | Type                 | Always present                                          | Notes                                                                                          |
| ---------------- | -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `noun`           | `string`             | yes                                                     | The repository-declared name.                                                                  |
| `sql`            | `string`             | yes                                                     | The full SQL string, untruncated.                                                              |
| `duration_ms`    | `number`             | yes (except `iterate`)                                  | Rounded to one decimal place.                                                                  |
| `rows`           | `number`             | yes (except `iterate`)                                  | Result row count from `.all()` / `.values()`; `0` or `1` for `.get()`; `changes` for `.run()`. |
| `binds`          | `readonly unknown[]` | at `trace`+ only                                        | Parameter array as passed to the statement.                                                    |
| `representation` | `string`             | at `trace`+ only, when there is at least one result row | Rails-style: `#<Knowledge id: "…", …>`.                                                        |

### Instrumentation rules

- `repositoryStmts` calls `db.query<R, P>(entrySql)` exactly once per key at
  construction time. The returned `Statement` is cached by `bun:sqlite`.
- The returned bag's `.all()`, `.get()`, `.run()`, `.values()` are
  closures over the original `Statement`. Each closure:
  1. Reads `rpcLog.isEnabledFor('debug')`. If false, calls the underlying
     method directly and returns.
  2. Otherwise, marks `started = performance.now()`, calls the underlying
     method, computes `duration_ms`, and emits one `debug` record.
- `.iterate()` is **not** timed; the wrapper passes through to the original
  iterator and emits one `debug` record `<Noun> iterate` at iteration
  start when `LOG_LEVEL >= debug`.
- The wrapper catches thrown errors, emits one `error` record on
  `['kb', 'sqlite']` with `{ noun, sql, binds, message, stack }`, then
  rethrows the original error untouched.

### `representation` helper

```ts
function representFirstRow(noun: string, row: Record<string, unknown> | undefined): string | undefined {
  if (!row) return undefined
  const inner = Object.entries(row)
    .map(([k, v]) => `${k}: ${Bun.inspect(v, { depth: 0 })}`)
    .join(', ')
  const text = `#<${noun} ${inner}>`
  return text.length > 200 ? `${text.slice(0, 199)}…>` : text
}
```

The function is `LogVerbosity`-gated: it is only invoked when
`logger.isEnabledFor('trace')` is true, so the JSON-like inspection cost
is paid only at trace verbosity.

## Renderer logging

### Configuration

```ts
// src/shared/logging/renderer.config.ts
import { configureSync, getConsoleSink } from '@logtape/logtape'
import { getPrettyFormatter } from '@logtape/pretty'

let configured = false

export function configureRendererLogging(): void {
  if (configured) return
  configured = true

  const isDev = process.env.NODE_ENV !== 'production'

  configureSync({
    reset: true,
    sinks: { devtools: getConsoleSink({ formatter: getPrettyFormatter() }) },
    loggers: [
      { category: ['logtape', 'meta'], sinks: ['devtools'], lowestLevel: 'warning' },
      { category: ['kb', 'ui'],        sinks: ['devtools'], lowestLevel: isDev ? 'info' : 'warning' },
    ],
  })
}
```

### Wire-up

```tsx
// src/shell/renderer/app.tsx
import { configureRendererLogging } from '@shared/logging/renderer.config'
configureRendererLogging()
import { createRoot } from 'react-dom/client'
// … rest of boot …
```

The explicit function call is preferred over a side-effect-only import for
three reasons: bundler tree-shaking safety, test ergonomics, and visibility
of intent. These are documented in `LOGGING_GUIDE.md` §"Renderer-side
logging".

## File structure

NEW files under `src/shared/logging/`:

| File                         | Purpose                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- |
| `logger.ts`                  | Re-exports `getLogger`, `withContext`, `isEnabledFor`, types.               |
| `main.config.ts`             | `configureMainLogging()` with `contextLocalStorage` + LOG_LEVEL fan-out.    |
| `main.config.spec.ts`        | Asserts level mapping, sink mode by LOG_LEVEL, idempotency.                 |
| `renderer.config.ts`         | `configureRendererLogging()` for the webview.                               |
| `renderer.config.spec.ts`    | Asserts level mapping by `NODE_ENV`, idempotency, no `contextLocalStorage`. |
| `db_query.logger.ts`         | `repositoryStmts` API.                                                      |
| `db_query.logger.spec.ts`    | Asserts log record shape at debug/trace, error rethrow, performance gate.   |
| `rpc.middleware.ts`          | `rpcLogger` Elysia plugin.                                                  |
| `rpc.middleware.spec.ts`     | Asserts request/parameters/complete/error lines, X-Request-Id header.       |
| `rpc_common.plugin.ts`       | `rpcCommonPlugins = .use(rpcErrorContract).use(rpcLogger).as('global')`.    |
| `rpc_common.plugin.spec.ts`  | Asserts both plugins applied; preview server uses the same bundle.          |
| `rpc_error.contract.ts`      | MOVED from `src/shell/main/rpc/server.ts`. Behavior unchanged.              |
| `rpc_error.contract.spec.ts` | MOVED inline tests from server.ts. Behavior unchanged.                      |

EDITS under `src/shared/logging/`:

| File                 | Change                                                                |
| -------------------- | --------------------------------------------------------------------- |
| `log_verbosity.ts`   | Comment update only. Behavior unchanged.                              |
| `logtape.adapter.ts` | Reduced to a thin re-export of `main.config.ts`, or folded into it.   |
| `index.ts`           | Barrel updates per "Public APIs" §. **REMOVE `createLogger` export.** |

DELETIONS under `src/shared/logging/`:

| File                     | Removed in |
| ------------------------ | ---------- |
| `console.logger.ts`      | Phase D.   |
| `console.logger.spec.ts` | Phase D.   |

EDITS under `src/shell/`:

| File                                      | Change                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `main/main.ts`                            | Replace `createLogger(…)` with `getLogger(['kb','main'])`; call `configureMainLogging()` first. |
| `main/main.spec.ts`                       | Update expectations (category-based, no console spy).                                           |
| `main/rpc/server.ts`                      | `.use(rpcCommonPlugins)`; remove inline `rpcErrorContract`.                                     |
| `app/app.ts`                              | `createLogger` → `getLogger(['kb','app'])`.                                                     |
| `app/db/import.service.ts`                | `createLogger` → `getLogger(['kb','app','sync'])`.                                              |
| `app/db/entry.repository.ts`              | Convert to `repositoryStmts(db, 'Knowledge', { …sql })`.                                        |
| `app/db/<other>.repository.ts` (per file) | Same pattern; one noun per file.                                                                |
| `app/lib/app_task_source.util.ts`         | `createLogger` → `getLogger(['kb','app','task'])`.                                              |
| `app/lib/app_sync.util.ts`                | `createLogger` → `getLogger(['kb','app','sync'])`.                                              |
| `renderer/app.tsx`                        | Add `configureRendererLogging()` as first executable statement.                                 |

EDIT in `tools/preview/server.ts`:

- Use `rpcCommonPlugins`; remove duplicated error contract definition.

NEW docs (Phase E):

| File                                  | Purpose                                 |
| ------------------------------------- | --------------------------------------- |
| `assets/guides/LOGGING_GUIDE.md`      | Canonical reference; outline below.     |
| `.agents/skills/app-logging/SKILL.md` | Project skill, same shape as `app-rpc`. |

EDIT docs (Phase E):

| File                                      | Change                                                         |
| ----------------------------------------- | -------------------------------------------------------------- |
| `CLAUDE.md`                               | Logging policy block.                                          |
| `AGENTS.md`                               | Same; mirrors CLAUDE.md.                                       |
| `README.md`                               | One-paragraph Debugging subsection with `LOG_LEVEL` reference. |
| `assets/guides/CODESTYLE_GUIDE.md`        | Logging section.                                               |
| `assets/guides/TESTING_GUIDE.md`          | "Asserting on log output" subsection.                          |
| `assets/docs/specs/foundation/design.md`  | Add Observability decision.                                    |
| `assets/docs/specs/foundation/roadmap.md` | Slot the feature in.                                           |
| `assets/guides/SKILLS.md`                 | Register `app-logging` skill.                                  |
| `assets/catalog/SKILLS.yaml`                | Same; structured row.                                          |
| `.agents/skills/app-context/SKILL.md`     | One paragraph on logging architecture.                         |

## Call-site migration map

The Phase D big-bang. Each row is a single string substitution at the
top of the file plus updating the logger field assignments.

| File                                        | Old                          | New                                      |
| ------------------------------------------- | ---------------------------- | ---------------------------------------- |
| `src/shell/main/main.ts`                    | `createLogger('main')`       | `getLogger(['kb', 'main'])`              |
| `src/shell/main/main.spec.ts`               | references to `createLogger` | references to `getLogger` + fixture sink |
| `src/shell/app/app.ts`                      | `createLogger('app')`        | `getLogger(['kb', 'app'])`               |
| `src/shell/app/db/import.service.ts`        | `createLogger('import')`     | `getLogger(['kb', 'app', 'sync'])`       |
| `src/shell/app/lib/app_task_source.util.ts` | `createLogger('task')`       | `getLogger(['kb', 'app', 'task'])`       |
| `src/shell/app/lib/app_sync.util.ts`        | `createLogger('sync')`       | `getLogger(['kb', 'app', 'sync'])`       |

If the actual `createLogger` argument differs from the table above, the
receiving agent SHALL re-derive the area name from the file's role (the
table is a guideline; the FCIS area is the truth).

## LOGGING_GUIDE.md outline

```
LOGGING_GUIDE.md
├─ At a glance                 (1-paragraph "what & why")
├─ Quickstart                  (5-line example: getLogger, info/debug, placeholders)
├─ Verbosity dial              (LOG_LEVEL table; mirrors requirements.md Appendix A)
├─ Category conventions        (['kb', '<area>', …]; mirrors requirements.md Appendix B)
├─ Structured props vs message (when to use placeholders, when to attach props)
├─ Lazy evaluation             (() => ({ expensive })) pattern + when to use it
├─ Per-request context         (withContext, AsyncLocalStorage requirement)
├─ DB query logging            (repositoryStmts API + when to override noun)
├─ Renderer-side logging       (categories under ['kb', 'ui'], DevTools-only for now)
├─ Testing log output          (fixture sink pattern; link to TESTING_GUIDE.md)
├─ Performance notes           (level-check short-circuit; performance.now() cost)
├─ Observability roadmap       (deferred-work catalog, one paragraph each)
│   ├─ Field-level redaction   (@logtape/redaction)
│   ├─ OpenTelemetry export    (@logtape/otel)
│   ├─ Sentry sink             (@logtape/sentry)
│   ├─ File sink (postmortem)  (@logtape/file, rotating)
│   ├─ SQLite sink (in-app)    (fromAsyncSink → debug_logs table)
│   ├─ Renderer→main ferry     (the deferred work)
│   └─ Cross-process trace IDs (X-Request-Id propagated from renderer)
└─ Anti-patterns               (don't do these; specifically calling configure inside components, configure in libraries, console.*)
```

## Test strategy

| Concern                                                | Test location                                         | Strategy                                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `parseLogVerbosity` mapping                            | `src/shared/logging/log_verbosity.spec.ts` (existing) | Pre-existing tests; no change.                                                                               |
| `configureMainLogging` LOG_LEVEL fan-out               | `src/shared/logging/main.config.spec.ts`              | Fixture sink replaces console sink; assert which records reach it at each `LOG_LEVEL`.                       |
| `configureMainLogging` idempotency                     | same                                                  | Call twice; assert second call is a no-op (no extra sinks registered).                                       |
| Fingers-crossed flush on error                         | same                                                  | Buffer `info` records; emit `error`; assert all prior `info` records appear before the error record.         |
| `configureRendererLogging` `NODE_ENV` mapping          | `src/shared/logging/renderer.config.spec.ts`          | Stub `process.env.NODE_ENV`; assert effective level.                                                         |
| `rpcLogger` Started/Parameters/Completed lines         | `src/shared/logging/rpc.middleware.spec.ts`           | Fixture sink + real Elysia + real `treaty` client; one round trip; assert records by message + category.     |
| `rpcLogger` X-Request-Id header reading                | same                                                  | Send a request with the header; assert `requestId` in records matches.                                       |
| `rpcLogger` UUID generation when header is absent      | same                                                  | Send a request without the header; assert `requestId` is a UUID v4.                                          |
| `rpcLogger` error path + fingers-crossed flush         | same                                                  | Stage a handler that throws; assert pre-error `info`/`debug` records flush.                                  |
| `rpcCommonPlugins` composition                         | `src/shared/logging/rpc_common.plugin.spec.ts`        | Mount the bundle; trigger a typed error response; assert both error-contract behavior and logger output.     |
| `repositoryStmts` log record shape (debug)             | `src/shared/logging/db_query.logger.spec.ts`          | In-memory SQLite (`Database(':memory:')`); declare a tiny schema; assert `{ noun, sql, duration_ms, rows }`. |
| `repositoryStmts` bind values + representation (trace) | same                                                  | Same as above at trace; assert `binds` and `representation` fields.                                          |
| `repositoryStmts` short-circuit at default             | same                                                  | Spy on `performance.now`; at default verbosity, `performance.now` is not invoked.                            |
| `repositoryStmts` error rethrow                        | same                                                  | Statement that throws; assert error record + identical thrown error reaches caller.                          |
| Per-request context isolation                          | `src/shared/logging/rpc.middleware.spec.ts`           | Two overlapping handlers; assert log records partition cleanly by `requestId`.                               |
| Call-site migration                                    | existing per-file specs                               | Update assertions from console spy to `getLogger` fixture-sink capture.                                      |

No `AppService`, `bun:sqlite`, or HTTP port is mocked. All tests use real
instances per `assets/guides/TESTING_GUIDE.md`.

## Risks and trade-offs

| Risk                                                                                | Mitigation                                                                                                                       |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `AsyncLocalStorage` is heavier than direct closure capture.                         | Cost is one allocation per request; benchmark DBG-8 §5 catches a > 2 % regression at default.                                    |
| Pretty formatter writes blocking to `process.stdout`.                               | Acceptable for dev/CI; future spec adds `@logtape/file` async sink (LOGGING_GUIDE.md observability roadmap).                     |
| `LOG_LEVEL=trace` SQL bind dumps may include sensitive data once the schema grows.  | Out of scope here; redaction is a roadmap item via `@logtape/redaction`. Document the limitation in LOGGING_GUIDE.md.            |
| Eden Treaty type inference may flicker when `rpcCommonPlugins` is introduced.       | The plugin uses `.as('global')`; verify in Phase B by checking renderer's `src/shell/renderer/rpc/client.ts` types.              |
| Fingers-crossed buffer can grow unbounded if a request never errors and never ends. | Buffer is keyed by `requestId`; release is tied to `onAfterResponse`/`onError`. Tests cover both terminal paths.                 |
| Renderer omits `contextLocalStorage`; future ferry will need it.                    | Ferry is explicitly deferred; the category prefix `['kb', 'ui', …]` is forward-compatible.                                       |
| Repositories that touch multiple tables don't fit a single noun.                    | `repositoryStmts` accepts per-statement noun overrides via `{ noun, sql }`. The override is documented in §"DB instrumentation". |

## Cross-references

- [`requirements.md`](requirements.md) — EARS acceptance criteria.
- [`tasks.md`](tasks.md) — phase-by-phase checklist; each task footers
  `_Requirements: DBG-<N>, …_`.
- [`handoff.md`](handoff.md) — the prompt for the receiving agent.
- [`assets/guides/LOGGING_GUIDE.md`](../../guides/LOGGING_GUIDE.md) — created
  in Phase E; living implementer reference.
- [`assets/docs/specs/foundation/design.md`](../foundation/design.md) §
  Observability — created in Phase E; architectural decision record.
- [`CLAUDE.md`](../../../CLAUDE.md), [`AGENTS.md`](../../../AGENTS.md) —
  updated in Phase E.
