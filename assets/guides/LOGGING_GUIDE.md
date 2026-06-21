---
title: Logging Guide
description: Canonical reference for kb's LogTape-backed debug logging system
---
<!-- markdownlint-disable-file -->

# Logging Guide

This guide is the normative implementer reference for kb logging.

## At a glance

kb uses [LogTape](https://logtape.org) for structured debug logging with a
`LOG_LEVEL` environment-variable dial. All `src/` code uses
`getLogger(['kb', '<area>', ...])` from `@shared/logging`. The main process
configures sinks, context storage, and level fan-out once at boot; the renderer
configures independently. RPC requests are correlated by `requestId`; SQL
queries are timed and logged only at `debug`+.

## Quickstart

```ts
import { getLogger } from '@shared/logging'

const log = getLogger(['kb', 'app'])

log.info`Sync started, scanning ${dir}`
log.debug`Processing file: ${file.name}`
log.warn`Duplicate key {key}`, { key, source: file.path }
log.error`Import failed`, { error }
```

Set `LOG_LEVEL` before launching:

```sh
LOG_LEVEL=verbose bun run dev
```

## Verbosity dial

`LOG_LEVEL` is read once in `configureMainLogging()` (main process). The renderer
reads the same dial from env values **inlined at view bundle build time** in
`renderer_build_env.ts` — restart dev after changing `LOG_LEVEL`. Case-insensitive.

| `LOG_LEVEL`  | Effective level | Sink mode       | What appears                                                                  |
| ------------ | --------------- | --------------- | ----------------------------------------------------------------------------- |
| unset        | `warning`       | fingers-crossed | Errors only. Buffered context flushed on error.                               |
| `default`    | `warning`       | fingers-crossed | Same as unset.                                                                |
| `verbose`    | `info`          | plain           | Adds RPC `Started`/`Completed` lines.                                         |
| `debug`      | `debug`         | plain           | Adds RPC `Parameters` and full SQL + duration + rows.                         |
| `trace`      | `trace`         | plain           | Adds SQL bind values + first-row representation; adds context-bound metadata. |
| other string | `warning`       | fingers-crossed | Same as `default` + one `warning` on `['logtape','meta']`.                    |

**Where output goes**

| Surface | `LOG_LEVEL` unset–`trace` |
| ------- | ------------------------- |
| Main terminal | `['kb']`, `['kb', 'rpc']`, `['kb', 'sqlite']` — RPC and SQL instrumentation |
| Renderer DevTools (CEF / WKWebView) | `['kb', 'ui', …]` including `rpc-client` bridge lines at `debug`+ |

SQL runs only in the main process; it never appears in the webview console. Use the
main terminal (or a future log ferry) for query text. At `LOG_LEVEL=trace`, open
both the dev terminal and DevTools for full coverage.

## Category conventions

Categories begin with `['kb', '<area>', ...]`. The canonical map:

| Category                      | Owner files                                               |
| ----------------------------- | --------------------------------------------------------- |
| `['kb', 'main']`              | `src/shell/main/main.ts`                                  |
| `['kb', 'app']`               | `src/shell/app/app.ts`                                    |
| `['kb', 'app', 'sync']`       | `src/shell/app/db/import.service.ts`, `src/shell/app/lib/app_sync.service.ts` |
| `['kb', 'app', 'task']`       | `src/shell/app/lib/app_task_source.service.ts`               |
| `['kb', 'rpc']`               | `src/shared/logging/rpc.middleware.ts`                    |
| `['kb', 'sqlite']`            | `src/shared/logging/db_query.logger.ts`                   |
| `['kb', 'ui']`                | renderer top-level                                        |
| `['kb', 'ui', 'list-page']`   | `src/shell/renderer/pages/list/`                          |
| `['kb', 'ui', 'detail-page']` | `src/shell/renderer/pages/detail/`                        |
| `['kb', 'ui', 'rpc-client']`  | `src/shell/renderer/rpc/client.ts`                        |
| `['kb', 'ui', 'sync']`        | renderer sync handlers                                    |

Adding new `['kb', 'ui', …]` sub-categories does not require re-opening
the debug logging spec.

## Structured props vs message

LogTape supports both message templates and structured props. Prefer this rule:

- **Message**: the human-readable summary of what happened.
- **Props**: machine-consumable structured data attached to the record.

```ts
// ✅ Good: message explains, props carry typed data
log.info`Imported ${count} entries`, { count, duration_ms, sourcesDir }
log.error`${error.message}`, { error, code: (error as any).code }

// ❌ Bad: embedding data in the message string
log.info(`Imported ${count} entries from ${sourcesDir} in ${duration_ms}ms`)
```

Props are emitted as structured fields in JSON output and can be filtered
in log analysis.

## Lazy evaluation

When computing a prop is expensive, wrap it in a callback to defer
evaluation until the logger is confirmed enabled:

```ts
log.debug`Entry details`, () => ({ entry: JSON.stringify(largeEntry) })
```

This avoids the serialization cost when `LOG_LEVEL` is below `debug`.
Use sparingly — only when the computation is provably expensive.

## Per-request context

RPC log records are correlated by `requestId` via `withContext(...)` and
`node:async_hooks.AsyncLocalStorage`. The `rpcLogger` middleware in
`rpcCommonPlugins` binds context automatically — no manual propagation needed.

```ts
// Inside an RPC handler, context is inherited automatically:
const log = getLogger(['kb', 'app'])
log.info`Processing request`  // carries requestId, action, method, path

// To add extra context fields:
import { withContext } from '@shared/logging'
withContext({ tenantId: 'acme' }, () => {
  log.info`Tenant-scoped operation`
})
```

Context fields survive `await` boundaries inside the main process thanks to
`AsyncLocalStorage`. The renderer does not use `contextLocalStorage`
(`node:async_hooks` is unavailable in the webview runtime).

## DB query logging

Use `repositoryStmts(db, '<Noun>', { …sql })` instead of raw
`db.query(...)`. The wrapper instruments every query:

```ts
import { repositoryStmts } from '@shared/logging'

const stmts = repositoryStmts(db, 'Knowledge', {
  findAll: 'SELECT * FROM knowledges ORDER BY id',
  findById: 'SELECT * FROM knowledges WHERE id = ?',
})

// At LOG_LEVEL=debug: emits one record with { noun, sql, duration_ms, rows }
const rows = stmts.findAll.all()

// Per-statement noun override for cross-table queries:
const stmts = repositoryStmts(db, 'Knowledge', {
  findByTag: { noun: 'KnowledgeTag', sql: 'SELECT * FROM knowledges WHERE tag = ?' },
})
```

At `LOG_LEVEL=debug`: SQL + duration + row count.
At `LOG_LEVEL=trace`: additionally `binds` array and first-row `representation`.
At `default`: short-circuited via `logger.isEnabledFor('debug')` — no overhead.

## Renderer-side logging

```ts
import { getLogger } from '@shared/logging'

const log = getLogger(['kb', 'ui'])

log.info`Renderer mounted`
log.debug`Filter changed: ${filter}`, { filter }
```

- Categories under `['kb', 'ui', …]`.
- Output goes to DevTools console only (CEF `localhost:9222` or WKWebView Inspector).
- No `LOG_LEVEL` dial — verbosity is hardcoded: `info` in dev, `warning` in prod.
- No `contextLocalStorage` — `node:async_hooks` is unavailable in the webview.

## Testing log output

See `assets/guides/TESTING_GUIDE.md` § "Asserting on log output" for the
fixture sink pattern. In short:

```ts
import { configureSync } from '@logtape/logtape'
import type { LogRecord, Sink } from '@logtape/logtape'

const records: LogRecord[] = []
const fixtureSink: Sink = (r) => { records.push(r) }
configureSync({
  reset: true,
  sinks: { fixture: fixtureSink },
  loggers: [{ category: ['kb'], sinks: ['fixture'], lowestLevel: 'debug' }],
})

// Exercise code under test...
// Then assert:
expect(records.some(r => r.category.join('.') === 'kb.sqlite')).toBe(true)
```

Never snapshot pretty-formatter output — assert on structured `LogRecord`
properties instead.

## Performance notes

- At `default` verbosity, the instrumented statement wrapper adds one boolean
  check (`isEnabledFor('debug')`) per call — no `performance.now()` overhead.
- `AsyncLocalStorage` costs one allocation per request. Benchmarks show < 2 %
  regression at default verbosity.
- Pretty formatter writes blocking to `process.stdout` — acceptable for
  dev/CI. A future `@logtape/file` async sink is on the observability roadmap.
- Lazy evaluation callbacks prevent expensive serialization at levels where
  the logger is disabled.

## Observability roadmap

Deferred work items, one paragraph each.

### Field-level redaction

`@logtape/redaction` provides field-level masking. Needed before `LOG_LEVEL=trace`
can be used in production-adjacent environments where SQL bind values may
contain user content. Adoption cost: one config stanza; no call-site changes.

### OpenTelemetry export

`@logtape/otel` bridges LogTape records to OTLP. Enables trace/monitoring
integration with Honeycomb, Datadog, or OSS collectors. Trigger: when
distributed tracing or production monitoring is required. Adoption cost:
`@logtape/otel` dependency + exporter config.

### Sentry sink

`@logtape/sentry` forwards error records to Sentry. Trigger: when the team
needs error alerting beyond the console. Adoption cost: Sentry SDK + sink
config.

### File sink (postmortem)

`@logtape/file` with rotating log files. Provides persistent on-disk logs
for debugging crashes or user-reported issues. Trigger: when console-only
loss is a support burden. Adoption cost: one config block; no call-site
changes.

### SQLite sink (in-app inspector)

A `fromAsyncSink` → `debug_logs` table. Enables an in-app log viewer without
leaving the renderer. Trigger: when users report issues that are hard to
reproduce by reading the terminal. Adoption cost: ~50 lines of schema +
consumer component.

### Renderer→main ferry

Forward renderer `['kb', 'ui']` records to the main process so they appear
in the same console stream. Trigger: when debugging renderer-only issues
requires main-side visibility. Adoption cost: Electrobun IPC channel + a
LogTape ferry sink.

### Cross-process trace IDs

Propagate `X-Request-Id` from renderer to main so user-facing actions carry
the same `requestId` end-to-end. Trigger: when correlating renderer clicks
with backend queries becomes necessary. Adoption cost: header injection in
the Eden Treaty fetcher; no API changes.

## Anti-patterns

- **Do not call `configureSync` inside a component or hook.** Configuration
  is one-shot at entry points (`main.ts`, `app.tsx`). Repeated calls are
  idempotent-guarded but still wrong architecturally.
- **Do not call `configureSync` inside a library module.** Libraries must
  not own configuration; they inherit the environment configured by the
  entry point.
- **Do not use `console.*` in `src/`.** All output goes through LogTape.
  The sole exception is the renderer's `getConsoleSink()` inside
  `renderer.config.ts`.
- **Do not snapshot pretty-formatter output in tests.** Format strings
  change with library versions. Assert on `LogRecord` structured properties
  instead.
- **Do not import `node:async_hooks` in renderer code.** It is unavailable
  in the webview runtime. Use `configureRendererLogging()` which omits
  `contextLocalStorage`.
- **Do not read `LOG_LEVEL` outside `configureMainLogging()`.** The dial is
  single-point-of-truth. Duplicate reads cause inconsistency.
