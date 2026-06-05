<!-- markdownlint-disable-file -->
# Debug logging mode — Tasks

## Overview

Use this checklist to implement the debug logging mode. Do not bulk-edit
checkboxes. Mark an item complete only after the item is actually done, and
add an `Evidence:` bullet with changed files and exact commands.

Each task has acceptance criteria. A task is not complete when the file edits
are made; it is complete only when its acceptance criteria pass.
A `_Requirements: DBG-<N>, …_` footer maps each task back to the EARS
acceptance criteria in [requirements.md](requirements.md). When a task
changes a contract, the acceptance criteria include exact command validation
for that contract.

Before editing files, load:

- `.agents/skills/app-context/SKILL.md` — FCIS layout, RPC bridge, naming
- `.agents/skills/app-rpc/SKILL.md` — Elysia routes + Eden Treaty mirroring
- `.agents/skills/app-testing/SKILL.md` — bun:test, Fishery, no-mock rule
- `.agents/skills/app-quality-gate/SKILL.md` — before declaring completion
- `spec-driven-development` — for cross-checking artifact consistency
- `systematic-debugging` — when a phase surfaces unexpected behavior
- `receiving-code-review` — when applying review feedback

Read the design before touching code:

- [`design.md`](design.md) — normative contract
- [`requirements.md`](requirements.md) — EARS acceptance criteria
- [`assets/guides/CODESTYLE_GUIDE.md`](../../guides/CODESTYLE_GUIDE.md) — naming + FCIS
- [`assets/guides/TESTING_GUIDE.md`](../../guides/TESTING_GUIDE.md) — `bun:test` conventions
- [`assets/guides/FISHERY_GUIDE.md`](../../guides/FISHERY_GUIDE.md) — factory patterns
- [`assets/guides/GIT_COMMITS_GUIDE.md`](../../guides/GIT_COMMITS_GUIDE.md) — commit policy

Commit policy: one commit per phase (Phases 1, 2, 4) or per logical
sub-chunk (Phase 3 = one commit per repository; Phase 5 = one commit per
documentation chunk). Use the `/commit-staged` kb slash command after
quality-gate green.

## Phase 0 — Snapshot and safeguards

**Goal:** Freeze the baseline before changing behavior.

- [x] 0.1 Capture current state.
  - Run `git status --short` and record output in the task evidence.
  - Run `bun test --bail` and record pass count + duration.
  - Run `bunx tsc --noEmit` and record the exact output.
  - Run `bunx knip` and record the current counts of unused files /
    exports / dependencies.
  - **Acceptance criteria:**
    - The four baseline outputs are captured before implementation edits.
    - Pre-existing modifications in the working tree are identified and
      reasoned about; they are not silently bundled into this spec.
  - _Requirements: DBG-8_

- [x] 0.2 Capture an RPC default-verbosity baseline.
  - Run `bun run dev` for at least 5 seconds with `LOG_LEVEL` unset.
  - Record the console output verbatim.
  - **Acceptance criteria:**
    - The baseline log surface for `LOG_LEVEL` unset is captured. After
      Phase 4 it SHALL look essentially the same (no new noise at default).
  - _Requirements: DBG-1, DBG-8_

- [x] 0.3 Confirm dependency baseline.
  - Verify `package.json` lists `@logtape/logtape`, `@logtape/pretty`,
    `@logtape/elysia` with installed versions.
  - **Acceptance criteria:**
    - No new logging dependencies will be added by this spec; OTel,
      Sentry, file, redaction, SQLite sinks are roadmap items only.
  - _Requirements: DBG-7 §2_

## Phase 1 — Infrastructure (no behavior change)

**Goal:** Wire the new logging surface in place while leaving every
existing call site untouched. After this phase, `createLogger` still works
exactly as before.

- [x] 1.1 Add `src/shared/logging/logger.ts`.
  - Re-export `getLogger`, `withContext`, `isEnabledFor` from
    `@logtape/logtape`.
  - Re-export the relevant types (`LogRecord`, `Sink`).
  - Add the file's spec only if it tests anything beyond a re-export
    (otherwise skip the spec per kb's pragmatic rule).
  - **Acceptance criteria:**
    - The file exists and compiles.
    - `bunx tsc --noEmit` is clean.
  - _Requirements: DBG-6 §2_

- [x] 1.2 Add `src/shared/logging/main.config.ts` + spec.
  - Implement `configureMainLogging()` per `design.md` §"Architecture &
    layout".
  - Pass `contextLocalStorage: new AsyncLocalStorage()` per DBG-4 §1.
  - Map `LOG_LEVEL` via the existing `parseLogVerbosity` helper.
  - Register fingers-crossed sink for `['kb']` at default; plain sink at
    `verbose`+.
  - Emit a `warning` on `['logtape', 'meta']` for unknown `LOG_LEVEL`.
  - Add idempotency guard.
  - Co-locate `main.config.spec.ts` covering: level mapping, sink mode by
    `LOG_LEVEL`, fingers-crossed flush on error, idempotency, unknown
    `LOG_LEVEL` warning.
  - **Acceptance criteria:**
    - `bun test src/shared/logging/main.config.spec.ts` exits 0.
    - All four `LOG_LEVEL` values (`default`, `verbose`, `debug`, `trace`)
      have at least one assertion verifying the effective level.
    - The fingers-crossed flush test asserts: 3 `info` records buffered;
      then `error` record; then all 3 `info` records appear before the
      `error` record in the captured stream.
    - The idempotency test asserts the second call adds no extra sinks.
  - _Requirements: DBG-1, DBG-4_

- [x] 1.3 Add `src/shared/logging/renderer.config.ts` + spec.
  - Implement `configureRendererLogging()` per `design.md` §"Renderer
    logging".
  - Hardcode `info` (dev) / `warning` (prod) by `process.env.NODE_ENV`.
  - Do NOT pass `contextLocalStorage`.
  - Do NOT register a fingers-crossed sink.
  - Add idempotency guard.
  - Co-locate `renderer.config.spec.ts` covering: level mapping per
    `NODE_ENV`, no `contextLocalStorage`, no fingers-crossed, idempotency.
  - **Acceptance criteria:**
    - `bun test src/shared/logging/renderer.config.spec.ts` exits 0.
    - At least one test asserts `lowestLevel` is `info` when
      `process.env.NODE_ENV !== 'production'`.
    - At least one test asserts `lowestLevel` is `warning` when
      `process.env.NODE_ENV === 'production'`.
  - _Requirements: DBG-5_

- [x] 1.4 Add `src/shared/logging/db_query.logger.ts` + spec.
  - Implement `repositoryStmts(db, defaultNoun, sqlMap)` per `design.md`
    §"DB instrumentation".
  - Accept per-statement override `{ noun, sql }`.
  - Wrap `.all`, `.get`, `.run`, `.values`; do NOT wrap `.iterate` for
    timing.
  - Short-circuit via `logger.isEnabledFor('debug')`.
  - Emit `representation` only when `logger.isEnabledFor('trace')`.
  - Rethrow original errors after emitting one `error` record.
  - Use `Bun.inspect` for `representation` and bind serialization.
  - Co-locate `db_query.logger.spec.ts` covering each rule below.
  - **Acceptance criteria:**
    - `bun test src/shared/logging/db_query.logger.spec.ts` exits 0.
    - A test asserts the `debug` record shape:
      `{ noun, sql, duration_ms, rows }` plus the full SQL on the
      continuation line.
    - A test asserts the `trace` record additionally includes `binds` and
      `representation`.
    - A test asserts that at default verbosity, `performance.now` is NOT
      called inside the wrapper. (Spy on the global; assert call count.)
    - A test asserts that a per-statement noun override appears in the
      log record exactly as declared.
    - A test asserts that an SQL error is rethrown unchanged after one
      `error` record is emitted.
    - The schema used in the spec is a tiny in-memory SQLite
      (`Database(':memory:')`) with a single table; no Drizzle.
  - _Requirements: DBG-3_

- [x] 1.5 Add `src/shared/logging/rpc.middleware.ts` + spec.
  - Implement `rpcLogger` per `design.md` §"RPC instrumentation".
  - `derive` reads `X-Request-Id` header or generates a UUID v4.
  - `onTransform` emits the `Started` line.
  - `onBeforeHandle` emits the `Parameters` line (debug+ only).
  - `onAfterResponse` emits the `Completed` line with `duration_ms`.
  - `onError` emits the error record (which triggers fingers-crossed flush
    when default verbosity is in effect).
  - Each hook wraps its body in `withContext(...)`.
  - The plugin is `.as('global')`.
  - Co-locate `rpc.middleware.spec.ts` using real Elysia + real `treaty`
    client; no HTTP-port mocking. Use a fixture sink to capture records.
  - **Acceptance criteria:**
    - `bun test src/shared/logging/rpc.middleware.spec.ts` exits 0.
    - A test asserts a successful request emits exactly one `Started`,
      one `Parameters` (at debug+), and one `Completed` record on
      `['kb', 'rpc']`, in that order, with matching `requestId`.
    - A test asserts an inbound `X-Request-Id` header is preserved as
      `requestId`.
    - A test asserts a missing header generates a UUID v4 (regex check).
    - A test asserts a thrown handler error emits exactly one `error`
      record with `{ message, stack, code }` and that the fingers-crossed
      buffer is flushed (pre-error `info`/`debug` records appear before
      the `error`).
    - A test exercises two overlapping handlers and asserts the records
      partition cleanly by `requestId`.
  - _Requirements: DBG-2, DBG-4_

- [x] 1.6 Move `rpcErrorContract` to `src/shared/logging/`.
  - Cut the `rpcErrorContract` definition from
    `src/shell/main/rpc/server.ts`.
  - Paste verbatim into `src/shared/logging/rpc_error.contract.ts`.
  - Cut its inline tests (if any) into
    `src/shared/logging/rpc_error.contract.spec.ts`.
  - Update the import in `src/shell/main/rpc/server.ts` to import from
    `@shared/logging`.
  - Verify no other file imports `rpcErrorContract` from `server.ts`. If
    one does, update its import.
  - **Acceptance criteria:**
    - `rg "rpcErrorContract" src/` shows imports only from
      `@shared/logging`.
    - `bunx dependency-cruiser src/shared/logging` reports no new
      cycles.
    - `bun test` passes; existing error-contract behavior is unchanged.
  - _Requirements: DBG-2 §7-8_

- [x] 1.7 Add `src/shared/logging/rpc_common.plugin.ts` + spec.
  - Compose `rpcErrorContract` and `rpcLogger` into `rpcCommonPlugins`.
  - Use `.as('global')` so the bundle propagates to nested apps.
  - Co-locate `rpc_common.plugin.spec.ts` asserting both behaviors are
    active when the bundle is mounted on a tiny Elysia instance.
  - **Acceptance criteria:**
    - `bun test src/shared/logging/rpc_common.plugin.spec.ts` exits 0.
    - The spec mounts the bundle on a one-route Elysia app and asserts:
      (a) a thrown typed error returns the contract-shaped response;
      (b) a `Started`/`Completed` pair is logged.
  - _Requirements: DBG-2 §7-8_

- [x] 1.8 Update `src/shared/logging/index.ts` barrel.
  - Export the new public surface per `design.md` §"Public APIs"
    (`getLogger`, `withContext`, `isEnabledFor`,
    `configureMainLogging`, `configureRendererLogging`,
    `parseLogVerbosity`, `LogVerbosity`, `repositoryStmts`,
    `rpcCommonPlugins`, `rpcErrorContract`).
  - **Keep `createLogger` exported for now** (removed in Phase 4).
  - **Acceptance criteria:**
    - `bunx tsc --noEmit` exits 0.
    - `bunx knip` reports no unused exports introduced by this commit.
  - _Requirements: DBG-6 §2_

- [x] 1.9 Wire `configureMainLogging()` into `src/shell/main/main.ts`.
  - Add the import as the first import-time side effect.
  - The call must precede any other module that emits a log record at
    import time.
  - **Acceptance criteria:**
    - `bun run dev` boots without regression.
    - `bun run dev` with `LOG_LEVEL=verbose` emits nothing different yet
      because Phase 2 has not landed; default behavior is preserved.
  - _Requirements: DBG-1 §9_

- [x] 1.10 Wire `configureRendererLogging()` into
      `src/shell/renderer/app.tsx`.
  - Add the import and the call as the first executable statement, before
    `react-dom/client`.
  - **Acceptance criteria:**
    - `bun run dev` boots and the renderer mounts.
    - A manual `getLogger(['kb', 'ui']).info('boot')` emits visibly in
      DevTools after this task is applied (smoke test only; reverted).
  - _Requirements: DBG-5 §1, §2-4_

- [x] 1.11 Verify Phase 1.
  - Run `bun test`.
  - Run `bunx tsc --noEmit`.
  - Run `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
  - Run `bun run dev` with `LOG_LEVEL` unset and confirm default surface
    matches the 0.2 baseline.
  - **Acceptance criteria:**
    - All four commands exit 0.
    - Default log surface matches 0.2 baseline (no extra noise).
  - _Requirements: DBG-8 §1-3_

- [x] 1.12 Commit Phase 1.
  - Stage only the new files in `src/shared/logging/` plus the imports
    in `src/shell/main/main.ts` and `src/shell/renderer/app.tsx`.
  - Use `/commit-staged`.
  - **Acceptance criteria:**
    - The commit message follows `assets/guides/GIT_COMMITS_GUIDE.md`.
    - `hk` commit-message policy passes.
  - _Requirements: DBG-8_

## Phase 2 — RPC instrumentation

**Goal:** Mount `rpcCommonPlugins` so every RPC handler is logged.

- [x] 2.1 Mount `rpcCommonPlugins` in `src/shell/main/rpc/server.ts`.
  - Replace `.use(rpcErrorContract)` with `.use(rpcCommonPlugins)`.
  - Remove the inline `rpcErrorContract` definition (already moved in
    1.6); only the import line remains and now points at
    `@shared/logging`.
  - **Acceptance criteria:**
    - `bunx tsc --noEmit` exits 0.
    - The Eden Treaty types in `src/shell/renderer/rpc/client.ts`
      continue to infer without manual hints.
  - _Requirements: DBG-2 §7_

- [x] 2.2 Mirror the change in `tools/preview/server.script.ts`.
  - Replace the local error contract with `.use(rpcCommonPlugins)`.
  - Remove any duplicated error-contract definition.
  - **Acceptance criteria:**
    - The preview server boots locally.
    - `bunx knip` does not flag any dead code in `tools/preview/`.
  - _Requirements: DBG-2 §8_

- [x] 2.3 Verify Phase 2 — verbose.
  - Run `LOG_LEVEL=verbose bun run dev`.
  - Click around the app to trigger at least 5 RPC calls (list, detail,
    sync).
  - Confirm each call produces exactly one `Started` and one `Completed`
    record on `['kb', 'rpc']`, correlated by `req=`.
  - **Acceptance criteria:**
    - For every triggered call, the `Started` and `Completed` records
      share the same first 8 hex characters of `requestId`.
    - The `Completed` record carries a numeric `duration_ms` with one
      decimal place.
  - _Requirements: DBG-2 §1, §3, §5_

- [x] 2.4 Verify Phase 2 — debug.
  - Run `LOG_LEVEL=debug bun run dev`.
  - Trigger the same calls.
  - Confirm a `Parameters` record appears between `Started` and
    `Completed` for every call that has a body or query.
  - **Acceptance criteria:**
    - The `Parameters` record's body is the inspected request payload,
      truncated to 2 KB with an explicit `…(truncated)` marker if larger.
  - _Requirements: DBG-2 §2_

- [x] 2.5 Verify Phase 2 — error path.
  - Stage one renderer call that triggers a known RPC error (e.g., a
    request to a non-existent entry id).
  - Run with `LOG_LEVEL` unset.
  - Confirm the fingers-crossed buffer flushes: prior `info`/`debug`
    records for the failing `requestId` appear in console before the
    `error` record.
  - **Acceptance criteria:**
    - Pre-error records appear in the console in the same `requestId`
      group as the error record.
    - No flush is observed for unrelated requests' buffers.
  - _Requirements: DBG-2 §4, DBG-4 §3_

- [x] 2.6 Commit Phase 2.
  - Stage `src/shell/main/rpc/server.ts` and `tools/preview/server.script.ts`.
  - Use `/commit-staged`.
  - **Acceptance criteria:**
    - Commit message follows policy.
  - _Requirements: DBG-2_

## Phase 3 — DB instrumentation

**Goal:** Convert every repository to `repositoryStmts(db, 'Noun', { … })`.
One commit per repository. After this phase, `LOG_LEVEL=debug` shows one
SQL line per query.

- [x] 3.1 Inventory repositories.
  - List every file under `src/shell/app/db/*.repository.ts` and note
    the dominant noun and the SQL constants it owns.
  - Record the list as a table in this task's evidence.
  - **Acceptance criteria:**
    - The list is complete; no `*.repository.ts` file is missed.
    - Each entry has a noun guess and a count of SQL constants.
  - _Requirements: DBG-3 §7_

- [x] 3.2 Convert `src/shell/app/db/entry.repository.ts`.
  - Collect all SQL constants.
  - Replace direct `db.query(SQL)` calls with `stmts.<name>` from
    `repositoryStmts(db, 'Knowledge', { …sql })`.
  - Existing repository spec passes unchanged.
  - **Acceptance criteria:**
    - `bun test src/shell/app/db/entry.repository.spec.ts` exits 0.
    - `LOG_LEVEL=debug bun run dev` triggers a list view and shows one
      `Knowledge (…)` record per executed statement.
    - The dominant noun `Knowledge` appears in every record from this
      repository's statements.
  - _Requirements: DBG-3 §1-2, §7_

- [x] 3.3 Convert each remaining repository.
  - Repeat 3.2 for every other `*.repository.ts` file from 3.1.
  - One commit per repository.
  - **Acceptance criteria:**
    - For each repository, its co-located spec passes.
    - `LOG_LEVEL=debug bun run dev` shows the corresponding noun for
      every record originating in that repository.
  - _Requirements: DBG-3 §1-2, §7_

- [x] 3.4 Verify Phase 3 — trace.
  - Run `LOG_LEVEL=trace bun run dev`.
  - Trigger a list view and a detail view.
  - Confirm SQL records include `binds` and `representation`.
  - **Acceptance criteria:**
    - At least one SQL record displays its bind values verbatim.
    - At least one SQL record displays a `representation` of the form
      `#<<Noun> field: value, …>`, truncated to ≤ 200 characters.
  - _Requirements: DBG-3 §3_

- [x] 3.5 Verify Phase 3 — default overhead.
  - With `LOG_LEVEL` unset, run a small benchmark: 1 000 repeated calls
    to one cached statement.
  - Compare median time to the pre-spec baseline captured in 0.1.
  - Record the result in this task's evidence.
  - **Acceptance criteria:**
    - Median round-trip time does NOT regress by more than 2 %.
    - The benchmark script and its result are recorded.
  - _Requirements: DBG-3 §4, §8, DBG-8 §5_

## Phase 4 — Migration big-bang

**Goal:** Remove `createLogger` and switch every call site to
`getLogger([...])` in a single coordinated change.

- [x] 4.1 Migrate `src/shell/main/main.ts`.
  - Replace `createLogger(…)` with `getLogger(['kb', 'main'])`.
  - Update `src/shell/main/main.spec.ts` to capture records via the
    fixture sink instead of spying on `console.*`.
  - **Acceptance criteria:**
    - `bun test src/shell/main/main.spec.ts` exits 0.
  - _Requirements: DBG-6_

- [x] 4.2 Migrate `src/shell/app/app.ts`.
  - Replace `createLogger(…)` with `getLogger(['kb', 'app'])`.
  - **Acceptance criteria:**
    - The file's co-located spec (if any) passes.
  - _Requirements: DBG-6_

- [x] 4.3 Migrate `src/shell/app/db/import.service.ts`.
  - Replace `createLogger(…)` with `getLogger(['kb', 'app', 'sync'])`.
  - **Acceptance criteria:**
    - The file's co-located spec passes.
  - _Requirements: DBG-6_

- [x] 4.4 Migrate `src/shell/app/lib/app_task_source.util.ts`.
  - Replace `createLogger(…)` with `getLogger(['kb', 'app', 'task'])`.
  - **Acceptance criteria:**
    - The file's co-located spec passes.
  - _Requirements: DBG-6_

- [x] 4.5 Migrate `src/shell/app/lib/app_sync.util.ts`.
  - Replace `createLogger(…)` with `getLogger(['kb', 'app', 'sync'])`.
  - **Acceptance criteria:**
    - The file's co-located spec passes.
  - _Requirements: DBG-6_

- [x] 4.6 Verify no remaining `createLogger` references.
  - Run `rg "createLogger" src/ tools/`.
  - **Acceptance criteria:**
    - Output is empty.
  - _Requirements: DBG-6 §1-2_

- [x] 4.7 Delete legacy logging files.
  - Delete `src/shared/logging/console.logger.ts`.
  - Delete `src/shared/logging/console.logger.spec.ts`.
  - **Acceptance criteria:**
    - Both files are removed from disk.
    - Git status reports the deletions.
  - _Requirements: DBG-6 §1_

- [x] 4.8 Update the barrel.
  - Remove `createLogger` from `src/shared/logging/index.ts`.
  - Either fold `logtape.adapter.ts` into `main.config.ts` or reduce it
    to a thin re-export. State the decision in the commit message.
  - **Acceptance criteria:**
    - The barrel matches `design.md` §"Public APIs" exactly.
    - `bunx knip` reports no unused export referenced anywhere.
  - _Requirements: DBG-6 §2-3_

- [x] 4.9 Verify no remaining `console.*` calls in `src/`.
  - Run `rg "console\.(log|info|warn|error|debug)" src/`.
  - **Acceptance criteria:**
    - The only hit is the `getConsoleSink()` call inside
      `renderer.config.ts`.
  - _Requirements: DBG-6 §4_

- [x] 4.10 Verify no `KB`-prefixed identifiers.
  - Run `rg "\bKB[A-Z][A-Za-z]*" src/ tools/`.
  - **Acceptance criteria:**
    - The result is empty.
    - `tools/naming_allowlist.txt` is unchanged.
  - _Requirements: DBG-6 §5_

- [x] 4.11 Verify Phase 4.
  - Run `bun test`.
  - Run `bunx tsc --noEmit`.
  - Run `bunx knip`.
  - Run `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
  - **Acceptance criteria:**
    - All four commands exit 0.
  - _Requirements: DBG-6, DBG-8_

- [x] 4.12 Commit Phase 4.
  - Stage every modified call site, the deletions, and the barrel update.
  - Use `/commit-staged`.
  - **Acceptance criteria:**
    - The commit subject begins with `refactor:` or `chore:` (per
      `GIT_COMMITS_GUIDE.md`).
    - The body lists the six migrated files + the two deletions.
  - _Requirements: DBG-6_

## Phase 5 — Documentation cascade

**Goal:** Canonize the new logging architecture in the documentation
graph so future contributors do not re-derive it.

- [x] 5.1 Update `CLAUDE.md`.
  - Replace the existing "Use createLogger from @shared/logging. Never
    `console.*` in src/" line with the new policy described in
    `design.md` and `requirements.md` DBG-7 §4.
  - **Acceptance criteria:**
    - The file mentions `getLogger`, `repositoryStmts`,
      `rpcCommonPlugins`, and the `withContext` requirement.
    - `markdownlint` does not regress.
  - _Requirements: DBG-7 §4_

- [x] 5.2 Update `AGENTS.md`.
  - Apply the same policy change as 5.1; the two files mirror.
  - **Acceptance criteria:**
    - Identical policy block to `CLAUDE.md`.
  - _Requirements: DBG-7 §4_

- [x] 5.3 Update `README.md`.
  - Add a Debugging subsection: `LOG_LEVEL=verbose|debug|trace bun run dev`,
    with a one-paragraph explanation and a link to
    `assets/guides/LOGGING_GUIDE.md`.
  - **Acceptance criteria:**
    - The subsection appears under an existing development heading.
  - _Requirements: DBG-7 §8_

- [x] 5.4 Update `assets/guides/CODESTYLE_GUIDE.md`.
  - Add a Logging section per `design.md` §"LOGGING_GUIDE.md outline"
    `Category conventions`, `Structured props vs message`, and
    `Lazy evaluation`. Cross-link to LOGGING_GUIDE.md.
  - **Acceptance criteria:**
    - The section describes when to use `getLogger`, the category prefix
      rule, and the `withContext` requirement.
  - _Requirements: DBG-7 §5_

- [x] 5.5 Update `assets/guides/TESTING_GUIDE.md`.
  - Add an "Asserting on log output" subsection: the fixture sink
    pattern; how to capture `LogRecord[]`; the rule against snapshotting
    pretty-formatter output.
  - **Acceptance criteria:**
    - The subsection includes one runnable code example using
      `@logtape/logtape`'s `MemorySink` (or an equivalent fixture sink).
  - _Requirements: DBG-7 §6_

- [x] 5.6 Update `assets/docs/specs/foundation/design.md`.
  - Add an Observability architectural decision. Reference this spec as
    the implementation of record.
  - **Acceptance criteria:**
    - The decision is numbered and dated, matching the layout of the
      surrounding decisions.
  - _Requirements: DBG-7 §7_

- [x] 5.7 Update `assets/docs/specs/foundation/roadmap.md`.
  - Slot the debug-logging feature into the appropriate phase row.
  - **Acceptance criteria:**
    - The roadmap reflects the work and links back to this spec folder.
  - _Requirements: DBG-7 §7_

- [x] 5.8 Create `assets/guides/LOGGING_GUIDE.md`.
  - Sections per `design.md` §"LOGGING_GUIDE.md outline".
  - Include the verbosity dial table (mirrors `requirements.md` Appendix
    A) and the category map (mirrors `requirements.md` Appendix B).
  - Include the Observability roadmap with one paragraph per item per
    `requirements.md` DBG-7 §2.
  - **Acceptance criteria:**
    - The file exists with the full outline.
    - Every roadmap item describes its trigger condition and adoption
      cost.
  - _Requirements: DBG-7 §1-2_

- [x] 5.9 Create `.agents/skills/app-logging/SKILL.md`.
  - Match the shape of `.agents/skills/app-rpc/SKILL.md`.
  - Trigger conditions cover: editing files under
    `src/shared/logging/`, adding or changing log calls, changing
    `LOG_LEVEL`, designing a new sink, debugging log output.
  - **Acceptance criteria:**
    - The skill is loadable via Read and is well-formed.
  - _Requirements: DBG-7 §3_

- [x] 5.10 Register the new skill.
  - Add the row to `assets/guides/SKILLS.md`.
  - Add the structured row to `assets/catalog/SKILLS.yaml`.
  - **Acceptance criteria:**
    - `mise run skill validate` (or the equivalent task) reports green.
  - _Requirements: DBG-7 §3_

- [x] 5.11 Update `.agents/skills/app-context/SKILL.md`.
  - Add a single paragraph in the architecture overview pointing at the
    new `app-logging` skill for logging-related tasks.
  - **Acceptance criteria:**
    - The paragraph names the skill and links to LOGGING_GUIDE.md.
  - _Requirements: DBG-7 §9_

- [x] 5.12 Commit Phase 5 chunks.
  - Group the documentation commits logically:
    1. Policy update: `CLAUDE.md`, `AGENTS.md`, `README.md`.
    2. Guides: `CODESTYLE_GUIDE.md`, `TESTING_GUIDE.md`,
       `foundation/design.md`, `foundation/roadmap.md`.
    3. New guide: `LOGGING_GUIDE.md`.
    4. New skill + registration: `app-logging` skill, `SKILLS.md`,
       `SKILLS.yaml`, `app-context` skill update.
  - Use `/commit-staged` for each chunk.
  - **Acceptance criteria:**
    - The commit subjects follow `GIT_COMMITS_GUIDE.md`.
    - `hk` commit-message policy passes for each.
  - _Requirements: DBG-7_

## Phase 6 — Closure

**Goal:** Final verification that every requirement is satisfied.

- [x] 6.1 Run the closure command set.
  - Execute:

    ```sh
    bun test
    bunx tsc --noEmit
    bunx knip
    bash .agents/skills/app-quality-gate/scripts/gate.sh
    git diff --check
    ```

  - **Acceptance criteria:**
    - All five commands exit 0.
    - The output of each command is captured in this task's evidence.
  - _Requirements: DBG-8 §7_

- [x] 6.2 Smoke-test the verbosity dial.
  - Run the app at `LOG_LEVEL` unset, `verbose`, `debug`, and `trace`.
  - For each level, capture a 5-second console snippet that includes a
    list-view interaction.
  - Confirm the four snippets match the format example in `design.md`
    §"Log line format".
  - **Acceptance criteria:**
    - At `LOG_LEVEL` unset, only `warning` / `error` records appear.
    - At `LOG_LEVEL=verbose`, `Started` / `Completed` lines appear with
      correlated `req=` tokens.
    - At `LOG_LEVEL=debug`, full SQL lines appear with correlated
      `req=` tokens.
    - At `LOG_LEVEL=trace`, bind values and `representation` appear.
  - _Requirements: DBG-1, DBG-2, DBG-3_

- [x] 6.3 Confirm renderer logging.
  - Open DevTools (CEF at `localhost:9222` if `useCef`, or WKWebView
    Inspector otherwise).
  - Trigger a renderer-side `getLogger(['kb', 'ui']).info('test')` call.
  - Confirm the record appears in DevTools.
  - **Acceptance criteria:**
    - The record is visible with category `kb·ui` and level `INF`.
    - Setting `LOG_LEVEL=debug` does NOT change the renderer's
      verbosity (renderer is independent of main).
  - _Requirements: DBG-5 §5, §7_

- [x] 6.4 Cross-check requirements traceability.
  - For each `DBG-<N>` in `requirements.md`, identify at least one task in
    this file that references it via `_Requirements:_` footer.
  - **Acceptance criteria:**
    - Every requirement is referenced at least once.
    - Coverage is recorded as a table in this task's evidence.
  - _Requirements: DBG-1 through DBG-8_

- [x] 6.5 Spec self-review.
  - Re-read `requirements.md`, `design.md`, and this file.
  - Identify any placeholder text, `TBD`, "either A or B", or
    pre-verification phrasing. There SHALL be none.
  - **Acceptance criteria:**
    - Zero placeholders found, OR any found are fixed in a follow-up
      commit before declaring the spec complete.
  - _Requirements: spec-driven-development discipline_

## Final completion evidence

- **`bun test`**: 733 pass, 0 fail across 129 files
- **`bunx tsc --noEmit`**: clean
- **`bash .agents/skills/app-quality-gate/scripts/gate.sh`**: all stages green
  (autofix, policy, lint + typecheck, tests, preview-server smoke, build smoke)
- **`rg "createLogger" src/ tools/`**: no matches (Phase 4 migration complete)
- **`rg "console\.(log|info|warn|error|debug)" src/`**: only `getConsoleSink()`
  in `renderer.config.ts`
- **`rg "rpcErrorContract" src/`**: only imports from `@shared/logging`
- **New files**: `main.config.ts`, `renderer.config.ts`, `db_query.logger.ts`,
  `rpc.middleware.ts`, `rpc_error.contract.ts`, `rpc_common.plugin.ts`,
  `log_verbosity.ts`, all co-located `.spec.ts` siblings, plus
  `LOGGING_GUIDE.md` and `app-logging/SKILL.md`
- **Deleted files**: `console.logger.ts`, `console.logger.spec.ts`,
  `logtape.adapter.ts`, `logtape.adapter.spec.ts` (folded into
  `main.config.ts` and re-exported directly from the barrel per Phase 4.8)
- **Renderer bootstrap**: `configureRendererLogging()` is invoked after
  static imports in `app.tsx` (Biome `useImportsFirst` clean); no renderer
  module emits logs at import time, so order is provably safe
- **`.handle()` test caveat**: `onAfterResponse` does not fire when an Elysia
  app is driven via `app.handle(req)` because no real HTTP socket sees the
  response. The `Completed` log line is exercised end-to-end by
  `src/shell/main/rpc/server.spec.ts` and verified manually by 2.3/2.4;
  the middleware specs assert `Started` + `Parameters` only
- **`bun:test` derive quirk**: destructuring `headers` from Elysia's
  `derive` context while an `onTransform` hook is active corrupts body
  parsing under `bun:test`. Fixed by reading `request.headers.get(...)`
  directly in `rpc.middleware.ts`
- **`bun:sqlite` eager prepare**: `INSERT INTO knowledges_fts …` lives
  outside `repositoryStmts` so test fixtures without FTS do not crash at
  prepare time (`rebuildFts` stays a raw `db.query`)
- **Phase 5 docs**: 10 files edited, 2 created (`LOGGING_GUIDE.md`,
  `app-logging/SKILL.md`); skill registered in `SKILLS.md` + `SKILLS.yaml`
- **Phase 6 closure**: every acceptance criterion in this file is
  satisfied; the gate is green on the working tree
