<!-- markdownlint-disable-file -->

# Source sync resilience — Requirements

## Introduction

Users maintain knowledge in many YAML files under a configured sources directory.
**Sync** rebuilds the SQLite database from those files. Real corpora include bad
rows (invalid tags, malformed chords, URL-shaped keys), unreadable files, and
large files that take noticeable time.

**Problem observed:** Sync appeared to hang (progress frozen, terminal flooded
with `Knowledge` query logs) while some files such as `devbox.yml` failed
validation. Investigation showed there is **no retry loop**; failures included
concurrent database access during sync, whole-file abort on the first bad entry
during parse, and UI progress that advances only **per file** (so long files
look “stuck”).

**Goal:** Sync SHALL always **terminate** with a definitive result, import every
row that can be validated, skip or roll back only what cannot be imported, and
surface **actionable errors** (file path + message) in the RPC result and sync UI.

This spec owns **import pipeline resilience and completion guarantees**.
Progress UI, modal layout, and toast copy remain in
[`sync-ui/design.md`](../sync-ui/design.md); this spec adds normative behavior
those surfaces must reflect.

## Out of scope

- Fixing user source YAML content (e.g. renaming `devbox.yml` URL keys).
- Auto-retry of failed files or sync sessions.
- Background/sync-on-watch or incremental delta import.
- Importing non-YAML formats (VS Code keymap JSON, etc.).
- Changing collision-detection rules (warnings still reported after a successful
  import pass).

## Glossary

| Term                    | Meaning                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| **Sync**                | Full rebuild: delete DB (non–in-memory), run `ImportService.runOnce`, emit progress and complete. |
| **File bundle**         | One `*.{yml,yaml}` file: parse → zero or more entries → persist in one transaction when possible. |
| **File-level failure**  | Entire file skipped; no rows from that file committed.                                            |
| **Entry-level failure** | One map key / row rejected; other rows in the same file may still import.                         |
| **Completion**          | `sync` RPC resolves and renderer receives `syncComplete` with `RpcImportResult`.                  |

## Requirement syntax (EARS)

- `WHEN <trigger>, THEN <system> SHALL <response>.`
- `IF <precondition>, THEN <system> SHALL <response>.`
- `WHEN <trigger> AND <condition>, THEN <system> SHALL <response>.`

Each `## REQUIREMENT SY-N` maps to [design.md](design.md) and [tasks.md](tasks.md).

**Verifiable acceptance:** Every release-critical behavior appears here and/or
in Gherkin under `assets/features/e2e/` tagged `@spec:sync`. See
[`assets/docs/archive/README.md`](../README.md#verifiable-acceptance-no-orphan-checks).

---

## REQUIREMENT SY-1: Sync always completes

**User story:** As a user, I want sync to finish even when many files have errors,
so that I am never left with a spinning UI and an unknown database state.

### Acceptance criteria

1. WHEN the user starts sync from the list page, THEN the main process SHALL
   run import to completion (success or partial failure) and SHALL emit
   `syncComplete` with an `RpcImportResult` within **120 seconds** for the
   release e2e fixture corpus (≤ 10 source files).
   - **Measure:** `ImportService.runOnce` on `testingPaths.sample` completes in
     &lt; 5 s; e2e scenario `@spec:sync` “sync completes under error corpus”.
   - **Measure:** Unit test with `AbortSignal` or wall-clock guard: import of
     `src/__tests__/fixtures/sync/` finishes before timeout.

2. WHEN sync is in progress, THEN concurrent `list`, `getListStats`, and
   `getEntry` RPC calls SHALL NOT open a second writer on the database file
   being rebuilt.
   - **Measure:** `app_sync_concurrency.spec.ts` (or successor) passes; simulated
     concurrent `App.list` during sync does not cause `SQLITE_IOERR` / hang.

3. WHEN sync completes (with or without errors), THEN the app SHALL leave the
   database in a consistent state: schema present, FTS rebuilt, and list queries
   usable on the next `getDb()` open.
   - **Measure:** Post-sync `app.list({ limit: 1 })` returns without throw;
     `rebuildFts` ran (smoke query on FTS table or row count &gt; 0 when corpus
     has entries).

4. IF the user triggers sync while a sync is already running, THEN the renderer
   SHALL ignore the second request (existing `syncing` guard).
   - **Measure:** Existing `use_list_page_stats_sync` spec / manual: Sync button
     disabled while `syncing`.

---

## REQUIREMENT SY-2: File-level errors are isolated

**User story:** As a user, I want one broken file not to block the rest of my
library, so that a single mistake in `devbox.yml` does not prevent importing
`bookmarks.yml`.

### Acceptance criteria

1. WHEN a source file cannot be read (missing after glob, permission denied, or
   I/O error), THEN the system SHALL record one error string containing the
   **absolute file path** and SHALL continue with the next file.
   - **Measure:** Fixture `sync/unreadable.yml` or chmod-based temp file;
     `result.errors` mentions path; `processed === total` in progress.

2. WHEN a source file is not valid YAML at the document level, THEN the system
   SHALL treat it as a file-level failure, SHALL NOT import any row from that
   file, and SHALL continue.
   - **Measure:** Fixture `sync/malformed_yaml.yml`; zero inserts attributed to
     that file; error message includes filename.

3. WHEN a file-level failure occurs, THEN `RpcSyncFileResult` for that file SHALL
   have `ok: false`, `error` set to a non-empty message, and `inserted` and
   `updated` equal to **0**.
   - **Measure:** Unit test on `persistParsedSourceBundle` / full `runOnce`.

4. WHEN at least one file imports successfully and at least one file fails,
   THEN `RpcImportResult.errors.length` SHALL be ≥ 1 AND valid rows from
   successful files SHALL be queryable after sync.
   - **Measure:** E2e scenario (extends
     `settings_and_sync.feature`): valid fixture entries remain listed.

---

## REQUIREMENT SY-3: Entry-level errors inside a file

**User story:** As a user, I want valid rows in a partly broken file to import,
so that I do not lose good bookmarks because one key is wrong.

### Acceptance criteria

1. WHEN one entry key in a file fails schema or validation during parse, THEN
   the system SHALL record an error containing **file path**, **entry key** (or
   best-effort line hint), and validation message, and SHALL continue parsing
   remaining keys in the same file.
   - **Measure:** Fixture `sync/partial_valid.yml` (valid rows before and after
     a bad key); `result.inserted` includes valid rows; `result.errors` mentions
     the bad key. Replaces today’s behavior where `parseSourceFile` throws and
     aborts the whole file (see `mixed_invalid.yml` comment vs actual behavior).

2. WHEN one entry fails `isValidSourceRowMin` or upsert validation inside
   persist, THEN the system SHALL append an error and SHALL skip that row without
   aborting other rows in the same file **unless** the database transaction
   cannot be partially applied (see SY-4).
   - **Measure:** Extend or replace `mixed_invalid.yml` expectations in
     `import.service.spec.ts` to assert sibling valid rows land in DB.

3. WHEN entry-level errors exist in a file but at least one row persisted, THEN
   that file’s `RpcSyncFileResult` SHALL have `ok: true` with non-zero
   `inserted` or `updated`, AND the file-level error strings SHALL still appear
   in `RpcImportResult.errors`.
   - **Measure:** Unit test documents dual outcome (partial success + error list).

4. WHEN reproducing the production `devbox.yml` class of failure (URL used as
   entry key, invalid tag token), THEN sync SHALL complete, SHALL report an error
   referencing `devbox` / the offending key, and SHALL import other valid files
   in the same corpus.
   - **Measure:** Fixture `sync/devbox_like.yml` derived from captured message:
     `Expected string to match '^[a-z0-9_]+$'` at a known line.

---

## REQUIREMENT SY-4: Persist failures and transactions

**User story:** As a maintainer, I want predictable DB state when SQLite or
   upsert logic fails mid-file.

### Acceptance criteria

1. WHEN all entries in a file are skipped due to validation (none to upsert),
   THEN the file SHALL count as processed in progress, SHALL NOT increment
   `filesProcessed`, and SHALL surface `ok: false` with an appropriate error.
   - **Measure:** Fixture `sync/all_entries_invalid.yml`.

2. WHEN `db.transaction` throws during persist of an otherwise valid bundle,
   THEN the system SHALL roll back that file’s transaction, SHALL record a
   file-level error, SHALL set `ok: false` for that file, and SHALL continue
   with the next file.
   - **Measure:** Unit test with injected failing upsert or constraint violation
     fixture.

3. WHEN sync finishes, THEN the system SHALL run `rebuildFts` and collision
   warning collection without hanging the event loop longer than **30 seconds**
   for the sample + sync fixture corpora combined.
   - **Measure:** Wall-clock bound in unit test or traced run documented in task
     evidence.

---

## REQUIREMENT SY-5: Progress and error reporting (user-visible)

**User story:** As a user, I want to see which file failed and why, and not
think sync is frozen while a large file imports.

### Acceptance criteria

1. WHEN sync processes multiple files, THEN the main process SHALL emit
   `syncProgress` after **each** file attempt (success or failure) with
   `processed`, `total`, and `recentFile` populated.
   - **Measure:** Unit test: callback count equals bundle count for sample dir.

2. WHEN sync runs on a corpus where file *N* contains many rows, THEN progress
   `processed` SHALL advance to *N* only after that file completes, AND the
   implementation SHALL yield the event loop between files so the UI can update
   (see design: `Bun.sleep(0)` or equivalent).
   - **Measure:** Design contract; optional unit test with mocked slow file.

3. WHEN sync completes with errors, THEN the sync modal SHALL remain in phase
   `done`, SHALL list each failed file in the file log with **Failed**, and
   SHALL allow **Inspect error** showing the same message as in
   `RpcSyncFileResult.error` (or joined entry errors for that file).
   - **Measure:** E2e `@spec:sync` scenario; aligns with `sync-ui` modal.

4. WHEN sync completes, THEN the renderer SHALL call `onComplete` exactly once
   per user-initiated sync (dedupe duplicate `syncComplete` push + HTTP response
   if needed).
   - **Measure:** Unit test on `syncRpc` / handler wiring (design SY-5).

5. WHEN `RpcImportResult.errors` is non-empty, THEN the completion toast or
   modal summary SHALL indicate that errors occurred and SHALL NOT claim a fully
   clean import.
   - **Measure:** `syncCompleteToastForResult` spec + e2e.

---

## REQUIREMENT SY-6: No retry storm

**User story:** As a maintainer, I want confidence that failures do not trigger
hidden retry loops.

### Acceptance criteria

1. WHEN a file fails parse or persist, THEN `ImportService` SHALL attempt that
   file **once** per sync invocation.
   - **Measure:** Code review + unit test counting `readFile` / parse calls per
     path (mock fs).

2. WHEN sync fails at the RPC layer, THEN the renderer SHALL NOT automatically
   re-invoke `syncRpc` without an explicit user action.
   - **Measure:** Grep / spec on `use_list_page_stats_sync` — no retry loop in
     `catch` or `onProgress`.

---

## REQUIREMENT SY-7: Sync modal error readability (follow-up)

**User story:** As a user, I want sync results summarized at a glance and each
file’s errors readable inside the modal at default window size, so I can fix
source YAML without hunting truncated text or scrolling past dozens of success
rows.

**Context (observed):** After a 64-file sync with 7 errors, the modal shows a
long success-only file log, a summary line `Errors: 7 (see log above)`, and a
truncated red error list below the fold. Failed or partial files are easy to
miss; `Inspect error` is a small link, not an obvious accordion.

### Acceptance criteria

1. WHEN sync reaches phase `done`, THEN the modal summary SHALL display three
   file-level counts on one line or compact block:
   - **Files processed** — `processed` (files attempted, equals progress total).
   - **Files imported** — count of files with `RpcSyncFileResult.ok === true`
     and no entry-level errors attributed to that file path.
   - **Files with errors** — count of files with `ok === false` **or** at least
     one string in `RpcImportResult.errors` prefixed with that file’s absolute
     path.
   - **Measure:** `sync_modal.component.spec.tsx` with mixed fileLog + summary;
     e2e `@spec:sync` scenario “Sync summary shows file totals”.

2. WHEN a file has any error (file-level `ok: false` or entry-level errors in
   `summary.errors` matching its path), THEN its row in the file log SHALL show
   a visible **error indicator** (minimum: 4px left bar using
   `var(--color-error)`; class `cmp-sync-modal-file-row--error`).
   - **Measure:** Component spec renders failed + partial file rows with error
     modifier; visual review at 680×600 default shell.

3. WHEN the user activates a file row with errors (click, tap, `Enter`, or
   `ArrowRight` while the row is focused), THEN the row SHALL expand as an
   accordion/disclosure revealing **all** error messages for that file
   (file-level `error` plus matching `summary.errors` strings), wrapped and
   scrollable inside the row (`white-space: pre-wrap`, `word-break: break-word`).
   - **Measure:** Component spec toggles expansion; keyboard test for
     `ArrowRight`; e2e expands `partial_valid.yml` and sees full tag message.

4. WHEN the user presses `ArrowLeft` or `Escape` on an expanded error row, THEN
   the row SHALL collapse.
   - **Measure:** Component spec.

5. WHEN sync completes with errors, THEN the modal SHALL **not** render the flat
   `cmp-sync-modal-summary-errors` bullet list (truncated duplicate). All error
   text SHALL live in per-file accordion panels only. Collision **warnings**
   MAY remain in the summary section.
   - **Measure:** Component spec: `summary.errors.length > 0` and no
     `cmp-sync-modal-summary-errors` list in DOM.

6. IF the file log contains more than zero error rows, THEN on transition to
   phase `done` the modal SHALL scroll the **first** error row into view (or
   auto-expand it) so errors are discoverable without manual search.
   - **Measure:** Component spec or e2e with corpus where first files succeed
     and `malformed_yaml.yml` fails.

7. WHEN a file partially imports (`ok: true` with entry-level errors), THEN the
   row SHALL still use the error indicator and accordion (not only `ok: false`
   rows).
   - **Measure:** E2e partial import scenario; unit test grouping helper.

---

## E2e traceability

| Requirement         | Gherkin (tag `@spec:sync`)                                                       |
| ------------------- | -------------------------------------------------------------------------------- |
| SY-1, SY-2, SY-5    | `assets/features/e2e/sync_resilience.feature` (new)                              |
| SY-2 (invalid file) | Existing `settings_and_sync.feature` — update tag to also reference `@spec:sync` |
| SY-1 completion     | `settings_and_sync.feature` sync completion scenario                             |
| SY-7 modal UX       | `sync_resilience.feature` — summary totals + accordion scenarios                 |

Normative steps: [`e2e/step-catalog.md`](../e2e/step-catalog.md) (§ Sync resilience, § Sync modal error UX).

Fixture manifest additions: [`e2e/fixture-manifest.md`](../e2e/fixture-manifest.md)
(§ Sync resilience corpus).
