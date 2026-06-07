<!-- markdownlint-disable-file -->

# Tasks: Safety hardening

**Input**: Design documents from `assets/specs/006-safety-hardening/`

**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`

**Tests**: This project follows a TDD approach for governance scripts. Unit tests MUST be written and fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T101 [P] Register `security`, `handoff-scrub`, and `ready` subcommands in `tools/bin/spec.script.ts`
- [x] T102 [P] Create `tools/governance/security/checks/` directory
- [x] T103 Define common security types in `tools/governance/security/security.types.ts`
- [x] T104 Define security run event schema in `tools/governance/security/events.types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure for logging, file selection, and exit policy

- [x] T105 [P] Implement atomic event writer in `tools/governance/security/run_writer.script.ts`
- [x] T106 [P] Implement retention pruning in `tools/governance/security/retention.script.ts`
- [x] T107 Implement deterministic exit code policy in `tools/governance/security/exit_policy.script.ts`
- [x] T108 Implement file selection logic in `tools/governance/security/file_selection.script.ts`
- [x] T109 [P] Create `tools/governance/security/security_foundation.script.spec.ts`

**Checkpoint**: Foundation ready.

---

## Phase 3: User Story 1 - Gitleaks Integration (Priority: P1) 🎯 MVP

- [x] T110 [P] [US1] Enable `gitleaks` builtin in `hk.pkl`
- [x] T111 [P] [US1] Create `.gitleaks.toml` with project-standard exclusions
- [x] T112 [US1] Verify Gitleaks blocks commit with `tools/governance/security/fixtures/secrets/sample.bad.txt`

---

## Phase 4: User Story 2 - Dependency Audit (Priority: P1)

- [x] T113 [P] [US2] Create `tools/governance/security/checks/dependencies.check.script.spec.ts`
- [x] T114 [P] [US2] Define initial malicious set in `tools/governance/security/cve.list.yml`
- [x] T115 [US2] Implement lockfile delta parser in `tools/governance/security/checks/dependencies.delta.script.ts`
- [x] T116 [US2] Implement `runDependenciesCheck` in `tools/governance/security/checks/dependencies.check.script.ts`
- [x] T117 [US2] Add `bun audit` fallback/integration logic

---

## Phase 5: User Story 3 - Electrobun Posture (Priority: P1)

- [x] T118 [P] [US3] Create `tools/governance/security/checks/electrobun_surface.check.script.spec.ts`
- [x] T119 [US3] Implement AST parsing for `electrobun.config.ts` in `tools/governance/security/checks/electrobun_surface.ast.script.ts`
- [x] T120 [US3] Implement `runElectrobunSurfaceCheck` in `tools/governance/security/checks/electrobun_surface.check.script.ts`

---

## Phase 6: User Story 4 - Handoff Scrubbing (Priority: P1)

- [x] T121 [P] [US4] Create `tools/governance/security/handoff_scrub.script.spec.ts`
- [x] T122 [US4] Define secrets regex and path/env rules in `tools/governance/security/checks/secrets.rules.script.ts`
- [x] T123 [US4] Implement `scrubPrompt` in `tools/governance/security/handoff_scrub.script.ts`
- [x] T124 [US4] Integrate `scrubPrompt` into `tools/governance/specs/workflow/handoff_generate.script.ts`

---

## Phase 7: User Story 5 - Handoff Allowlist (Priority: P2)

- [x] T125 [P] [US5] Define allowlist TypeBox schema in `tools/governance/security/allowlist.schema.script.ts`
- [x] T126 [US5] Implement allowlist loader in `tools/governance/security/allowlist.loader.script.ts`
- [x] T127 [US5] Update `scrubPrompt` to respect literal allowlist entries

---

## Phase 8: User Story 6 - Subgate Wiring (Priority: P1)

- [x] T128 [US6] Implement main scanner entry point in `tools/governance/security/scan.script.ts`
- [x] T128a [US6] Consolidate verification steps into `mise run spec ready` in `tools/bin/spec.script.ts`
- [x] T129 [US6] Wire `spec security --strict` into `tools/governance/specs/gate.sh`
- [x] T130 [P] [US6] Update `tools/governance/specs/audit.script.spec.ts`

---

## Phase 9: User Story 7 - Hook & CI Deployment (Priority: P1)

- [x] T131 [P] [US7] Add `spec-security-changed` step to `hk.pkl`
- [x] T132 [P] [US7] Declare `security` job in `.github/workflows/review.yml`
- [x] T133 [US7] Update `assets/guides/CI_GUIDE.md`

---

## Phase 10: User Story 8 - Security Events (Priority: P2)

- [x] T134 [P] [US8] Update `tools/governance/security/scan.script.spec.ts` to verify event shape
- [x] T135 [US8] Add event emission to `scan.script.ts` and `handoff_scrub.script.ts`
- [x] T136 [US8] Ensure `tmp/security/` is excluded in `.gitignore`

---

## Phase 11: User Story 9 - No Regression (Priority: P1)

- [x] T137 [US9] Run full `mise run spec gate` on feature 001
- [x] T138 [US9] Verify failure semantics in `tools/governance/specs/lint.script.ts`

---

## Phase 12: User Story 10 - Constitution Binding (Priority: P2)

- [x] T139 [US10] Amend `.specify/memory/constitution.md` to v1.4.0
- [x] T140 [US10] Update `assets/guides/SDD_WORKFLOW_GUIDE.md`
- [x] T141 [US10] Append amendment log to `assets/docs/specs/spec-kit-constitution-log.md`

---

## Phase 13: User Story 11 - Performance Regression (Priority: P3)

- [x] T142 [P] [US11] Implement `tools/governance/security/perf/secrets.perf.script.ts`
- [x] T143 [US11] Commit baseline JSON to `tools/metrics/baselines/perf/security.json`

---

## Phase 14: Polish & Cross-Cutting Concerns

- [x] T144 [P] Update `AGENTS.md` verification list
- [x] T145 Final validation of `quickstart.md`
- [x] T146 [P] Documentation cleanup

---

## Dependencies & Execution Order

- **Foundational (Phase 2)**: Blocks all user stories.
- **US5 (Phase 7)**: Depends on US4.
- **US6 (Phase 8)**: Depends on US2, US3.
- **US7 (Phase 9)**: Depends on US6.

---

## Notes

- All checks MUST be deterministic and fail-closed.
- Verify tests fail before implementation.
- Commit after each task group.
