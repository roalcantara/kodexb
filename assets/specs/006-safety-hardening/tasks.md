<!-- markdownlint-disable-file -->

# Tasks: Safety hardening

**Input**: Design documents from `assets/specs/006-safety-hardening/`

**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Deterministic `bun:test`, hook smoke checks, and spec-gate verification are required. No new Gherkin or Playwright work is planned for this tooling-focused feature.

**Organization**: Tasks are grouped by user story so each requirement cluster can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel when work touches different files and does not depend on incomplete plumbing.
- **[Story]**: Traceability label for the requirement cluster (`US1`..`US6`).
- Every task includes the primary file path that proves completion.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the code map and create the shared scaffolding the security scripts will reuse.

- [X] T101 Verify command and gate touch points in `tools/bin/spec.script.ts`, `hk.pkl`, `.github/workflows/review.yml`, `.specify/memory/constitution.md`, `assets/guides/SDD_WORKFLOW_GUIDE.md`, and `assets/guides/CI_GUIDE.md`
- [X] T002 [P] Create the `tools/governance/security/` module layout plus shared TypeBox models in `tools/governance/security/security.types.ts` and `tools/governance/security/events.types.ts`
- [X] T003 [P] Seed deterministic fixtures and perf-baseline destinations under `tools/governance/security/fixtures/` and `tools/metrics/baselines/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared scan plumbing that every later requirement depends on.

**⚠️ CRITICAL**: No user story is independently shippable until this phase is complete.

- [X] T004 Implement the shared event writer and retention helpers in `tools/governance/security/run_writer.script.ts` and `tools/governance/security/retention.script.ts`
- [X] T005 Implement shared scan plumbing in `tools/governance/security/exit_policy.script.ts`, `tools/governance/security/file_selection.script.ts`, and the `tools/governance/security/scan.script.ts` entry shell
- [X] T006 [P] Add foundational specs covering writer round-trip, prune behavior, exit policy, and changed-file selection in `tools/governance/security/security_foundation.script.spec.ts`
- [X] T007 Register `security`, `handoff-scrub`, and `ready` subcommands in `tools/bin/spec.script.ts`

**Checkpoint**: The security tooling has a reusable schema, writer, retention policy, file-selection path, and CLI entry points.

---

## Phase 3: User Story 1 — Secret scan blocks committed credentials (Priority: P1) 🎯 MVP

**Goal**: Block raw-secret leaks locally and preserve deterministic exclusion/performance behavior for SH-1.

**Independent Test**: `mise run hk check` fails on the seeded secret fixture, and `bun test --config /dev/null tools/governance/security/scan.script.spec.ts` covers exclusion, binary/oversize skips, and changed-only behavior.

### Tests for User Story 1

> **NOTE:** Write the SH-1 coverage before finalizing the hook/config wiring.

- [X] T008 [P] [US1] Add secrets-scan cases for excluded paths, binary/oversize skips, and changed-only performance hooks in `tools/governance/security/scan.script.spec.ts`
- [X] T009 [P] [US1] Add or refresh fixtures under `tools/governance/security/fixtures/secrets/` for seeded-secret, allowed, binary, and oversize cases

### Implementation for User Story 1

- [X] T010 [US1] Enable the `gitleaks` builtin and changed-files security step in `hk.pkl`
- [X] T011 [US1] Create project exclusions in `.gitleaks.toml` so fixtures and cache directories stay intentionally ignored
- [X] T012 [US1] Wire SH-1 hook verification and failure smoke expectations into `tools/governance/security/scan.script.ts` and supporting helpers

**Checkpoint**: SH-1 is enforced in local hook flow without scanning exempted paths.

---

## Phase 4: User Story 2 — Dependency and Electrobun posture checks gate risky changes (Priority: P1)

**Goal**: Catch known-bad lockfile deltas and Electrobun surface drift through deterministic checks.

**Independent Test**: `bun test --config /dev/null tools/governance/security/checks/dependencies.script.spec.ts tools/governance/security/checks/electrobun_surface.script.spec.ts` passes with both positive and negative fixtures.

### Tests for User Story 2

- [X] T013 [P] [US2] Add CVE-list, `bun audit` shim, malformed-lockfile, and no-delta cases in `tools/governance/security/checks/dependencies.script.spec.ts`
- [X] T014 [P] [US2] Add compliant, missing-sandbox, empty-partition, wildcard-navigation, unknown-shape, and parse-failure cases in `tools/governance/security/checks/electrobun_surface.script.spec.ts`

### Implementation for User Story 2

- [X] T015 [US2] Define the initial in-tree advisory dataset in `tools/governance/security/cve.list.yml`
- [X] T016 [US2] Implement lockfile-delta parsing and the dependency check in `tools/governance/security/checks/dependencies_delta.script.ts` and `tools/governance/security/checks/dependencies.script.ts`
- [X] T017 [US2] Implement Electrobun config AST parsing and posture validation in `tools/governance/security/checks/electrobun_surface_ast.script.ts` and `tools/governance/security/checks/electrobun_surface.script.ts`
- [X] T018 [US2] Compose both checks into the main security runner in `tools/governance/security/scan.script.ts`

**Checkpoint**: SH-2 and SH-3 fail closed on malicious lockfile deltas and unsafe Electrobun config drift.

---

## Phase 5: User Story 3 — Handoff scrub blocks unsafe prompt emission (Priority: P1)

**Goal**: Refuse handoff generation when prompt bodies contain secrets, unsafe paths, or non-allowlisted env literals.

**Independent Test**: `bun test --config /dev/null tools/governance/security/handoff_scrub.script.spec.ts tools/governance/specs/workflow/handoff_generate.script.spec.ts` passes for clean, blocked, and allowlist cases.

### Tests for User Story 3

- [X] T019 [P] [US3] Add blocked-prompt, clean-path, error-shape, and audit-metadata cases in `tools/governance/security/handoff_scrub.script.spec.ts`
- [X] T020 [P] [US3] Add malformed and non-literal allowlist cases in `tools/governance/security/handoff_scrub.script.spec.ts`
- [X] T021 [P] [US3] Extend `tools/governance/specs/workflow/handoff_generate.script.spec.ts` with a scrub-failure integration case that proves no write and no dispatch

### Implementation for User Story 3

- [X] T022 [US3] Define rule matching and allowlist schemas in `tools/governance/security/checks/secrets.rules.script.ts` and `tools/governance/security/allowlist.schema.script.ts`
- [X] T023 [US3] Implement allowlist loading and prompt scrubbing in `tools/governance/security/allowlist.loader.script.ts` and `tools/governance/security/handoff_scrub.script.ts`
- [X] T024 [US3] Invoke `spec handoff-scrub` from `tools/governance/specs/workflow/handoff_generate.script.ts` between prompt render and file write/dispatch

**Checkpoint**: SH-4 and SH-5 block unsafe handoff emission and preserve clean-path generation.

---

## Phase 6: User Story 4 — Security subgate is wired into gate, CI, hooks, and readiness flow (Priority: P1)

**Goal**: Make the new security checks unavoidable in local and CI verification paths.

**Independent Test**: `bun test --config /dev/null tools/governance/specs/audit.script.spec.ts` plus focused smoke runs of `mise run spec security --strict`, `mise run spec gate assets/specs/006-safety-hardening`, and `mise run spec ready assets/specs/006-safety-hardening --key <catalog-key>`.

### Tests for User Story 4

- [X] T025 [P] [US4] Extend `tools/governance/specs/audit.script.spec.ts` to prove `spec gate` stops on `spec security --strict` failures before the quality gate
- [X] T026 [P] [US4] Add security-run integration coverage to `tools/governance/security/scan.script.spec.ts` for changed-only and strict modes

### Implementation for User Story 4

- [X] T027 [US4] Finish the main runner and exit-code semantics in `tools/governance/security/scan.script.ts`
- [X] T028 [US4] Wire `spec security --strict` into `tools/governance/specs/gate.sh`
- [X] T029 [US4] Add the `security` review job in `.github/workflows/review.yml`
- [X] T029A [US4] Configure branch protection on `main` to require the `security` check and capture proof in `tmp/reviews/security/required-checks.md`
- [X] T030 [US4] Consolidate tag tests, catalog validation, hook checks, and spec gate into `mise run spec ready` in `tools/bin/spec.script.ts`

**Checkpoint**: SH-6, SH-7, and SH-12 are enforced through the canonical gate paths.

---

## Phase 7: User Story 5 — Events, governance docs, and no-weakening guarantees remain trustworthy (Priority: P2)

**Goal**: Emit auditable security events, preserve existing deterministic gate semantics, and document the new machine checks.

**Independent Test**: Event-shape specs pass, the existing app-quality gate behavior is unchanged, and docs/constitution diffs point at the new enforcement path.

### Tests for User Story 5

- [X] T031 [P] [US5] Add event round-trip, writer-failure, and retention coverage in `tools/governance/security/scan.script.spec.ts`
- [X] T032 [P] [US5] Add low-only severity and no-weakening assertions in `tools/governance/security/scan.script.spec.ts` and related script specs

### Implementation for User Story 5

- [X] T033 [US5] Emit `security_run` events from `tools/governance/security/scan.script.ts` and `tools/governance/security/handoff_scrub.script.ts`, and keep `tmp/security/` ignored in `.gitignore`
- [X] T034 [US5] Update `.specify/memory/constitution.md` to bind Principle IX and add the required security-subgate review row
- [X] T035 [US5] Update `assets/guides/SDD_WORKFLOW_GUIDE.md`, `assets/guides/CI_GUIDE.md`, and any related governance docs to describe `spec security`, `spec handoff-scrub`, and `spec ready`

**Checkpoint**: SH-8, SH-9, and SH-10 are documented and observable without weakening existing gates.

---

## Phase 8: User Story 6 — Performance baselines catch regressions (Priority: P3)

**Goal**: Guard hook and CI latency with explicit baselines for changed-only and full-sweep runs.

**Independent Test**: Perf harnesses produce committed baselines and fail on >25% regression using the existing perf-check pattern.

### Tests for User Story 6

- [X] T036 [P] [US6] Add secrets changed-only, dependency no-op, scrub latency, and full-sweep perf harnesses in `tools/governance/security/perf/secrets_perf.script.ts` and related perf helpers

### Implementation for User Story 6

- [X] T037 [US6] Commit security performance baselines under `tools/metrics/baselines/` for changed-only and full-sweep runs
- [X] T038 [US6] Wire the security perf scope into the existing perf-check flow referenced by `.github/workflows/review.yml`

**Checkpoint**: SH-11 guards regressions for local hook and CI execution paths.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and documentation alignment across the whole feature.

- [X] T039 [P] Run `mise run spec lint assets/specs/006-safety-hardening --strict` and `mise run spec trace assets/specs/006-safety-hardening --strict`
- [X] T040 Run `mise run spec security --strict` and `mise run spec gate assets/specs/006-safety-hardening`
- [X] T041 Run `mise run spec ready assets/specs/006-safety-hardening --key security` and record the command/evidence in the implementation handoff
- [X] T042 [P] Recheck `assets/specs/006-safety-hardening/quickstart.md` against the shipped command shapes and output expectations
- [X] T043 Run `/speckit.analyze 006-safety-hardening` and require 0 CRITICAL / 0 HIGH findings before declaring implementation complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup and blocks every user story.
- **US1 (Phase 3)**: Depends on Foundational only and is the MVP.
- **US2 (Phase 4)**: Depends on Foundational and reuses the scan runner from Phase 2.
- **US3 (Phase 5)**: Depends on Foundational; may proceed in parallel with US2 once shared schemas exist.
- **US4 (Phase 6)**: Depends on US2 and US3 because gate wiring must call the real checks.
- **US5 (Phase 7)**: Depends on US4 for final command names and event payload shape.
- **US6 (Phase 8)**: Depends on US4 because baselines need the final runner behavior.
- **Polish (Phase 9)**: Depends on all targeted stories being complete.

### User Story Dependencies

- **US1** covers SH-1 and establishes the local-fast-fail secret posture.
- **US2** covers SH-2 and SH-3 and depends only on the shared runner/writer.
- **US3** covers SH-4 and SH-5 and depends on shared schemas plus handoff generator touch points.
- **US4** covers SH-6, SH-7, and SH-12 and depends on the implemented scan/scrub commands.
- **US5** covers SH-8, SH-9, and SH-10 and depends on the final command/event surface.
- **US6** covers SH-11 and depends on the final scan path being stable enough to baseline.

### Parallel Opportunities

- T002 and T003 can run in parallel during Setup.
- T004, T005, and T006 can overlap once the file layout exists.
- T008 and T009 can run in parallel before T010–T012 finalize US1 wiring.
- T013 and T014 can run in parallel before T015–T018 finalize US2.
- T019, T020, and T021 can run in parallel before T022–T024 finalize US3.
- T025 and T026 can run in parallel before T027–T030 finalize US4.
- T031 and T032 can run in parallel before T033–T035 finalize US5.
- T036 and T037 can run in parallel once the final runner behavior is stable.

---

## Parallel Example: User Story 2

```bash
# After the shared runner exists, draft both deterministic check specs together:
# T013 — dependency delta + bun audit fallback coverage
# T014 — Electrobun posture fixtures and parse-failure coverage

bun test --config /dev/null \
  tools/governance/security/checks/dependencies.script.spec.ts \
  tools/governance/security/checks/electrobun_surface.script.spec.ts
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: US1 (secret scanning and hook enforcement).
4. Validate the local fast-fail path with `mise run hk check`.

### Incremental Delivery

1. Shared schemas/writer/CLI scaffolding.
2. US1 secret detection and hook enforcement.
3. US2 dependency + Electrobun checks.
4. US3 handoff scrub + allowlist.
5. US4 gate/CI/ready wiring.
6. US5 events/docs/no-weakening guarantees.
7. US6 perf baselines.

### Suggested MVP Scope

**Phases 1–3 only** deliver the first shippable slice: unsafe secrets are blocked before commit while the shared security runner infrastructure is in place for later checks.

---

## Notes

- `tasks.md` references requirement IDs and file paths, but does not copy full EARS acceptance text.
- No new renderer or RPC work is expected; this feature stays in governance tooling, workflow, hook, and documentation surfaces.
- Keep all validation TypeBox-based and reuse existing script patterns in `tools/governance/specs/`.
