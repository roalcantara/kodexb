# Tasks: Role-suffix conformance migration

**Input**: Design documents from `assets/specs/019-role-suffix-migration/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Tests are requested in the specification for the role-conformance detector verification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Main app code lives under `src/` at repository root
- Workspace package code lives under `packages/ops/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure verification

- [x] T101 Verify initial repository state by running role-conformance baseline check in tools/metrics/baselines/role-conformance/baseline.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T102 Setup unit test file for role-conformance core to assert type-only imports and pure Node imports behave correctly in packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.spec.ts
- [x] T103 [P] Implement type-only filter and pure Node module check in packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Harden and Verify Detector (Priority: P1) 🎯 MVP

**Goal**: Harden the detector to exclude type-only and pure Node imports, eliminating false positives from the metrics.

**Independent Test**: Run unit tests under packages/ops/src/metrics/harnesses/role-conformance/

### Tests for User Story 1

- [x] T104 [P] [US1] Run and verify the role-conformance detector unit tests pass: `bun test ./packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.spec.ts`

---

## Phase 4: User Story 2 - Execute Renames (Priority: P1)

**Goal**: Rename the 8 mis-roled files to their correct role suffixes per spec disposition table.

**Independent Test**: Verify all renames, that no files remain with old names, and that the typechecker is clean.

### Implementation for User Story 2

- [x] T105 [P] [US2] Rename test helper rpc_route.spec.util.ts to rpc_route.helper.ts and update all importer paths in src/__tests__/helpers/rpc_route.helper.ts
- [x] T106 [P] [US2] Rename import_bundle_persist.util.ts to import_bundle_persist.repository.ts and update all importer paths in src/shell/app/db/import_bundle_persist.repository.ts
- [x] T107 [P] [US2] Rename app_preview_fetch.util.ts to app_preview_fetch.client.ts and update all importer paths in src/shell/app/lib/app_preview_fetch.client.ts
- [x] T108 [P] [US2] Rename app_sync.util.ts to app_sync.service.ts, rename its spec in lockstep to app_sync.service.spec.ts, and update imports in src/shell/app/lib/app_sync.service.ts
- [x] T109 [P] [US2] Rename app_task_mutation.util.ts to app_task_mutation.service.ts and update imports in src/shell/app/lib/app_task_mutation.service.ts
- [x] T110 [P] [US2] Rename app_task_source.util.ts to app_task_source.service.ts, rename its spec in lockstep to app_task_source.service.spec.ts, and update imports in src/shell/app/lib/app_task_source.service.ts
- [x] T111 [P] [US2] Rename frecency_snapshot.util.ts to frecency_snapshot.repository.ts and update imports in src/shell/app/lib/frecency_snapshot.repository.ts
- [x] T112 [P] [US2] Rename launcher_frame_probe.util.ts to launcher_frame_probe.adapter.ts, rename its spec in lockstep to launcher_frame_probe.adapter.spec.ts, and update imports in src/shell/main/window/launcher_frame_probe.adapter.ts

---

## Phase 5: User Story 3 - Suffix Locks (Priority: P1)

**Goal**: Pins the role-naming conventions per directory by updating ls-lint configurations.

**Independent Test**: Run `bun run lint:ls` and ensure it completes with exit code 0.

### Implementation for User Story 3

- [x] T113 [US3] Add additive suffix rules for touched directories in .ls-lint.yml and verify with `bun run lint:ls`

---

## Phase 6: User Story 4 - Baseline Floor (Priority: P1)

**Goal**: Re-generate the metrics baseline file with 0 mislabeled utils to lock in the improvements.

**Independent Test**: Verify baseline.json contains mislabeledUtilCount as 0.

### Implementation for User Story 4

- [x] T114 [US4] Re-run baseline generation and verify baseline comparison passes with 0 mislabeled files in tools/metrics/baselines/role-conformance/baseline.json

---

## Phase 7: User Story 5 - Guide Drift Cross-check (Priority: P1-2)

**Goal**: Align codestyle and FCIS docs with naming reality and clear remaining P1 tasks in TODO.md.

**Independent Test**: Ensure all changed guides compile and validate successfully.

### Implementation for User Story 5

- [x] T115 [US5] Audit and fix guide naming drift in assets/guides/CODESTYLE_GUIDE.md and assets/guides/LOGGING_GUIDE.md (renamed-path references for migrated shell files); cross-check FCIS/foundation/TODO P1 scope per handoff MIGR-6
- [x] T116 [US5] Mark completed P1 backlog items as checked [x] in TODO.md

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Global validation, security checking, and closeout

- [x] T117 Run full project quality gate: linting, formatting, typechecking, and tests at repository root
- [x] T199 Run `mise run spec closeout assets/specs/019-role-suffix-migration` to finalize feature branch merge

---

## Commit plan

Author one `### C#` chunk per logical phase before implement. Incremental:
`mise run spec ready --phase C1 --commit`. Closeout flush: `mise run spec ready --commit`.

### C1 — Setup and Foundational specs
- **Phase:** 1, 2
- **Tasks:** T101, T102
- **Paths:** `packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.spec.ts`
- **Subject:** `ref(ops): Add role conformance specs`
- **Body:**
  Add unit test cases to packages/ops to specify expected behavior of
  the role-conformance utility detector for type-only imports and pure
  Node module imports.

  Changes:
  - Add test assertions verifying type-only imports and pure node
    modules are not treated as I/O.

### C2 — Harden Detector
- **Phase:** 2, 3
- **Tasks:** T103, T104
- **Paths:** `packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.ts`
- **Subject:** `fix(ops): Ignore type imports in detector`
- **Body:**
  Harden the core isPureUtil detection logic to filter out type-only
  imports and skip flagging pure Node modules.

  Changes:
  - Strip import type lines before processing imports.
  - Exclude pure node modules from I/O classifications.

### C3 — Execute Renames
- **Phase:** 4
- **Tasks:** T105, T106, T107, T108, T109, T110, T111, T112
- **Paths:** `src/`
- **Subject:** `ref(shell): Rename utils to true roles`
- **Body:**
  Relocate misnamed utility files to their true roles (client,
  repository, service, helper, adapter) per disposition table.

  Changes:
  - Rename 8 util files and their specs via git mv.
  - Update all consumer import paths across the codebase.

### C4 — ls-lint locks
- **Phase:** 5
- **Tasks:** T113
- **Paths:** `.ls-lint.yml`
- **Subject:** `chore(lint): Update ls-lint suffix locks`
- **Body:**
  Add additive `.ls-lint.yml` rules for touched directories to lock
  down their permitted role suffixes.

  Changes:
  - Add rules allowing helper/repository/client/service/adapter.

### C5 — Baseline Floor
- **Phase:** 6
- **Tasks:** T114
- **Paths:** `tools/metrics/baselines/role-conformance/baseline.json`
- **Subject:** `chore(metrics): Update conformance baseline`
- **Body:**
  Regenerate baseline.json with the new feature branch SHA to enforce a
  floor of 0 mislabeled files.

  Changes:
  - Update totalUtil and set mislabeledUtilCount to 0 in baseline.json.

### C6 — Guides & Backlog
- **Phase:** 7
- **Tasks:** T115, T116
- **Paths:** `assets/guides/`, `TODO.md`
- **Subject:** `docs(guides): Align docs with role suffixes`
- **Body:**
  Document naming/suffix conventions, metric recipes, and update
  backlog items in TODO.md to complete P1 renames.

  Changes:
  - Document ls-lint suffix locks and metric series addition in
    guides.
  - Mark completed renames as checked in TODO.md.

---

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete
