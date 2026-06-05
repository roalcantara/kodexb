<!-- markdownlint-disable-file -->
# Debug logging mode — Requirements

## Introduction

kb is a native Electrobun desktop app that talks to its renderer over a typed
Elysia + Eden Treaty RPC bridge and persists data through `bun:sqlite`. The
current logging surface (`src/shared/logging/`) is a thin wrapper around
`console.*` via `createLogger()`; it offers no per-request correlation, no SQL
visibility, and no usable verbosity dial.

This spec adds a **Rails-style debug logging mode** behind a single environment
variable, `LOG_LEVEL`. When set, the app emits verbose, single-line records
covering every RPC request (start / params / response / status / duration) and
every SQL query (full SQL / bind values at trace / row count / duration), with
all related lines correlated by a per-request short `requestId`. Default
verbosity stays terse — nothing changes in production until the dial is turned.

The implementation uses [LogTape](https://logtape.org) (already a dependency,
along with `@logtape/pretty` and `@logtape/elysia`). Logging code stays inside
`src/shared/logging/`; the renderer configures independently from main and has
no `LOG_LEVEL` dial.

This spec replaces `createLogger()` with `getLogger(['kb', '<area>', …])` in
every `src/` call site as part of a single coordinated migration.

## Sources

- LogTape configuration manual:
  https://logtape.org/manual/config
- LogTape sinks (console, file, fingers-crossed, async):
  https://logtape.org/manual/sinks
- LogTape structured logging:
  https://logtape.org/manual/struct
- LogTape formatters (pretty, JSON Lines):
  https://logtape.org/manual/formatters
- LogTape debug usage notes:
  https://logtape.org/manual/debug
- LogTape library best practices:
  https://logtape.org/manual/library
- LogTape redaction (future / out of scope here):
  https://logtape.org/manual/redaction
- Elysia lifecycle hooks (`derive`, `onAfterResponse`, `onError`):
  https://elysiajs.com/concepts/lifecycle.html
- `bun:sqlite` Statement reference:
  https://bun.com/docs/api/sqlite

## Out of scope

- Adding any new logging dependency beyond `@logtape/logtape`,
  `@logtape/pretty`, and `@logtape/elysia` (already installed). OpenTelemetry,
  Sentry, file sink, SQLite sink, redaction, and a renderer→main ferry are
  documented as a roadmap in `assets/guides/LOGGING_GUIDE.md` but **not
  implemented in this spec**.
- Cross-process trace propagation. The renderer does **not** forward
  `X-Request-Id` to main in this spec; that becomes a future spec.
- Mocking `AppService`, `bun:sqlite`, or HTTP ports in tests. Tests use real
  `Database(':memory:')` plus Fishery `factoryFor` per `assets/guides/
  TESTING_GUIDE.md`.
- Switching the renderer logging dial to an env var. Renderer verbosity is
  hardcoded in this spec (dev=`info`, prod=`warning`) until a future spec
  adds the ferry.
- Replacing `bun:sqlite` with Drizzle, or `TypeBox` with `zod`. Both are
  permanently out of scope per `CLAUDE.md`.

## Requirement syntax

- **WHEN** _event_, **THEN** the system **SHALL** _response_.
- **IF** _precondition_, **THEN** the system **SHALL** _response_.

Traceability: each `DBG-<N>` requirement maps to one or more sections in
[design.md](design.md) and one or more checklists in [tasks.md](tasks.md) by
the `_Requirements:_` footer convention used elsewhere in this repo.

## Glossary

- **`LOG_LEVEL`** — environment variable read once at main process startup;
  case-insensitive; accepted values listed in DBG-1.
- **Effective Logtape level** — the lowest level passed to a Logtape sink for
  the `['kb']` category, computed from `LOG_LEVEL`.
- **Category** — a Logtape `string[]` identifying a logger; this spec uses
  `['kb']`, `['kb', 'sqlite']`, `['kb', 'rpc']`, `['kb', 'main']`,
  `['kb', 'app']`, `['kb', 'app', 'sync']`, `['kb', 'app', 'task']`,
  `['kb', 'ui']`, and the `['kb', 'ui', …]` sub-categories listed in design.md.
- **`requestId`** — a UUID v4 generated for every inbound RPC request (or
  read from the `X-Request-Id` header if provided); rendered as the first
  8 hex characters in pretty output (`req=a1b2c3d4`).
- **Per-repository noun** — the Rails-style model name attached to every
  SQL log record from one repository (e.g., `Knowledge` for
  `entry.repository.ts`).
- **Fingers-crossed sink** — a Logtape sink that buffers records at the
  default verbosity and flushes the buffer when an error record is seen,
  giving full context for the failing request without flooding default logs.
- **Pretty formatter** — `getPrettyFormatter()` from `@logtape/pretty`,
  used in development for human-readable single-line output.

## Requirement DBG-1: Verbosity dial

**User story:**
As a developer, I want a single environment variable that controls how much
the app logs, so I can debug a problem in development without changing code
and without affecting production users who don't set it.

### Acceptance criteria

1. WHEN `LOG_LEVEL` is unset, THEN the effective Logtape level for `['kb']`
   SHALL be `warning`.
2. WHEN `LOG_LEVEL=default` (any case), THEN the effective Logtape level for
   `['kb']` SHALL be `warning`.
3. WHEN `LOG_LEVEL=verbose` (any case), THEN the effective Logtape level for
   `['kb']` SHALL be `info`.
4. WHEN `LOG_LEVEL=debug` (any case), THEN the effective Logtape level for
   `['kb']` SHALL be `debug`.
5. WHEN `LOG_LEVEL=trace` (any case), THEN the effective Logtape level for
   `['kb']` SHALL be `trace`.
6. IF `LOG_LEVEL` is set to an unrecognized value, THEN the system SHALL fall
   back to `warning` and emit one `warning` record on `['logtape', 'meta']`
   identifying the invalid value. The system SHALL NOT crash.
7. WHEN `LOG_LEVEL=default` (or unset), THEN at runtime the main process
   SHALL register the fingers-crossed sink for `['kb']`, so that records below
   `warning` are buffered per request and flushed only when an error record is
   logged for the same request context.
8. WHEN `LOG_LEVEL` is `verbose`, `debug`, or `trace`, THEN the main process
   SHALL register the plain pretty sink for `['kb']` (no fingers-crossed
   buffering) so that the dialed records appear in real time.
9. WHEN the main process boots, THEN the system SHALL call
   `configureMainLogging()` exactly once before any other module emits a log
   record. Repeated calls SHALL be no-ops (idempotency guard).

## Requirement DBG-2: RPC request logging

**User story:**
As a developer, I want every renderer-triggered RPC call to log its start,
its parameters at debug, and its completion with status + duration, so that I
can read the request lifecycle off the console the same way I read a Rails
log.

### Acceptance criteria

1. WHEN `LOG_LEVEL` is at least `verbose` and an RPC handler is invoked, THEN
   the system SHALL emit one `info` record at category `['kb', 'rpc']` with
   message text matching the shape
   `Started <METHOD> <PATH>` (e.g., `Started POST /api/list`).
2. WHEN `LOG_LEVEL` is at least `debug` and the handler's body validates
   request input, THEN the system SHALL emit one `debug` record at
   `['kb', 'rpc']` with message `Parameters: <inspected body>` where
   `<inspected body>` is the inspected form of the validated TypeBox body or
   query params (truncated to 2 KB if larger).
3. WHEN the handler completes successfully, THEN the system SHALL emit one
   `info` record at `['kb', 'rpc']` with message text matching the shape
   `Completed <STATUS> <REASON> in <DURATION_MS>ms` where `<DURATION_MS>` is
   computed from `performance.now()` deltas with one-decimal precision.
4. IF the handler throws (or returns a typed error per `rpcErrorContract`),
   THEN the system SHALL emit one `error` record at `['kb', 'rpc']` with
   structured props `{ message, stack, code }`, and the fingers-crossed sink
   SHALL flush the buffered records for the same `requestId` (DBG-4 §3).
5. WHEN any RPC log record is emitted, THEN it SHALL carry the structured
   context fields `{ requestId, action, method, path }` via Logtape's
   `withContext(...)`. The `requestId` SHALL be rendered as `req=<first-8-hex>`
   in the pretty formatter and as a structured property in JSON output.
6. WHEN an inbound HTTP request carries an `X-Request-Id` header, THEN the
   system SHALL use that header value as the `requestId`. Otherwise the
   system SHALL generate a `requestId` via `crypto.randomUUID()`.
7. WHEN the production RPC server (`createRpcServer` in
   `src/shell/main/rpc/server.ts`) is constructed, THEN it SHALL mount the
   composed plugin bundle `rpcCommonPlugins` exactly once, which in turn
   provides both `rpcErrorContract` and the RPC logger middleware.
8. WHEN the preview server (`tools/preview/server.ts`) is constructed, THEN
   it SHALL also mount `rpcCommonPlugins`. The preview server SHALL NOT
   duplicate the error-contract or logger definition inline.

## Requirement DBG-3: Database query logging

**User story:**
As a developer, I want every SQL query the app runs to be visible — full SQL,
bind values, row count, and duration — so I can see exactly what the
database is doing without attaching `sqlite3 -echo` or instrumenting calls by
hand.

### Acceptance criteria

1. WHEN a repository constructs its prepared statements via
   `repositoryStmts(db, '<Noun>', { … })`, THEN the helper SHALL return a
   typed bag whose properties are `bun:sqlite` `Statement`-shaped objects
   instrumented for logging. The helper SHALL accept a noun override per
   statement using the form `{ noun: '<OtherNoun>', sql: '<SQL>' }`.
2. WHEN `LOG_LEVEL` is at least `debug` and an instrumented statement's
   `.all()`, `.get()`, `.run()`, or `.values()` method is invoked, THEN the
   system SHALL emit one `debug` record at category `['kb', 'sqlite']` with
   message text matching the shape `<Noun> (<DURATION_MS>ms) rows=<COUNT>`
   and structured props `{ noun, sql, duration_ms, rows }`. The full SQL
   string SHALL be rendered on the indented continuation line of the pretty
   formatter and SHALL NOT be truncated.
3. WHEN `LOG_LEVEL=trace` and an instrumented statement is invoked, THEN the
   system SHALL additionally include `binds` (the parameter array) and a
   single-line `representation` string of the first result row. The
   `representation` SHALL use the Rails-style shape
   `#<<Noun> <field>: <value>, <field>: <value>, …>` truncated to 200
   characters with a trailing `…` if longer.
4. WHEN `LOG_LEVEL` is below `debug`, THEN the instrumented statement SHALL
   short-circuit via `logger.isEnabledFor('debug')` before measuring
   `performance.now()`. At default verbosity the wrapper SHALL add at most
   one boolean check of overhead per call.
5. WHEN an instrumented statement's `.iterate()` is invoked, THEN the system
   SHALL NOT measure or log a duration (timing depends on the consumer
   loop). The system MAY emit one `debug` record at iteration start with
   message `<Noun> iterate` and structured props `{ noun, sql }`.
6. WHEN `bun:sqlite` throws inside any instrumented method, THEN the system
   SHALL emit one `error` record at `['kb', 'sqlite']` with structured props
   `{ noun, sql, binds?, message, stack }` before rethrowing the original
   error untouched.
7. WHEN a repository file is reviewed, THEN it SHALL declare its noun
   exactly once via `repositoryStmts(db, '<Noun>', …)` per `Database`
   instance. Repeated noun declarations for the same database in the same
   file SHALL be a review failure.
8. WHEN `LOG_LEVEL=default` and the same SQL statement is executed twice in
   sequence, THEN the second execution SHALL NOT add measurable overhead
   compared to a direct `db.query(sql).run(...)` call. Statement caching by
   `bun:sqlite` is preserved.

## Requirement DBG-4: Per-request context propagation

**User story:**
As a developer, I want every log line that belongs to a single request — RPC
start, every SQL query it triggers, the response, and any error — to share a
correlation token, so that I can grep for one `req=` and see the entire
request story.

### Acceptance criteria

1. WHEN `configureMainLogging()` is called, THEN it SHALL pass a fresh
   `new AsyncLocalStorage()` instance as `contextLocalStorage` to
   `configureSync({…})`, so that `withContext(...)` survives `await`
   boundaries inside RPC handlers and inside the repositories they call.
2. WHEN the RPC logger middleware enters a handler, THEN it SHALL wrap the
   remainder of the handler chain in
   `withContext({ requestId, action, method, path }, () => …)`. Every nested
   `getLogger([...]).info|debug|trace|warn|error(…)` call inside that chain
   SHALL inherit those context fields without explicit propagation.
3. WHEN `LOG_LEVEL=default` and an RPC handler emits records at levels below
   `warning` and then throws, THEN the fingers-crossed sink SHALL flush all
   buffered records for that `requestId` to the underlying console sink
   before the `error` record. After the flush, the buffer for that
   `requestId` SHALL be released.
4. WHEN two RPC handlers are in flight concurrently, THEN their context
   fields SHALL NOT interleave or overwrite each other. Each handler's logs
   SHALL carry only its own `requestId`. This SHALL be exercised by an
   integration test that runs at least two overlapping handlers and asserts
   the log records partition cleanly by `requestId`.
5. WHEN the request context is bound via `withContext(...)`, THEN a `debug`
   record emitted from a repository inside that handler SHALL include
   `requestId` in its structured props without the repository needing to
   know the request exists. The `app-rpc` skill SHALL document this behavior.

## Requirement DBG-5: Renderer logging

**User story:**
As a developer, I want renderer code to be able to log to DevTools at a sane
default level, with the same `getLogger([...])` API as main, so that the
renderer's instrumentation surface matches the main process.

### Acceptance criteria

1. WHEN the renderer entry point (`src/shell/renderer/app.tsx`) is evaluated,
   THEN the first executable statement SHALL be `configureRendererLogging()`
   imported from `@shared/logging/renderer.config`. This call SHALL run
   before `react-dom/client` is imported.
2. WHEN `configureRendererLogging()` is called in development
   (`process.env.NODE_ENV !== 'production'`), THEN the effective Logtape
   level for `['kb', 'ui']` SHALL be `info`.
3. WHEN `configureRendererLogging()` is called in production
   (`process.env.NODE_ENV === 'production'`), THEN the effective Logtape
   level for `['kb', 'ui']` SHALL be `warning`.
4. WHEN `configureRendererLogging()` is called more than once (HMR reload),
   THEN every call after the first SHALL be a no-op (idempotency guard).
5. WHEN renderer code logs to category `['kb', 'ui']` or any sub-category
   under `['kb', 'ui', …]`, THEN the record SHALL appear in the webview's
   DevTools console (CEF at `localhost:9222` when `useCef` is set; WKWebView
   Inspector otherwise).
6. WHEN `configureRendererLogging()` is reviewed, THEN it SHALL NOT pass
   `contextLocalStorage` to `configureSync({…})` and SHALL NOT register the
   fingers-crossed sink. `node:async_hooks` is unavailable in the webview
   runtime; the renderer has no per-request boundary in this spec.
7. WHEN renderer code emits a log record, THEN `LOG_LEVEL` SHALL NOT affect
   the renderer's verbosity. The renderer dial is hardcoded in this spec.
8. WHEN the renderer code surface is reviewed, THEN there SHALL be no
   `console.*` calls in `src/shell/renderer/` other than those intentionally
   tunneled through Logtape's `getConsoleSink()`.

## Requirement DBG-6: Migration constraints

**User story:**
As a maintainer, I want the migration to leave the codebase strictly more
consistent than before — no dead code, no parallel logging APIs, no
backslide on naming conventions — so that a future reviewer cannot
accidentally introduce a `createLogger()` call.

### Acceptance criteria

1. WHEN this spec is complete, THEN `src/shared/logging/console.logger.ts`
   and `src/shared/logging/console.logger.spec.ts` SHALL NOT exist on disk.
2. WHEN this spec is complete, THEN the barrel `src/shared/logging/index.ts`
   SHALL NOT export any identifier named `createLogger`. The barrel SHALL
   export `getLogger`, `withContext`, `isEnabledFor`, `configureMainLogging`,
   `configureRendererLogging`, `parseLogVerbosity`, `LogVerbosity`,
   `repositoryStmts`, `rpcCommonPlugins`, and the moved `rpcErrorContract`.
3. WHEN this spec is complete, THEN `bunx knip` SHALL report zero unused
   exports related to `createLogger`, the deleted `console.logger.ts`, or
   the moved `rpc_error.contract.ts`.
4. WHEN any file under `src/` is reviewed, THEN it SHALL NOT contain a
   `console.log`, `console.info`, `console.warn`, `console.error`, or
   `console.debug` call. The single exception is the renderer's
   `getConsoleSink()` invocation inside `renderer.config.ts`.
5. WHEN any file under `src/` is reviewed, THEN it SHALL NOT contain an
   identifier (constant, type, function, variable, parameter) that begins
   with the literal string `KB`. The repository-wide allowlist
   (`tools/naming_allowlist.txt`) SHALL NOT be expanded by this spec.
6. WHEN every existing `createLogger(...)` call site is migrated, THEN it
   SHALL use `getLogger([...])` with a category array beginning with `'kb'`
   and a meaningful area string. The full mapping table SHALL appear in
   [design.md](design.md) §"Call-site migration map".
7. WHEN any existing TypeBox schema, route, or repository test relies on the
   old `createLogger` signature, THEN the test SHALL be updated in the same
   commit that migrates the production call site, not in a follow-up.
8. WHEN the migration is complete, THEN `bunx tsc --noEmit` SHALL exit 0
   with no new errors compared to the pre-spec baseline.

## Requirement DBG-7: Documentation cascade

**User story:**
As a future maintainer of kb, I want a single canonical guide to logging
that explains the API, the verbosity dial, the category conventions, the
RPC and DB instrumentation contracts, the testing patterns, and the
observability roadmap, so I don't have to re-derive any of it from the
spec or the codebase.

### Acceptance criteria

1. WHEN this spec is complete, THEN `assets/guides/LOGGING_GUIDE.md` SHALL
   exist and SHALL contain the sections listed in [design.md](design.md)
   §"LOGGING_GUIDE.md outline".
2. WHEN this spec is complete, THEN `assets/guides/LOGGING_GUIDE.md` SHALL
   include an "Observability roadmap" section enumerating the deferred
   work items: field redaction, OpenTelemetry export, Sentry sink,
   rotating file sink, SQLite sink + in-app inspector, renderer→main
   ferry, cross-process trace IDs. Each item SHALL have a one-paragraph
   description with trigger condition and adoption cost.
3. WHEN this spec is complete, THEN `.agents/skills/app-logging/SKILL.md`
   SHALL exist with the same structural shape as
   `.agents/skills/app-rpc/SKILL.md` and SHALL be registered in both
   `assets/guides/SKILLS.md` and `assets/catalog/SKILLS.yaml`.
4. WHEN this spec is complete, THEN `CLAUDE.md` and `AGENTS.md` SHALL
   each contain a logging policy block stating: (a) use
   `getLogger([...])`, never `console.*` or `createLogger()`; (b)
   categories begin with `['kb', '<area>', …]`; (c) RPC handlers inherit
   `withContext({ requestId, … })` from `rpcCommonPlugins`; (d) SQL goes
   through `repositoryStmts()`.
5. WHEN this spec is complete, THEN `assets/guides/CODESTYLE_GUIDE.md`
   SHALL contain a Logging section that describes the `getLogger` API,
   category naming rules, when to use message placeholders vs. structured
   props, lazy evaluation, and the `withContext` requirement; with a
   cross-link to `LOGGING_GUIDE.md`.
6. WHEN this spec is complete, THEN `assets/guides/TESTING_GUIDE.md`
   SHALL contain a "Asserting on log output" subsection that explains the
   fixture sink pattern, how to capture and assert on `LogRecord[]`, and
   why snapshotting pretty-formatter output is forbidden.
7. WHEN this spec is complete, THEN
   `assets/docs/specs/foundation/design.md` SHALL include an "Observability"
   architectural decision pointing at this spec as the implementation of
   record. `assets/docs/specs/foundation/roadmap.md` SHALL include this
   feature in its phase ordering.
8. WHEN this spec is complete, THEN `README.md` SHALL include a one-
   paragraph "Debugging" subsection describing
   `LOG_LEVEL=verbose|debug|trace bun run dev` with a link to
   `LOGGING_GUIDE.md`.
9. WHEN this spec is complete, THEN `.agents/skills/app-context/SKILL.md`
   SHALL include a single paragraph in its architecture overview pointing
   at the `app-logging` skill for logging-related tasks.

## Requirement DBG-8: Quality gates and performance

**User story:**
As a maintainer, I want the quality gate to remain green throughout the
migration, and I want the new instrumentation to be invisible at default
verbosity, so that turning the dial off restores the pre-spec performance
profile.

### Acceptance criteria

1. WHEN any commit produced by this spec is applied, THEN
   `bash .agents/skills/app-quality-gate/scripts/gate.sh` SHALL exit 0.
2. WHEN any commit produced by this spec is applied, THEN
   `bun test` SHALL exit 0 with no skipped tests added by this spec.
3. WHEN any commit produced by this spec is applied, THEN
   `bunx tsc --noEmit` SHALL exit 0 with zero new errors.
4. WHEN any commit produced by this spec is applied, THEN
   `bunx knip` SHALL not report any new unused exports introduced by this
   spec.
5. WHEN `LOG_LEVEL` is unset and the same RPC handler is exercised 1 000
   times in a benchmark, THEN the median round-trip time SHALL NOT regress
   by more than 2 % compared to the pre-spec baseline measured on the
   same fixture. The benchmark MAY be a one-off Bun script; CI integration
   is out of scope.
6. WHEN `LOG_LEVEL=debug` is set and the same benchmark is run, THEN the
   median round-trip time MAY regress (instrumentation is expected to add
   cost). The regression magnitude SHALL be recorded in `tasks.md` and
   linked from `LOGGING_GUIDE.md` §"Performance notes".
7. WHEN every phase listed in [tasks.md](tasks.md) is checked off, THEN
   the receiving agent SHALL run the closure command set:

   ```sh
   bun test
   bunx tsc --noEmit
   bunx knip
   bash .agents/skills/app-quality-gate/scripts/gate.sh
   git diff --check
   ```

   All five commands SHALL exit 0.

## Appendix A — Verbosity dial reference

| `LOG_LEVEL` (case-insensitive) | Effective Logtape level for `['kb']` | Sink mode       | What appears                                                                  |
| ------------------------------ | ------------------------------------ | --------------- | ----------------------------------------------------------------------------- |
| unset                          | `warning`                            | fingers-crossed | Errors only. Buffered context flushed on error.                               |
| `default`                      | `warning`                            | fingers-crossed | Same as unset.                                                                |
| `verbose`                      | `info`                               | plain           | Adds RPC `Started`/`Completed` lines.                                         |
| `debug`                        | `debug`                              | plain           | Adds RPC `Parameters` and full SQL + duration + rows.                         |
| `trace`                        | `trace`                              | plain           | Adds SQL bind values + first-row representation; adds context-bound metadata. |
| anything else                  | `warning`                            | fingers-crossed | Same as `default` + one `warning` on `['logtape','meta']`.                    |

Renderer is unaffected by `LOG_LEVEL`. Renderer effective level is `info` in
development and `warning` in production.

## Appendix B — Category map

| Category                      | Used by                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `['kb']`                      | Root logger for the kb namespace; sink fan-out is registered here. |
| `['kb', 'main']`              | Main process boot (`src/shell/main/main.ts`).                      |
| `['kb', 'app']`               | AppService (`src/shell/app/app.ts`).                               |
| `['kb', 'app', 'sync']`       | Sync service (`src/shell/app/db/import.service.ts` + sync util).   |
| `['kb', 'app', 'task']`       | Task source util (`src/shell/app/lib/app_task_source.util.ts`).    |
| `['kb', 'rpc']`               | RPC request lifecycle (Elysia logger middleware).                  |
| `['kb', 'sqlite']`            | DB statement instrumentation (`repositoryStmts` wrapper).          |
| `['kb', 'ui']`                | Top-level renderer events (mount/unmount, error boundaries).       |
| `['kb', 'ui', 'list-page']`   | List page lifecycle, selection, filter changes.                    |
| `['kb', 'ui', 'detail-page']` | Detail page lifecycle.                                             |
| `['kb', 'ui', 'rpc-client']`  | Eden Treaty call sites — outgoing RPC.                             |
| `['kb', 'ui', 'sync']`        | Sync progress and toast handling in the renderer.                  |
| `['logtape', 'meta']`         | Reserved by Logtape itself; surfaced at `warning` only.            |

The category map is canonical for this spec; `LOGGING_GUIDE.md` may add new
`['kb', 'ui', …]` sub-categories without re-opening this spec.
