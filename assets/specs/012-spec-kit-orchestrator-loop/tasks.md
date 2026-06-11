# Tasks: Spec Kit orchestrator loop

**Input**: Design documents from `assets/specs/012-spec-kit-orchestrator-loop/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), handoff.md, checklists/orchestrator.md

**Tests**: Tests are explicitly requested in the feature specification under evidence (e.g., `spec_kit.script.spec.ts`, `kit_step_resolver.script.spec.ts`, `orchestrator.script.spec.ts`).

**Organization**: Tasks are grouped by user story and prioritized by Delivery Slice. **Slice A (Phases 1–7)** must be completed and merged before **Slice B (Phases 8–12)** begins.

**Module authority**: Where this file and [`plan.md`](./plan.md) differ, **plan.md § Canonical step → handler traceability** wins. Do **not** extend `detectPhase()` to cover all 18 canonical rows — use `kit_step_resolver.script.ts` instead.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Packages: `packages/workflow-core/`, `packages/workflow-runtime/`
- CLI tools: `tools/bin/`
- Verb handlers: `packages/workflow-runtime/src/kit_verbs/*.script.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Configure [mise.toml](file:///Users/roalcantara/Work/bun/kb/mise.toml) nested `cmd "kit"` under `spec` with verbs per spec § Kit verb reference (`next`, `specify`, `clarify`, `checklist`, `plan`, `analyze`, `tasks`, `handoff-generate`, `implement`, `pr-prep`, `review`, `gate`, `pr-open`, `pr-check`) plus `next --dry-run` and `next --approve` flags. Configure this under `[tasks.spec]` subcommand usage spec and map execution to `bun tools/bin/spec_kit.script.ts`.
- [x] T002 [P] Create script file [tools/bin/spec_kit.script.ts](file:///Users/roalcantara/Work/bun/kb/tools/bin/spec_kit.script.ts) as the CLI router. It must parse process.argv or sub-task parameters passed by mise, and delegate to the correct sub-module in [packages/workflow-runtime/src/kit_verbs/]. Configure main logging via `getLogger(['kb', 'spec-kit'])` from `@shared/logging`.
- [x] T003 [P] Create test suite [tools/bin/spec_kit.script.spec.ts](file:///Users/roalcantara/Work/bun/kb/tools/bin/spec_kit.script.spec.ts) with basic route test skeletons verifying command routing, format flags, and option validation.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core resolver, envelope, preflight, and human-gate infrastructure — MUST complete before user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Implement [packages/workflow-runtime/src/kit_step_resolver.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_step_resolver.script.ts) exporting `resolveNextStage(featureDir: string): Promise<{ stage: string; verb: string; isHumanGate: boolean; envelopePath?: string }>` which reads detectPhase()/scanFeatureDir() and existing envelope JSONs to decide the current step. Use `getLogger(['kb', 'resolver'])` for diagnostics.
- [x] T005 [P] Write [packages/workflow-runtime/src/kit_step_resolver.script.spec.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_step_resolver.script.spec.ts) with table-driven tests mapping specific fixture directory structures (missing spec, completed plan, failed review) to expected verbs, including review FIX rewind back to implement.
- [x] T006 [P] Implement [packages/workflow-runtime/src/kit_envelope.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_envelope.script.ts) exposing `writeEnvelope(runId: string, stage: string, envelopeData: any): void` and `readEnvelope(runId: string, stage: string): any | null` storing JSON files under `tmp/workflow-runs/<date>/<run_id>.envelope.<stage>.json` and validating formats using TypeBox `Value.Check(EnvelopeSchema, data)`.
- [x] T007 [P] Implement [packages/workflow-runtime/src/kit_preflight.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_preflight.script.ts) exporting `checkPreflight(stage: string, config: any): Promise<void>` to check allowlist policy, sandbox scopes, execution limits, and pending human gates.
- [x] T008 [P] Implement [packages/workflow-runtime/src/kit_human_gate.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_human_gate.script.ts) to manage gate approvals by writing simple approved files (e.g. `gate_approved_<stage>`) or envelope marker states under the active run directory to let subsequent preflight checks know when gates are approved.
- [x] T009 Export new kit modules from [packages/workflow-runtime/src/index.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/index.ts) (`kit_step_resolver`, `kit_envelope`, `kit_preflight`, `kit_human_gate`).

**Checkpoint**: Resolver, envelope, preflight, and human-gate modules tested in isolation

---

## Phase 3: Slice A — User Story 1 (SKO-1) — `spec kit` CLI Subcommand Tree (Priority: P1)

**Goal**: Route `spec kit <verb>` subcommands and propagate flags (`--raw`, `--json`, `--feat`).

**Independent Test**: `mise run spec kit` lists all canonical verbs (including `pr-prep`); unknown verb exits 2.

- [x] T010 [P] [US1] Write routing tests in [tools/bin/spec_kit.script.spec.ts](file:///Users/roalcantara/Work/bun/kb/tools/bin/spec_kit.script.spec.ts) and [tools/bin/spec.script.spec.ts](file:///Users/roalcantara/Work/bun/kb/tools/bin/spec.script.spec.ts) validating CLI subcommands mapping and argument preservation.
- [x] T011 [US1] Implement process.argv parsing and delegation in [tools/bin/spec_kit.script.ts](file:///Users/roalcantara/Work/bun/kb/tools/bin/spec_kit.script.ts) to parse command line parameters and delegate to `packages/workflow-runtime/src/kit_verbs/*.script.ts`.
- [x] T012 [US1] Wire [tools/bin/spec.script.ts](file:///Users/roalcantara/Work/bun/kb/tools/bin/spec.script.ts) to delegate `spec kit` commands to `tools/bin/spec_kit.script.ts` when parsed.
- [x] T013 [P] [US1] Scaffold 14 verb files under [packages/workflow-runtime/src/kit_verbs/](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_verbs/) exporting `handle(featureDir: string, options: any): Promise<void>`.

**Checkpoint**: `spec kit` subcommand tree routes and validates

---

## Phase 4: Slice A — User Story 2 (SKO-4) — Envelope Contract per Kit Verb (Priority: P1)

**Goal**: Every stage handler writes a valid envelope on completion.

**Independent Test**: Run a kit verb; verify envelope JSON under `tmp/workflow-runs/` passes `Value.Check(EnvelopeSchema)`.

- [x] T014 [P] [US2] Extend envelope schema tests in [packages/workflow-core/src/schemas/envelope.schema.spec.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-core/src/schemas/envelope.schema.spec.ts) to cover review verdict mapping (DONE / RETRYABLE_FAILURE) and diagnostic codes REVIEW_APPROVE / REVIEW_FIX_REQUIRED.
- [x] T015 [P] [US2] Write [packages/workflow-runtime/src/kit_envelope.script.spec.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_envelope.script.spec.ts) tests for valid/invalid envelope JSON writes and directory structures.
- [x] T016 [US2] Implement LLM/kb verb handlers under [packages/workflow-runtime/src/kit_verbs/](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_verbs/) for `specify`, `clarify`, `checklist`, `plan`, `analyze`, `tasks`, `handoff_generate`, and `implement`. Each LLM handler must trigger the configured provider's command (Cursor `/speckit-*` slash command or CLI) and verify that the corresponding envelope is written to disk on completion.

**Checkpoint**: Early-sequence handlers write structured envelopes

---

## Phase 5: Slice A — User Story 3 (SKO-8 AC1–4) — `kit next` Single-Step & Preflights (Priority: P1)

**Goal**: Route `spec kit <verb>` subcommands and propagate flags (`--raw`, `--json`, `--feat`).

**Independent Test**: `mise run spec kit next <fixture> --dry-run` resolves expected verb; human-gated fixture exits non-zero with resume hint unless `--approve`.

- [x] T017 [P] [US3] Write resolution integration tests in [tools/bin/spec_kit.script.spec.ts](file:///Users/roalcantara/Work/bun/kb/tools/bin/spec_kit.script.spec.ts) verifying that the resolved next step matches expected verbs on test fixtures.
- [x] T018 [US3] Implement the `next` handler in [tools/bin/spec_kit.script.ts](file:///Users/roalcantara/Work/bun/kb/tools/bin/spec_kit.script.ts) using resolver, preflight checks, and gate status checking.
- [x] T019 [US3] Implement internal dispatch in [tools/bin/spec_kit.script.ts](file:///Users/roalcantara/Work/bun/kb/tools/bin/spec_kit.script.ts) to directly import and execute the resolved `kit_verbs` handler function asynchronously without spawning a separate CLI child process.
- [x] T020 [US3] Implement `--dry-run` flag in [tools/bin/spec_kit.script.ts](file:///Users/roalcantara/Work/bun/kb/tools/bin/spec_kit.script.ts) to print `Next stage: <verb>. Focus: <hint>` on stdout, then exit 0 without executing the verb.
- [x] T021 [US3] Implement `--approve` flag in [tools/bin/spec_kit.script.ts](file:///Users/roalcantara/Work/bun/kb/tools/bin/spec_kit.script.ts) to write the gate approval marker for the resolved gated stage and proceed to dispatch.

**Checkpoint**: `kit next` resolves, prefights, and dispatches one step correctly

---

## Phase 6: Slice A — User Story 4 (SKO-5 A) — `kit review` Handler (Priority: P2)

**Goal**: Review worker produces APPROVE/FIX envelopes (manual re-run of `implement` after FIX in Slice A; automated R2R is Slice B).

**Independent Test**: `kit review` writes `status: "DONE"` + `REVIEW_APPROVE` on pass; `RETRYABLE_FAILURE` + `REVIEW_FIX_REQUIRED` + fix path in `artifacts_created` / `evidence[]` on FIX.

- [x] T022 [P] [US4] Write tests for kit review in [packages/workflow-runtime/src/kit_verbs/review.script.spec.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_verbs/review.script.spec.ts) validating APPROVE and FIX verdict outcomes.
- [x] T023 [US4] Implement review handler in [packages/workflow-runtime/src/kit_verbs/review.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_verbs/review.script.ts) to spawn `app-review-handoff` and map verdicts: APPROVE -> `DONE` with `REVIEW_APPROVE` code; FIX -> `RETRYABLE_FAILURE` with `REVIEW_FIX_REQUIRED` code, writing the fix handoff path to `artifacts_created` and `evidence[]`.

**Checkpoint**: `kit review` envelope mapping is standard

---

## Phase 7: Slice A — User Story 5 (SKO-6 A) — Gate & PR Tail Handlers (Priority: P2)

**Goal**: Handlers for `gate`, `pr-prep`, `pr-open`, `pr-check` — all canonical tail rows.

**Independent Test**: Each verb runs its Measure command(s) and writes envelope DONE on success.

- [x] T024 [P] [US5] Write unit tests for `gate`, `pr-prep`, `pr-open`, `pr-check` in [packages/workflow-runtime/src/kit_verbs/*.script.spec.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_verbs/) verifying process spawn and envelope completion.
- [x] T025 [US5] Implement [packages/workflow-runtime/src/kit_verbs/gate.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_verbs/gate.script.ts) to spawn both [mise run spec gate] and [bash .agents/skills/app-quality-gate/scripts/gate.sh], verifying both exit 0.
- [x] T026 [US5] Implement [packages/workflow-runtime/src/kit_verbs/pr_prep.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_verbs/pr_prep.script.ts) executing `hk check --profile pr` using `Bun.spawn` and writing the envelope.
- [x] T027 [US5] Implement [packages/workflow-runtime/src/kit_verbs/pr_open.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_verbs/pr_open.script.ts) to execute the GH CLI command `gh pr create`, parse stdout for the PR URL, write the URL to a `pr_ref` file under the run directory, and write the envelope.
- [x] T028 [US5] Implement [packages/workflow-runtime/src/kit_verbs/pr_check.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/kit_verbs/pr_check.script.ts) executing `gh pr checks --watch --required` using `Bun.spawn` with retry policy parameters (`max_attempts = 3`, 30s interval).
- [x] T029 [US5] **Slice A gate** — run plan.md Slice A checkpoint (all exit 0):

  ```sh
  mise run spec kit
  mise run spec kit next assets/specs/012-spec-kit-orchestrator-loop --dry-run
  bun test --config /dev/null tools/bin/spec_kit.script.spec.ts
  bun test --config /dev/null packages/workflow-runtime/src/kit_step_resolver.script.spec.ts
  bash .agents/skills/app-quality-gate/scripts/gate.sh
  ```

**Checkpoint**: Slice A complete — merge `feature/012-spec-kit-commands` to `main` before Phase 8

---

## Phase 8: Slice B — User Story 6 (SKO-2) — Profile Stage Bindings in Catalog (Priority: P1)

**Prerequisite**: Slice A merged on `main`

**Goal**: Bind stage `command:` values to kit tasks; extend tail past gate.

**Independent Test**: `mise run catalog validate` passes; conformance spec green.

- [x] T030 [P] [US6] Update stage bindings in [assets/catalog/workflows/default.yaml](file:///Users/roalcantara/Work/bun/kb/assets/catalog/workflows/default.yaml) by adding `pr-open` and `pr-check` stages and mapping non-terminal commands to `spec kit next`.
- [x] T031 [US6] Update conformance tests in [tools/governance/specs/workflow/conformance.script.spec.ts](file:///Users/roalcantara/Work/bun/kb/tools/governance/specs/workflow/conformance.script.spec.ts) to assert the new catalog stages and transitions.

**Checkpoint**: Catalog updated and validated

---

## Phase 9: Slice B — User Story 7 (SKO-8 AC5–6, SKO-3) — `kit next --loop` & `workflow run` Alias (Priority: P1)

**Goal**: Orchestrator-driven loop; no duplicate loop implementation.

**Independent Test**: `mise run spec kit next tools/__tests__/fixtures/workflow/smoke-feature --loop` advances until pause or terminal; NDJSON events emitted.

- [x] T032 [P] [US7] Write integration tests for the loop in [packages/workflow-runtime/src/orchestrator.script.spec.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/orchestrator.script.spec.ts) and [tools/bin/spec_kit.script.spec.ts](file:///Users/roalcantara/Work/bun/kb/tools/bin/spec_kit.script.spec.ts).
- [x] T033 [US7] Implement loop runner in [tools/bin/spec_kit.script.ts](file:///Users/roalcantara/Work/bun/kb/tools/bin/spec_kit.script.ts) by calling the resolver, preflight check, and dispatch functions in a while loop until terminal success or block.
- [x] T034 [US7] Wire [tools/governance/specs/workflow_run.script.ts](file:///Users/roalcantara/Work/bun/kb/tools/governance/specs/workflow_run.script.ts) so that spec workflow run delegates directly to `spec kit next --loop`.

**Checkpoint**: Loop and workflow alias wired

---

## Phase 10: Slice B — User Story 8 (SKO-5 B) — Automated Review-Fix R2R Loop (Priority: P2)

**Goal**: Orchestrator rewinds `review` FIX → `implement` with fix handoff context.

**Independent Test**: Simulated FIX envelope triggers automatic rewind inside `--loop`.

- [x] T035 [P] [US8] Write tests in [packages/workflow-runtime/src/orchestrator.script.spec.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/orchestrator.script.spec.ts) simulating review failed transition.
- [x] T036 [US8] Implement rewind logic in [packages/workflow-runtime/src/orchestrator.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/orchestrator.script.ts) resolving next stage to `implement` when a review envelope indicates `RETRYABLE_FAILURE`.

**Checkpoint**: Automated review-fix R2R works in loop

---

## Phase 11: Slice B — User Story 9 (SKO-6 B) — Orchestrator PR/CI Tail (Priority: P2)

**Goal**: `pr-open` / `pr-check` run as explicit orchestrator stages; terminal messaging includes PR URL.

**Independent Test**: Loop transitions `gate` → `pr-open` → `pr-check`; stdout includes run id + PR URL.

- [x] T037 [P] [US9] Update stage execution in [packages/workflow-runtime/src/orchestrator.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/workflow-runtime/src/orchestrator.script.ts) to execute `pr-open` and `pr-check` stages and remove the old `runProviders` runner.
- [x] T038 [US9] Update stdout success formatter in [tools/bin/spec_kit.script.ts](file:///Users/roalcantara/Work/bun/kb/tools/bin/spec_kit.script.ts) to print run ID, final stage, PR URL, and the message `"all stages complete — ready for manual testing"`.

**Checkpoint**: PR/CI tail orchestrated inside loop

---

## Phase 12: Slice B — User Story 10 (SKO-7) — Smoke Harness (Priority: P3)

**Goal**: SMOKE-01 drives fixture feature through full loop in CI.

**Independent Test**: `mise run spec test smoke` and nightly workflow green.

- [x] T039 [P] [US10] Update [.github/workflows/smoke.yml](file:///Users/roalcantara/Work/bun/kb/.github/workflows/smoke.yml) to configure the smoke task against the `smoke-feature` fixture.
- [x] T040 [US10] Implement smoke scope in [tools/governance/specs/spec_test.script.ts](file:///Users/roalcantara/Work/bun/kb/tools/governance/specs/spec_test.script.ts) to run the orchestrator loop on the `smoke-feature` fixture directory.
- [x] T041 [US10] **Slice B gate** — [run](./dogfood-smoke-feature.md) plan.md Slice B checkpoint (all exit 0):

  ```sh
  mise run spec kit next tools/__tests__/fixtures/workflow/smoke-feature --loop
  mise run spec workflow run tools/__tests__/fixtures/workflow/smoke-feature --dry-run
  mise run spec test smoke
  bash .agents/skills/app-quality-gate/scripts/gate.sh
  ```

**Checkpoint**: Smoke CI green; Slice B ready to merge

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Final validation after Slice B (or after each slice PR if preferred)

- [x] T042 [P] Run full repo quality gate via [bash .agents/skills/app-quality-gate/scripts/gate.sh](file:///Users/roalcantara/Work/bun/kb/.agents/skills/app-quality-gate/scripts/gate.sh) and resolve tsc/lint findings.
- [x] T043 Update `handoff.md` AC Evidence table with run ids and command outputs; verify `checklists/requirements.md` and `checklists/orchestrator.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **Slice A (Phases 3–7)**: Depends on Foundational — merge to `main` before Slice B
- **Slice B (Phases 8–12)**: Depends on Slice A merge
- **Polish (Phase 13)**: After Slice B (or run T029 after Slice A, T041 after Slice B)

### Within Each User Story

- Tests before or alongside implementation (co-located `*.spec.ts`)
- Thin CLI router before verb handler bodies
- Resolver + envelope before `kit next` dispatch

### Parallel Opportunities

- Phase 1 tasks T002–T003 [P]
- Phase 2 tasks T004–T008 [P] (after T004 schema/types available for T006–T008)
- Verb handler specs T024 [P] across four files
- Slice B test tasks marked [P]

---

## Implementation Strategy

### MVP First (Slice A only)

1. Phases 1–2: Setup + resolver/envelope/preflight foundation
2. Phases 3–5: CLI tree, envelopes, `kit next` single-step
3. Phases 6–7: Review + gate/PR tail handlers
4. **T029 Slice A gate** — stop; open PR `feature/012-spec-kit-commands`
5. Merge to `main`

### Slice B increment

1. Phase 8: Catalog bindings + tail stages
2. Phases 9–11: Loop, R2R, PR/CI orchestration
3. Phase 12: Smoke + **T041 Slice B gate**
4. Phase 13: Polish; PR `feature/012-spec-kit-orchestrator-loop`
