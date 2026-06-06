<!-- markdownlint-disable-file -->

# Source sync resilience — Tasks

Ordered verification work. Each task lists **Requirements** (SY-*), **done when**
criteria, and suggested **evidence** commands.

**Skills:** `app-context`, `app-testing`, `app-rpc` (if RPC envelope changes),
`app-quality-gate` before declaring complete.

**Do not** weaken quality tools to pass tests.

---

## Phase 1 — Fixtures and parse contract

### Task 1.1 — Add sync fixture corpus

- **Requirements:** SY-2, SY-3, SY-4
- **Work:**
  - Create `src/__tests__/fixtures/sync/` with:
    - `partial_valid.yml` — valid entry, invalid entry (`broken-bookmark` style),
      valid entry after.
    - `devbox_like.yml` — reproduces tag regex / URL-key class from user
      `devbox.yml` investigation.
    - `malformed_yaml.yml` — invalid YAML document.
    - `all_entries_invalid.yml` — keys that all fail validation.
  - Document files in [design.md § Fixture directory](design.md#testing-strategy).
- **Done when:** Files exist; `bun test` can import directory path constant from
  `@testing` or local `syncFixtureDir`.
- **Evidence:** `ls src/__tests__/fixtures/sync/`

### Task 1.2 — Implement resilient source parse

- **Requirements:** SY-3, SY-2
- **Work:**
  - Add `SourceParseResult` + `parseSourceFileResilient` per
    [design.md § Parse API](design.md#parse-api-normative).
  - Co-locate `parse_source_file_resilient.spec.ts` under `src/core/`.
  - Keep `parseSourceFile` behavior documented (delegate or leave for rare
    fail-fast callers).
- **Done when:**
  - `partial_valid.yml` yields ≥ 2 entries and ≥ 1 error string.
  - `malformed_yaml.yml` yields 0 entries and 1 file-level error.
  - `devbox_like.yml` error mentions offending key or tag rule.
- **Evidence:** `bun test src/core/domain/models/entries/parsers/parse_source_file_resilient.spec.ts`

---

## Phase 2 — Import pipeline

### Task 2.1 — Wire ImportService to resilient parse

- **Requirements:** SY-2, SY-3, SY-6
- **Work:**
  - Update `loadParsedSourceBundleForPath` to use resilient parser.
  - Distinguish **file-level** bundle (`error` field) vs **partial** bundle
    (items + errors merged into `RpcImportResult.errors`).
  - Ensure each file attempted exactly once (no retry).
- **Done when:** `import.service.spec.ts` passes with updated expectations for
  `mixed_invalid.yml` / `partial_valid.yml` (valid siblings in DB).
- **Evidence:** `bun test src/shell/app/db/import.service.spec.ts`

### Task 2.2 — Completion and timeout guard

- **Requirements:** SY-1, SY-4
- **Work:**
  - Add unit test: `runOnce(syncFixtureDir)` completes within 30 s wall clock.
  - Verify `rebuildFts` + `hardCollisionWarningMessages` run after file loop.
  - Confirm import DB `close(true)` in `finally`.
- **Done when:** Timeout test green; no open handle leak on repeated sync in spec.
- **Evidence:** `bun test src/shell/app/db/import.service.spec.ts`

### Task 2.3 — Progress emission

- **Requirements:** SY-5
- **Work:**
  - Assert `onProgress` called once per globbed file (sample + sync dirs).
  - Verify `await Bun.sleep(0)` between files (present or add).
- **Done when:** Callback count test passes.
- **Evidence:** `bun test src/shell/app/db/import.service.spec.ts`

---

## Phase 3 — App concurrency

### Task 3.1 — Sync database busy guard

- **Requirements:** SY-1
- **Work:**
  - Verify or implement `syncInFlight` on `App.sync` + `getDb()` →
    `SyncDatabaseBusyError`.
  - Map to RPC 503 in Elysia plugin or handler wrapper if renderer needs
    distinguishable errors (optional v1: throw propagates as 500 — document).
- **Done when:** `app_sync_concurrency.spec.ts` passes; manual probe: no
  `SQLITE_IOERR` when listing during sync.
- **Evidence:** `bun test src/shell/app/app_sync_concurrency.spec.ts`

### Task 3.2 — Sync complete deduplication

- **Requirements:** SY-5
- **Work:**
  - Ensure `onComplete` runs once per user sync (guard in
    `list_sync_message_handlers` or `syncRpc` / push handler).
  - Extend `client.spec.tsx` or `use_list_page_stats_sync.hook.spec.tsx` if
    needed.
- **Done when:** Spec proves single `setSyncing(false)` + single refresh wave.
- **Evidence:** `bun test src/shell/renderer/hooks/list/use_list_page_stats_sync.hook.spec.tsx`

---

## Phase 4 — E2e

### Task 4.1 — Feature file and harness corpus

- **Requirements:** SY-1, SY-2, SY-3, SY-5
- **Work:**
  - Add `assets/features/e2e/sync_resilience.feature` (`@spec:sync` `@p1`).
  - Extend `e2e/support/seed_fixture.support.ts` (or Given step) to copy
    `src/__tests__/fixtures/sync/*` into isolated sources.
  - Update [fixture-manifest.md](../e2e/fixture-manifest.md) § Sync resilience.
- **Done when:** `bddgen` succeeds; scenarios tagged correctly.
- **Evidence:** `bun run e2e:bddgen`

### Task 4.2 — Step definitions

- **Requirements:** SY-5
- **Work:**
  - Implement steps from [step-catalog.md](../e2e/step-catalog.md) (§ Sync
    resilience — add rows in same PR).
  - Scenarios:
    1. Sync completes with partial_valid + malformed_yaml; list shows valid title.
    2. Modal shows failed file + inspect error text.
  - Add `@spec:sync` to existing invalid-file scenario in
    `settings_and_sync.feature`.
- **Done when:** `mise run test e2e --smoke` includes new scenarios green (or
  `@todo` removed when steps land — prefer green before beta).
- **Evidence:** `mise run test e2e --smoke`

### Task 4.3 — Preview server parity

- **Requirements:** SY-1
- **Work:**
  - If sync route behavior changes error envelope, mirror in
    `tools/preview/server.script.ts` per `app-rpc` skill.
- **Done when:** Preview smoke unchanged or updated intentionally.
- **Evidence:** `bun test tools/preview/` (if applicable)

---

## Phase 5 — Documentation cross-links

### Task 5.1 — Align data-layer fixture doc

- **Requirements:** SY-3
- **Work:**
  - Update `assets/docs/specs/data-layer/design.md` and `mixed_invalid.yml`
    comment to match entry-level behavior.
- **Done when:** No contradiction between data-layer table and sync spec.
- **Evidence:** Doc review in PR.

### Task 5.2 — Index spec in README

- **Requirements:** —
- **Work:**
  - Add bullet under [assets/docs/specs/README.md](../README.md) feature index.
- **Done when:** Link trio `sync/{requirements,design,tasks}.md` + handoff.
- **Evidence:** README renders links.

---

## Phase 6 — Quality gate

### Task 6.1 — Full gate

- **Requirements:** All SY-*
- **Done when:**
  - `bash .agents/skills/app-quality-gate/scripts/gate.sh` passes on the PR tree.
  - All new co-located specs exist per `AGENTS.md`.
- **Evidence:** Paste gate summary in PR or handoff evidence block.

---

## Task dependency graph

```txt
1.1 → 1.2 → 2.1 → 2.2 → 2.3
                ↓
              3.1 → 3.2 → 4.1 → 4.2 → 4.3
                ↓
              5.* → 6.1
```

Phases 3.1 and 2.* may proceed in parallel after 1.2.

---

## Phase 7 — Sync modal error UX (follow-up, SY-7)

**Depends on:** Phases 1–6 complete (import resilience shipped). **Skills:**
`react:components`, `app-context`, `app-testing`, `stitch-design` not required —
follow existing modal patterns and `sync.css` tokens.

### Task 7.1 — Error grouping util

- **Requirements:** SY-7 AC2, AC7
- **Work:**
  - Add `src/shell/renderer/components/shared/sync_modal_errors.util.ts`
  - Implement `buildFileLogViews(fileLog, summaryErrors)` per design.
  - Co-locate `sync_modal_errors.util.spec.ts` (partial file, file-level fail,
    dedupe, path prefix match).
- **Done when:** Spec covers `partial_valid.yml`-shaped errors grouped under
  correct basename.
- **Evidence:** `bun test src/shell/renderer/components/shared/sync_modal_errors.util.spec.ts`

### Task 7.2 — Accordion file log + stats strip

- **Requirements:** SY-7 AC1–AC6
- **Work:**
  - Refactor `sync_modal.component.tsx`:
    - Stats strip (processed / imported / with errors + row counts).
    - Accordion rows with error bar, keyboard (`ArrowRight` / `ArrowLeft` /
      `Escape`).
    - Remove `cmp-sync-modal-summary-errors` list.
    - Auto-scroll or auto-expand first error on `done`.
  - Update `sync.css` per design (4px error bar, readable detail text).
  - Extend `sync_modal.component.spec.tsx`.
- **Done when:** All SY-7 component measures pass; modal readable at 680×600.
- **Evidence:** `bun test src/shell/renderer/components/shared/sync_modal.component.spec.tsx`

### Task 7.3 — E2e scenarios

- **Requirements:** SY-7 AC1, AC3, AC6
- **Work:**
  - Add scenarios to `assets/features/e2e/sync_resilience.feature`:
    - Sync summary shows file totals (processed / imported / with errors).
    - Expanding failed file shows full error text (no truncation).
  - Add steps to `e2e/step-catalog.md` § Sync modal error UX.
  - Implement steps in `e2e/steps/settings_and_sync.steps.ts` or dedicated file.
- **Done when:** `mise run test e2e --smoke` green including new scenarios.
- **Evidence:** smoke run log

### Task 7.4 — Optional RPC `entryErrors` (only if grouping insufficient)

- **Requirements:** SY-7 AC7
- **Work:** Add `entryErrors?: string[]` to `RpcSyncFileResult`; populate in
  `ImportService`; mirror types in preview if needed.
- **Done when:** Partial files carry errors on push payload without client
  prefix matching.
- **Evidence:** `import.service.spec.ts` + grouping util simplified.
- **Note:** Skip unless Task 7.1 grouping fails review — YAGNI default.

### Task 7.5 — Quality gate

- **Requirements:** SY-7
- **Done when:** `bash .agents/skills/app-quality-gate/scripts/gate.sh` green.
- **Evidence:** gate log in PR.

```txt
Phase 7 graph:
7.1 → 7.2 → 7.3 → 7.5
      ↘ 7.4 (optional)
```
