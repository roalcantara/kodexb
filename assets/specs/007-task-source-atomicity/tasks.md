<!-- markdownlint-disable-file -->

# Tasks: Task source atomicity

**Input**: Design documents from `assets/specs/007-task-source-atomicity/`

**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Deterministic `bun:test` coverage is required by the spec evidence clauses for mutation success/failure/conflict, projection consistency, and diagnostics.

**Organization**: Tasks are grouped by user story so each requirement cluster can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel when work touches different files and does not depend on incomplete prerequisites.
- **[Story]**: Traceability label for requirement clusters (`US1` = TSA-1, `US2` = TSA-2, `US3` = TSA-3).
- Every task includes the primary file path that proves completion.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm scope and create the feature-specific spec/e2e scaffolding.

- [X] T101 Verify current task mutation touch points in `src/shell/main/rpc/routes/task.routes.ts`, `src/shell/app/lib/app_task_source.util.ts`, and `src/shell/app/db/task.repository.ts` for TSA-1/TSA-2/TSA-3 traceability
- [X] T102 [P] Create feature e2e file scaffold in `assets/features/e2e/task-source-atomicity.feature`
- [X] T103 [P] Add initial screenplay step placeholders for the new feature tag in `bdd/e2e/steps/task_management.steps.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared mutation outcome plumbing and contract surface used by all user stories.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [X] T104 Define/update shared mutation outcome types in `src/shared/rpc/task_mutation_outcome.types.ts`
- [X] T105 [P] Add mutation-aware failure message formatter in `src/shell/app/lib/task_mutation_failure_message.util.ts`
- [X] T106 Wire outcome schema and response envelope updates in `src/shell/main/rpc/routes/task.routes.ts`
- [X] T107 [P] Add foundational type/contract coverage in `src/shell/main/rpc/routes/task.routes.spec.ts`

**Checkpoint**: Routes and app shell share one outcome contract with explicit success/failure states.

---

## Phase 3: User Story 1 — Durable source outcome drives mutation result (Priority: P1) 🎯 MVP

**Goal**: Ensure create/update/delete/reorder return success only when source persistence succeeds, and failure responses are explicit and mutation-aware.

**Independent Test**: Failure-injection tests in app/rpc specs prove zero false-positive success and structured failure payloads across mutation operations.

### Tests for User Story 1

- [X] T108 [P] [US1] Add source-write success/failure response tests to `src/shell/main/rpc/routes/task.routes.spec.ts`
- [X] T109 [P] [US1] Add source-write failure behavior tests for mutation helpers in `src/shell/app/lib/app_task_source.util.spec.ts`

### Implementation for User Story 1

- [X] T110 [US1] Implement source-first completion semantics in `src/shell/app/lib/app_task_source.util.ts`
- [X] T111 [US1] Update mutation handlers to propagate explicit source failure outcomes in `src/shell/main/rpc/routes/task.routes.ts`
- [X] T112 [US1] Apply shared mutation-aware failure message template in `src/shell/app/lib/task_mutation_failure_message.util.ts`
- [X] T113 [US1] Ensure app service mutation callsites preserve no-success-on-failure contract in `src/shell/app/app.service.ts`

**Checkpoint**: TSA-1 acceptance criteria are satisfied for success/failure signaling and message consistency.

---

## Phase 4: User Story 2 — Projection consistency and conflict protection (Priority: P1)

**Goal**: Preserve projection/source consistency under failures and reject conflicting concurrent writes explicitly.

**Independent Test**: Tests prove projection remains unchanged/restored on source failure, sync does not reverse falsely successful operations, and stale writes return conflict.

### Tests for User Story 2

- [X] T114 [P] [US2] Add projection snapshot invariance tests in `src/shell/app/db/task.repository.spec.ts`
- [X] T115 [P] [US2] Add conflict-detection and source-version mismatch tests in `src/shell/main/rpc/routes/task.routes.spec.ts`
- [X] T116 [P] [US2] Add sync-after-failure regression test coverage in `src/shell/app/app.service.spec.ts`
- [X] T116A [P] [US2] Add explicit projection_failed semantics tests (source persisted, projection update failed, no silent rollback implication) in `src/shell/main/rpc/routes/task.routes.spec.ts`

### Implementation for User Story 2

- [X] T117 [US2] Enforce source-version conflict rejection in `src/shell/main/rpc/routes/task.routes.ts`
- [X] T118 [US2] Implement projection no-op/restore behavior for source-write failures in `src/shell/app/db/task.repository.ts`
- [X] T119 [US2] Ensure source-success then projection-update ordering in `src/shell/app/lib/app_task_source.util.ts`
- [X] T120 [US2] Wire sync consistency guard for failed mutation replay in `src/shell/app/app.service.ts`

**Checkpoint**: TSA-2 acceptance criteria are satisfied for conflict behavior, projection consistency, and sync regression protection.

---

## Phase 5: User Story 3 — Failure visibility and auditability (Priority: P2)

**Goal**: Emit structured, correlatable diagnostics for persistence failures without noisy failure logs on success paths.

**Independent Test**: Diagnostic tests validate one structured failure record per failure path, per-request correlation uniqueness, and zero failure diagnostics on success-only runs.

### Tests for User Story 3

- [X] T121 [P] [US3] Add structured failure logging assertions in `src/shell/app/lib/app_task_source.util.spec.ts`
- [X] T122 [P] [US3] Add correlation uniqueness assertions for repeated failures in `src/shell/main/rpc/routes/task.routes.spec.ts`
- [X] T123 [P] [US3] Add negative assertions ensuring no failure-specific diagnostics on success paths in `src/shell/main/rpc/routes/task.routes.spec.ts`

### Implementation for User Story 3

- [X] T124 [US3] Emit structured failure record (operation + correlation context) in `src/shell/app/lib/app_task_source.util.ts`
- [X] T125 [US3] Thread correlation context from RPC to app layer in `src/shell/main/rpc/routes/task.routes.ts`
- [X] T126 [US3] Normalize logger category/fields for mutation diagnostics in `src/shared/logging/index.ts`

**Checkpoint**: TSA-3 acceptance criteria are satisfied for visibility, correlation, and success-path noise suppression.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final traceability, e2e alignment, and gate validation.

- [X] T127 [P] Finalize Gherkin scenarios and `@spec:task-source-atomicity` tags in `assets/features/e2e/task-source-atomicity.feature`
- [X] T128 [P] Update e2e step coverage for new scenarios in `bdd/e2e/steps/task_management.steps.ts`
- [X] T129 Run focused verification for TSA-1/TSA-2/TSA-3 from quickstart (`bun test src/shell/app src/shell/main/rpc --filter task`)
- [X] T130 Run e2e filter validation for declared scenarios (TSA-1/TSA-2/TSA-3) (`bun test bdd/e2e --filter task-source-atomicity`)
- [X] T131 Run strict audit (`mise run spec audit assets/specs/007-task-source-atomicity --strict`)
- [X] T132 Run analyze pass (`/speckit-analyze 007-task-source-atomicity`) and require 0 CRITICAL / 0 HIGH before `/speckit-implement`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup and blocks all user stories.
- **US1 (Phase 3)**: depends on Foundational only; delivers MVP.
- **US2 (Phase 4)**: depends on US1 outcome contract and foundational types.
- **US3 (Phase 5)**: depends on US1/US2 mutation flow so diagnostics reflect final behavior.
- **Polish (Phase 6)**: depends on all targeted stories being complete.

### User Story Dependencies

- **US1 (TSA-1)**: establishes source-first, truthful mutation outcomes.
- **US2 (TSA-2)**: depends on US1 contract and adds conflict/projection/sync consistency guarantees.
- **US3 (TSA-3)**: depends on final mutation/error paths from US1/US2.

### Parallel Opportunities

- T102 and T103 can run in parallel in Setup.
- T104/T105/T107 can overlap during Foundational work.
- T108 and T109 run in parallel before T110–T113 closes US1.
- T114/T115/T116/T116A run in parallel before T117–T120 closes US2.
- T121/T122/T123 run in parallel before T124–T126 closes US3.
- T127 and T128 can run in parallel before final validation tasks.

---

## Parallel Example: User Story 2

```bash
# Execute US2 validation suite together after conflict/projection wiring is in place:
bun test --config /dev/null \
  src/shell/app/db/task.repository.spec.ts \
  src/shell/main/rpc/routes/task.routes.spec.ts \
  src/shell/app/app.service.spec.ts
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational).
3. Complete Phase 3 (US1 / TSA-1).
4. Validate mutation success/failure truthfulness before moving on.

### Incremental Delivery

1. Foundation and shared outcome types.
2. US1 durable source outcome truthfulness.
3. US2 projection consistency + conflict rejection.
4. US3 structured diagnostics and correlation.
5. Final e2e + audit + analyze passes.

### Suggested MVP Scope

**Phases 1–3** are the first shippable slice: users stop receiving false success on source-write failure.

## Requirement to Task Mapping

| Requirement | Acceptance Criteria | Primary Tasks |
| ----------- | ------------------- | ------------- |
| TSA-1 | AC1, AC2, AC3 | T108, T109, T110, T111, T112, T113 |
| TSA-2 | AC1, AC2, AC3, AC4, AC5 | T114, T115, T116, T116A, T117, T118, T119, T120 |
| TSA-3 | AC1, AC2, AC3 | T121, T122, T123, T124, T125, T126 |

---

## Notes

- Tasks map directly to TSA-1/TSA-2/TSA-3 and preserve FCIS boundaries.
- Use TypeBox-driven contract changes only; no schema stack changes.
- Keep co-located specs updated with each modified `src/` artifact.
