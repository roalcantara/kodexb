<!-- markdownlint-disable-file -->

# Tasks: Task mutation failure UX

**Input**: Design documents from `assets/specs/008-task-mutation-failure-ux/`

**Prerequisites**: `plan.md` (required), `spec.md` (required), `quickstart.md`

**Tests**: Required. The spec explicitly defines Evidence in co-located `bun:test` specs and tagged e2e scenarios.

**Organization**: Tasks are grouped by user story so each requirement cluster can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel when touching different files with no dependency on incomplete tasks
- **[Story]**: Traceability label (`US1`=TMF-1, `US2`=TMF-2, `US3`=TMF-3, `US4`=TMF-4, `US5`=TMF-5, `US6`=TMF-6, `US7`=TMF-7, `US8`=TMF-8)
- Every task includes the primary file path proving completion

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm scope, files, and verification commands before implementation.

- [x] T101 [CHECKPOINT] Validate feature scope and touched paths in assets/specs/008-task-mutation-failure-ux/plan.md — scope confirmed (plan.md is finalized)
- [x] T102 [P] Create feature tasks scaffold in assets/specs/008-task-mutation-failure-ux/tasks.md
- [x] T103 [P] Verify 008 quickstart section presence and structure in assets/specs/008-task-mutation-failure-ux/quickstart.md

---

## Phase 2: Harness — Feature Inference (H0 / TMF-6)

**Purpose**: `mise run spec ready` infers feature dir and catalog key without positional args.

**Independent Test**: Unit tests on `tools/governance/specs/` with fixture catalog YAML and mocked git branch.

- [x] T150 [P] [US6] Implement `resolveActiveFeatureDir()` with four-source precedence (arg → .specify/feature.json → branch → cwd) in tools/governance/specs/resolve_active_feature_dir.util.ts
- [x] T151 [P] [US6] Implement `resolveCatalogKey()` with catalog lookup + fallback to `catalogKeyFromSlug()` + stderr warning in tools/governance/specs/resolve_catalog_key.util.ts
- [x] T152 [US6] Wire inference into `mise run spec ready` — behave identically to fully qualified command in tools/bin/spec.script.ts
- [x] T153 [US6] Add ambiguous/no-candidate error handling (exit 2 + actionable message) in tools/governance/specs/resolve_active_feature_dir.util.ts

**Checkpoint**: TMF-6 complete; `mise run spec ready` works with zero args on feature branch.

---

## Phase 3: Harness — Slice Validation (H0 / TMF-7)

**Purpose**: Fast per-task validation gate without full e2e and hk, run before claiming a phase is done.

**Independent Test**: Unit tests mocking `scanFeatureDir` / phase fixture; integration test comparing command lists.

- [x] T154 [US7] Add `fix` profile to hk.pkl (`bun run lint:fix` + text hygiene)
- [x] T155 [US7] Implement `mise run spec ready --phase [phase_no]` — runs `hk check --profile fix` then `mise run spec lint <dir> --strict` in tools/governance/specs/phase.script.ts
- [x] T156 [US7] Add phase-gated `spec trace --strict` (only when `tasks.md` exists) in tools/governance/specs/phase.script.ts
- [x] T157 [US7] Exclude catalog validate, tag e2e, and gate.sh from `--phase` in tools/governance/specs/phase.script.ts
- [x] T158 [US7] Update 008 quickstart with `ready --phase` recommendation (mandate: run before phase sign-off) in assets/specs/008-task-mutation-failure-ux/quickstart.md

**Checkpoint**: TMF-7 complete; `mise run spec ready --phase` runs fix + lint in under full `spec ready` time.

---

## Phase 4: Harness — Workflow Run (H0 / TMF-8)

**Purpose**: `spec workflow` infers context and runs the next runnable step (or prints on `--dry-run`).

**Independent Test**: Orchestrated-handoff script spec with mocked spawn; snapshot/string-compare for dry-run.

- [x] T159 [US8] Default empty workflow name to `orchestrated-handoff` in tools/bin/spec.script.ts
- [x] T160 [US8] Wire feature inference (TMF-6 resolver) into workflow command in tools/governance/specs/workflow_run.script.ts
- [x] T161 [US8] Implement default run mode — spawn allowlisted commands; print advisory for non-allowlisted in tools/governance/specs/workflow_run.script.ts
- [x] T162 [US8] Implement `--dry-run` print-only mode (match pre-008 `--next` semantics) in tools/governance/specs/workflow_run.script.ts
- [x] T163 [US8] Ensure backward compat for `--lint`, `--manifest`, `--next` flags (deprecation warning for `--next`) in tools/governance/specs/workflow_run.script.ts
- [x] T164 [US8] Record NDJSON `phase_decided` event before spawning in tools/governance/specs/workflow_run.script.ts

**Checkpoint**: TMF-8 complete; `spec workflow` infers context, runs or prints, and emits events.

---

## Phase 5: Foundational (Blocking Prerequisites)

**Purpose**: Shared plumbing that blocks all user story delivery.

**⚠️ CRITICAL**: No user-story implementation starts before this phase is complete.

- [x] T165 Add shared list-level mutation error state to src/shell/renderer/hooks/list/use_list_page_shell.hook.ts
- [x] T166 [P] Wire keyboard mutation failure publication to shared list-level state in src/shell/renderer/hooks/list/use_task_keyboard.hook.ts
- [x] T167 [P] Add list-level error rendering host contract in src/shell/renderer/components/list/list_main.component.tsx
- [x] T168 Define preview/e2e env gate helper for fault injection in src/shell/main/rpc/routes/task.routes.ts
- [x] T169 Add foundational route coverage for env-gate on/off behavior in src/shell/main/rpc/routes/task.routes.spec.ts

**Checkpoint**: Renderer has a shared list-level error surface contract and RPC has an env-only fault-injection gate.

---

## Phase 6: User Story 1 - Renderer treats mutation failures as first-class outcomes (Priority: P1) 🎯 MVP

**Goal**: Prevent false-success UX by keeping dialogs open on `ok: false` and surfacing explicit errors.

**Independent Test**: Renderer hook/component specs prove failed create/update/cycle operations keep context open, show errors, and avoid local optimistic drift.

### Tests for User Story 1

- [x] T170 [P] [US1] Add create/update failure behavior coverage in src/shell/renderer/hooks/list/use_task_sheet.hook.spec.ts
- [x] T171 [P] [US1] Add cycle-status/cycle-priority failure coverage in src/shell/renderer/hooks/list/use_task_sheet.hook.spec.ts
- [x] T172 [P] [US1] Add list-level error-surface coverage for keyboard/list entrypoints in src/shell/renderer/hooks/list/use_list_page_shell.hook.spec.ts
- [x] T173 [P] [US1] Add task sheet error-region visibility assertions in src/shell/renderer/components/task/task_sheet.component.spec.tsx

### Implementation for User Story 1

- [x] T174 [US1] Implement outcome-aware save failure handling in src/shell/renderer/hooks/list/use_task_sheet.hook.ts
- [x] T175 [US1] Keep dialog mounted and preserve `saving: false` on `ok: false` in src/shell/renderer/components/task/task_sheet.component.tsx
- [x] T176 [US1] Implement keyboard/list failure publication to one list-level error surface in src/shell/renderer/hooks/list/use_task_keyboard.hook.ts
- [x] T177 [US1] Integrate list-level mutation error surface into page shell in src/shell/renderer/hooks/list/use_list_page_shell.hook.ts
- [x] T178 [US1] Render list-level failure surface without implying success in src/shell/renderer/components/list/list_main.component.tsx

**Checkpoint**: TMF-1 complete; UI no longer treats `ok: false` mutations as success.

---

## Phase 7: User Story 2 - E2e failure paths use real preview transport with backend fault injection (Priority: P2)

**Goal**: Replace interception-based failure simulation with real preview/RPC transport plus env-gated fault injection.

**Independent Test**: Route specs and tagged e2e scenarios pass using real transport with no `route.fulfill`-based mutation outcome synthesis.

### Tests for User Story 2

- [x] T179 [P] [US2] Add create fault-injection route assertions (`source_write_failed`) in src/shell/main/rpc/routes/task.routes.spec.ts
- [x] T180 [P] [US2] Add update conflict fault-injection route assertions in src/shell/main/rpc/routes/task.routes.spec.ts
- [x] T181 [P] [US2] Add env-unset assertions in src/shell/main/rpc/routes/task.routes.spec.ts
- [x] T182 [P] [US2] Add atomicity Given-step assertions to avoid route interception in bdd/e2e/steps/task_source_atomicity.steps.ts

### Implementation for User Story 2

- [x] T183 [US2] Implement env-only create/update fault injection in src/shell/main/rpc/routes/task.routes.ts
- [x] T184 [US2] Ensure mutation route defaults remain unchanged when injection is disabled in src/shell/main/rpc/routes/task.routes.ts
- [x] T185 [US2] Remove mutation outcome interception logic from atomicity steps in bdd/e2e/steps/task_management.steps.ts
- [x] T186 [US2] Move atomicity-specific failure setup and assertions into bdd/e2e/steps/task_source_atomicity.steps.ts
- [x] T187 [US2] Remove `lastTaskMutationOutcome` save-flow workaround from bdd/e2e/screenplay/task_crud.task.ts

**Checkpoint**: TMF-2 complete; e2e failures are exercised via real preview/RPC path with env-only injection.

---

## Phase 8: User Story 3 - Verification docs match repo harness (Priority: P2)

**Goal**: Provide copy-pasteable commands and fault-injection guidance aligned with actual repo tooling.

**Independent Test**: Quickstart commands execute as documented and match catalog key / gate expectations.

### Tests for User Story 3

- [x] T188 [P] [US3] Validate focused command examples against current harness in assets/specs/008-task-mutation-failure-ux/quickstart.md
- [x] T189 [P] [US3] Validate readiness command and key format in assets/specs/008-task-mutation-failure-ux/quickstart.md

### Implementation for User Story 3

- [x] T190 [US3] Ensure focused unit/route command is `bun test src/shell/app src/shell/main/rpc --filter task` in assets/specs/008-task-mutation-failure-ux/quickstart.md
- [x] T191 [US3] Ensure focused e2e command is `mise run test tag task_source_atomicity --e2e` in assets/specs/008-task-mutation-failure-ux/quickstart.md
- [x] T192 [US3] Ensure ready command is `mise run spec ready assets/specs/008-task-mutation-failure-ux --key task_source_atomicity` in assets/specs/008-task-mutation-failure-ux/quickstart.md
- [x] T193 [US3] Document env-gated preview-only fault injection with no header toggles in assets/specs/008-task-mutation-failure-ux/quickstart.md

**Checkpoint**: TMF-3 complete; docs accurately describe focused and readiness verification.

---

## Phase 9: User Story 4 - Atomicity scenarios declare feature-local task data (Priority: P3)

**Goal**: Remove dependence on shared release fixture task titles.

**Independent Test**: Atomicity scenarios pass when unrelated release fixture task names are changed.

### Tests for User Story 4

- [x] T194 [P] [US4] Add scenario data-isolation assertions in assets/features/e2e/task-source-atomicity.feature
- [x] T195 [P] [US4] Add fixture-isolation validation notes in assets/specs/008-task-mutation-failure-ux/quickstart.md

### Implementation for User Story 4

- [x] T196 [US4] Seed/select feature-local task rows for atomicity scenarios in bdd/e2e/support/seed_fixture.support.ts
- [x] T197 [US4] Update atomicity scenarios to use feature-local task titles in assets/features/e2e/task-source-atomicity.feature
- [x] T198 [US4] Document feature-local seeding reference pattern in assets/docs/specs/e2e/fixture-manifest.md

**Checkpoint**: TMF-4 complete; atomicity scenarios no longer rely on `Release Todo Task`.

---

## Phase 10: User Story 5 - Atomicity BDD helpers are feature-scoped (Priority: P3)

**Goal**: Separate atomicity-specific BDD behavior from generic task helpers.

**Independent Test**: BDD generation and tagged e2e run pass with no duplicate/orphaned step definitions.

### Tests for User Story 5

- [x] T199 [P] [US5] Verify step registration health with `bun run bdd:e2e:bddgen` using bdd/e2e/steps/task_source_atomicity.steps.ts
- [x] T200 [P] [US5] Verify tagged e2e pass with `mise run test tag task_source_atomicity --e2e` for assets/features/e2e/task-source-atomicity.feature

### Implementation for User Story 5

- [x] T201 [US5] Move atomicity-only steps out of generic module in bdd/e2e/steps/task_management.steps.ts
- [x] T202 [US5] Create dedicated atomicity step module in bdd/e2e/steps/task_source_atomicity.steps.ts
- [x] T203 [US5] Create dedicated atomicity screenplay helper in bdd/e2e/screenplay/task_source_atomicity.task.ts
- [x] T204 [US5] Keep generic screenplay clean of atomicity-only state in bdd/e2e/screenplay/task_crud.task.ts

**Checkpoint**: TMF-5 complete; feature-scoped BDD helpers are isolated and registered correctly.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final traceability, catalog linkage, and deterministic readiness checks.

- [x] T205 [P] Add `008-task-mutation-failure-ux` spec pointer under `task_source_atomicity` in assets/catalog/catalog.yaml
- [x] T206 [P] Update 008 progress metadata and status in assets/specs/008-task-mutation-failure-ux/.spec-context.json
- [x] T207 Run focused verification bundle from quickstart (`bun test src/shell/app src/shell/main/rpc --filter task`) via assets/specs/008-task-mutation-failure-ux/quickstart.md
- [x] T208 Run tagged e2e verification (`KB_E2E_FAULT_INJECTION=1 mise run test tag task_source_atomicity --e2e`) via assets/specs/008-task-mutation-failure-ux/quickstart.md — verified 2026-06-03 (3/3 scenarios)
- [x] T209 Run strict audit (`mise run spec audit assets/specs/008-task-mutation-failure-ux --strict`) from assets/specs/008-task-mutation-failure-ux
- [ ] T210 Run analyze pass (`/speckit-analyze 008-task-mutation-failure-ux`) and resolve CRITICAL/HIGH findings before implement — DEFERRED (analyze subcommand not available in spec CLI)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: starts immediately.
- **Phase 2–4 (Harness / H0)**: depend on Setup; provide CLI tooling used by later phases.
- **Phase 5 (Foundational)**: depends on Setup and blocks all user stories.
- **Phases 6–10 (User Stories)**: depend on Foundational completion.
- **Phase 11 (Polish)**: depends on all selected user stories being complete.

### User Story Dependencies

- **US6 (TMF-6)**: shared resolver module; prerequisite for US7/US8.
- **US7 (TMF-7)**: depends on hk `fix` profile and resolver from US6.
- **US8 (TMF-8)**: depends on resolver from US6.
- **US1 (TMF-1)**: baseline MVP and first shippable product slice.
- **US2 (TMF-2)**: depends on foundational renderer/RPC error plumbing and is validated against US1 UX behavior.
- **US3 (TMF-3)**: depends on finalized commands and harness paths from US1/US2 implementation.
- US2 intentionally precedes US3 in execution because quickstart verification must reflect finalized real-transport fault-injection behavior from US2.
- **US4 (TMF-4)**: depends on atomicity scenario transport from US2.
- **US5 (TMF-5)**: depends on finalized atomicity step behavior from US2/US4.

### Parallel Opportunities

- T102 and T103 can run in parallel in Setup.
- T150 and T151 can run in parallel in Phase 2 (inference utils).
- T166, T167, and T169 can run in parallel in Foundational after T165/T168 interfaces exist.
- Within each story, tasks marked `[P]` can run in parallel.
- US3 documentation tasks can proceed in parallel with late US2 implementation once commands are stable.
- US4 and US5 can be split across contributors after US2 reaches checkpoint.

---

## Parallel Example: Harness — Inference (Phase 2)

```bash
# Run inference utility tasks in parallel:
Task: "Implement resolveActiveFeatureDir() — four-source precedence"
Task: "Implement resolveCatalogKey() — catalog lookup + fallback"
```

## Parallel Example: User Story 1 (Phase 6)

```bash
# Run US1 test tasks in parallel workstreams:
Task: "Add create/update failure behavior coverage in src/shell/renderer/hooks/list/use_task_sheet.hook.spec.ts"
Task: "Add list-level error-surface coverage in src/shell/renderer/hooks/list/use_list_page_shell.hook.spec.ts"
Task: "Add task sheet error-region visibility assertions in src/shell/renderer/components/task/task_sheet.component.spec.tsx"
```

## Parallel Example: User Story 2 (Phase 7)

```bash
# Run US2 route/spec work and BDD split in parallel:
Task: "Add env-unset and custom-header-ignored assertions in src/shell/main/rpc/routes/task.routes.spec.ts"
Task: "Move atomicity-specific failure setup into bdd/e2e/steps/task_source_atomicity.steps.ts"
Task: "Remove lastTaskMutationOutcome workaround from bdd/e2e/screenplay/task_crud.task.ts"
```

## Parallel Example: User Story 3 (Phase 8)

```bash
# Run US3 documentation checks in parallel:
Task: "Validate focused command examples in assets/specs/008-task-mutation-failure-ux/quickstart.md"
Task: "Validate readiness command and key format in assets/specs/008-task-mutation-failure-ux/quickstart.md"
```

## Parallel Example: User Story 4 (Phase 9)

```bash
# Run US4 scenario and fixture updates in parallel:
Task: "Seed/select feature-local task rows in bdd/e2e/support/seed_fixture.support.ts"
Task: "Update atomicity scenarios in assets/features/e2e/task-source-atomicity.feature"
```

## Parallel Example: User Story 5 (Phase 10)

```bash
# Run US5 module split in parallel:
Task: "Create bdd/e2e/steps/task_source_atomicity.steps.ts"
Task: "Create bdd/e2e/screenplay/task_source_atomicity.task.ts"
```

---

## Implementation Strategy

### Harness First (H0)

1. Complete Phase 1 (Setup)
2. Complete Phases 2–4 (H0 harness: inference, slice, workflow)
3. Validate CLI inference, slice, and workflow run with `mise run spec ready` / `mise run spec ready --phase`

### MVP Product (US1)

4. Complete Phase 5 (Foundational)
5. Complete Phase 6 (US1 / TMF-1)
6. Validate UI no longer implies success on `ok: false`

### Incremental Delivery

1. H0 harness CLI (Phases 2–4): inference, slice validation, workflow run
2. Foundational renderer/RPC plumbing (Phase 5)
3. US1 renderer truthfulness (Phase 6)
4. US2 real-transport fault-injection e2e path (Phase 7)
5. US3 verification docs hardening (Phase 8)
6. US4 fixture isolation (Phase 9)
7. US5 BDD helper modularization (Phase 10)
8. Phase 11 audit/analyze/readiness

### Required Before Implement

- `mise run spec audit assets/specs/008-task-mutation-failure-ux --strict`
- `/speckit-analyze 008-task-mutation-failure-ux`

---

## Requirement to Task Mapping

| Requirement | Primary Tasks |
| ----------- | ------------- |
| TMF-1 | T170-T178 |
| TMF-2 | T179-T187 |
| TMF-3 | T188-T193 |
| TMF-4 | T194-T198 |
| TMF-5 | T199-T204 |
| TMF-6 | T150-T153 |
| TMF-7 | T154-T158 |
| TMF-8 | T159-T164 |
| GOV-1 (Spec metadata hygiene) | T206 |
| GOV-2 (Catalog pointer maintenance) | T205 |
