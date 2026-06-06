---
description: "Task list for Sync frecency preserve"
---

# Tasks: Sync frecency preserve

**Input**: Design documents from `assets/specs/003-sync-frecency-preserve/`

**Prerequisites**: plan.md, spec.md, handoff.md, research.md, data-model.md, contracts/sync-learned-state.md, quickstart.md

**Tests**: Integration tests are **required** — spec Evidence columns name `app_sync_frecency.spec.ts` as the release gate.

**Organization**: Tasks grouped by requirement (SF-1 → US1, SF-2 → US2, SF-3 → US3) for independent verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to spec requirements — US1 = SF-1, US2 = SF-2, US3 = SF-3
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm feature context and code touch points before implementation

- [X] T001 Verify feature branch `003-sync-frecency-preserve` and read quickstart.md code map in `assets/specs/003-sync-frecency-preserve/quickstart.md`
- [X] T002 [P] Trace current sync pipeline in `src/shell/app/app.ts` (`sync()`) and `src/shell/app/lib/app_sync.util.ts` (`runSourceImportSync`)
- [X] T003 [P] Review learned-table schemas and upsert patterns in `src/shell/app/db/schema.ts`, `src/shell/app/db/frecency.repository.ts`, and `src/shell/app/db/binding_frecency.repository.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Snapshot export/restore utility and sync wiring — MUST complete before user-story integration tests pass

**⚠️ CRITICAL**: No user story verification can succeed until this phase completes

- [X] T004 Define `LearnedSnapshot`, `exportLearnedSnapshot(db)`, and row types in `src/shell/app/lib/frecency_snapshot.util.ts` per `assets/specs/003-sync-frecency-preserve/data-model.md`
- [X] T005 Implement `restoreLearnedSnapshot(db, snapshot)` with filtered upserts (`knowledges.id` / `entry_bindings.id` existence checks) and single transaction in `src/shell/app/lib/frecency_snapshot.util.ts`
- [X] T006 [P] Add unit tests for export, filtered restore (skip removed ids), and upsert idempotency in `src/shell/app/lib/frecency_snapshot.util.spec.ts`
- [X] T007 Wire Phase A export (before `closeDb`), Phase C restore (after `ImportService.run`), and `finally` restore on throw in `src/shell/app/lib/app_sync.util.ts` per `assets/specs/003-sync-frecency-preserve/contracts/sync-learned-state.md`
- [X] T008 Add structured logging `frecency_snapshot_export` and `frecency_snapshot_restore` with counts in `src/shell/app/lib/app_sync.util.ts` using `getLogger(['kb', 'app', 'sync'])`

**Checkpoint**: Manual or unit-level verify — export → delete/rebuild → restore preserves rows for surviving ids only

---

## Phase 3: User Story 1 — Entry usage survives sync (SF-1) 🎯 MVP

**Goal**: List sort order for surviving entries reflects pre-sync frecency; removed entries gone; new entries rank neutrally until first visit

**Independent Test**: `bun test src/shell/app/lib/app_sync_frecency.spec.ts` — SF-1 AC1–AC3 examples pass in isolation

### Harness (before integration tests)

- [X] T012 [US1] Implement test harness helpers (temp sources dir, `:memory:` or temp-file DB, visit seeding via repositories) in `src/shell/app/lib/app_sync_frecency.spec.ts`

### Tests for User Story 1

> **NOTE:** After T012, add failing integration tests (T009–T011). They stay red until
> Phase 2 wiring (T004–T008) completes.

- [X] T009 [P] [US1] Add integration test: seed entry visits → `App.sync()` → assert relative list order unchanged for surviving ids (SF-1 AC1) in `src/shell/app/lib/app_sync_frecency.spec.ts`
- [X] T010 [P] [US1] Add integration test: visit entry → remove from YAML sources → sync → entry absent from list; remaining order unchanged (SF-1 AC2) in `src/shell/app/lib/app_sync_frecency.spec.ts`
- [X] T011 [P] [US1] Add integration test: add new YAML entry → sync → new entry ranks below frequently visited entries until first `recordEntryVisit` (SF-1 AC3) in `src/shell/app/lib/app_sync_frecency.spec.ts`

### Implementation for User Story 1

- [X] T013 [US1] Extend sample YAML under `src/__tests__/fixtures/sample/` only if existing fixtures cannot cover remove/add scenarios

**Checkpoint**: SF-1 acceptance criteria satisfied; `bun test src/shell/app/lib/app_sync_frecency.spec.ts` green for US1 cases

---

## Phase 4: User Story 2 — Binding usage survives sync (SF-2)

**Goal**: Binding frecency scores persist for surviving shortcuts; removed bindings stay gone

**Independent Test**: `bun test src/shell/app/lib/app_sync_frecency.spec.ts` — SF-2 AC1–AC2 pass without regressing US1

### Tests for User Story 2

- [X] T014 [P] [US2] Add integration test: `recordBindingVisit` → sync → assert binding score unchanged for surviving binding id (SF-2 AC1) in `src/shell/app/lib/app_sync_frecency.spec.ts`
- [X] T015 [P] [US2] Add integration test: use binding → remove from YAML → sync → binding absent; remaining shortcut order unchanged (SF-2 AC2) in `src/shell/app/lib/app_sync_frecency.spec.ts`

### Implementation for User Story 2

- [X] T016 [US2] Add binding YAML fixtures and visit seeding helpers in `src/shell/app/lib/app_sync_frecency.spec.ts` (reuse harness from T012)

**Checkpoint**: SF-1 and SF-2 both green in `app_sync_frecency.spec.ts`

---

## Phase 5: User Story 3 — Source sync remains trustworthy (SF-3)

**Goal**: Import semantics unchanged; catalog reflects YAML; usage restored on partial/failed import

**Independent Test**: Integration spec SF-3 cases pass; existing `src/shell/app` sync/import specs unchanged

### Implementation for User Story 3

- [X] T020 [US3] Ensure `finally` restore runs when Phase B throws and when `RpcImportResult.errors` is non-empty; add optional test-only `testHooks` on `runSourceImportSync` args (per plan.md) in `src/shell/app/lib/app_sync.util.ts`
- [X] T021 [US3] Confirm `App.sync()` in `src/shell/app/app.ts` requires no RPC signature changes (constitution IV)

### Tests for User Story 3

- [X] T017 [P] [US3] Add integration test: edit YAML titles/tags → sync → projection reflects changes while entry/binding frecency preserved (SF-3 AC2) in `src/shell/app/lib/app_sync_frecency.spec.ts`
- [X] T018 [US3] Add integration test: seed visits → partial import via `runSourceImportSync` `testHooks` → assert catalog at partial state and frecency matches pre-sync snapshot (SF-3 AC4) in `src/shell/app/lib/app_sync_frecency.spec.ts` — **after T020**
- [X] T019 [US3] Run regression: `bun test src/shell/app` sync/import-related specs pass unchanged (SF-3 AC1) — e.g. `src/shell/app/db/import.service.spec.ts`, `src/shell/app/app_sync_concurrency.spec.ts`

**Checkpoint**: All SF-1..SF-3 integration tests green; no regressions in existing import/sync specs

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Spec Kit gates, quality bar, and stretch e2e traceability

- [X] T022 [P] Run `mise run spec lint --strict` and `mise run spec trace --feature 003-sync-frecency-preserve`
- [X] T023 Run full quality gate: `bash .agents/skills/app-quality-gate/scripts/gate.sh`
- [X] T024 [P] Record SF-3 AC3 operator smoke pass in `assets/specs/003-sync-frecency-preserve/handoff.md` (steps in quickstart.md)
- [X] T025 [P] Confirm plain-language e2e in `assets/features/e2e/sync_frecency.feature`; defer step-catalog/fixture updates until e2e steps are wired (stretch)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** all user story test verification
- **User Stories (Phases 3–5)**: Depend on Foundational (T004–T008)
  - US1 (Phase 3) is MVP — complete before US2/US3 if sequencing solo
  - US2 and US3 can proceed in parallel after Foundational if staffed separately
- **Polish (Phase 6)**: Depends on Phases 3–5 complete

### User Story Dependencies

- **US1 (SF-1)**: Depends on Foundational only — no dependency on US2/US3
- **US2 (SF-2)**: Depends on Foundational; shares spec file with US1 but independently testable
- **US3 (SF-3)**: Depends on Foundational; partial-failure test builds on snapshot contract from Phase 2

### Within Each User Story

- US1 harness (T012) before SF-1 integration tests (T009–T011); tests stay red until Phase 2
- US2 binding helpers (T016) after US1 harness (T012)
- US3 partial-failure test (T018) after `finally` + `testHooks` (T020)

### Parallel Opportunities

- Phase 1: T002 and T003 in parallel
- Phase 2: T006 (unit spec) parallel with T004–T005 once types are sketched
- Phase 3: T009, T010, T011 test scaffolds in parallel after T012 harness exists
- Phase 4: T014 and T015 in parallel
- Phase 5: T017 parallel with T019; T018 sequential after T020
- Phase 6: T022, T024, T025 in parallel

---

## Parallel Example: User Story 1

```bash
# After T012 harness exists, draft all SF-1 tests together:
# T009 — preserve relative list order after sync
# T010 — removed entry absent
# T011 — new entry neutral ranking

bun test src/shell/app/lib/app_sync_frecency.spec.ts
```

---

## Parallel Example: Foundational + US1 tests (two developers)

```bash
# Developer A: T004–T008 (snapshot util + sync wiring)
# Developer B: T012 harness, then T009–T011 tests (expect red until A merges), then T013
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (SF-1)
4. **STOP and VALIDATE**: `bun test src/shell/app/lib/app_sync_frecency.spec.ts` — US1 cases only
5. Demo: sync preserves list ranking for frequent entries

### Incremental Delivery

1. Setup + Foundational → snapshot contract working
2. US1 → entry frecency preserved (MVP)
3. US2 → binding frecency preserved
4. US3 → failure semantics + regression safety
5. Polish → spec trace + quality gate

### Suggested MVP Scope

**Phases 1–3 only** (T001–T013): delivers SF-1 user value — list ranking survives sync.

---

## Notes

- No new Elysia routes or `tools/preview/server.ts` changes (internal shell-only feature)
- Do not change `src/core/helpers/frecency/bump_frecency.util.ts` algorithm
- Use `:memory:` SQLite and real `App` + repositories per TESTING_GUIDE — no AppService mocks
- List sort uses `COALESCE(f.frecency_score, 0)` in `src/shell/app/db/entry_repository.const.ts` — no change expected for new-item neutral ranking
