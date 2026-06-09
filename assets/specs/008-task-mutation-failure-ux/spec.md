<!-- markdownlint-disable-file -->

# Task mutation failure UX and spec harness DX

**Feature Branch**: `008-task-mutation-failure-ux`
**Release**: v0.x
**Status**: Draft

**Input**: Spec [`007-task-source-atomicity`](../007-task-source-atomicity/spec.md) shipped the backend
`TaskMutationOutcome` contract (source-first writes, conflict rejection, structured
diagnostics). The renderer still closes task sheets on resolved RPC promises without
checking `ok: false`; BDD failure scenarios use Playwright route interception instead
of the real preview → RPC → AppService path; quickstart commands drifted from the
Playwright BDD harness; atomicity scenarios depend on shared release fixture task
titles; atomicity-only step helpers live in the generic task step file.

Operators also hit repeated friction calling `mise run spec ready` and
`mise run spec workflow`: feature dir and catalog key must be typed every time;
there is no fast per-slice validation between tasks; `spec workflow --next` prints
advisory commands but never runs the runnable ones. These harness gaps slow every
Speckit feature — including [`009-agentic-workflow-orchestrator`](../009-agentic-workflow-orchestrator/spec.md).

This feature **completes the 007 acceptance loop** at the UI and e2e layers **and**
ships a **lightweight spec CLI prelude** (inference, slice check, workflow run) that
009 MVP can compose later. It does **not** change mutation semantics, write order, or
route outcome shapes, and does **not** replace the 009 orchestrator state machine.

## Introduction

Users and operators must see truthful outcomes when task mutations fail. Today,
failure is visible in unit/route tests and in BDD via intercepted HTTP responses,
but not consistently in product UI or end-to-end transport. Closing that gap
reduces split-brain trust issues in preview/dogfood and establishes reusable
patterns (structured failure UX, preview-safe fault injection, feature-scoped BDD)
for later workflow orchestration work ([`009-agentic-workflow-orchestrator`](../009-agentic-workflow-orchestrator/spec.md)).

## Authority and upstream contract

| Topic                                               | Authority                                                                                                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mutation semantics, write order, outcome JSON shape | [`007-task-source-atomicity`](../007-task-source-atomicity/spec.md) and [`contracts/task-mutation-outcome.contract.md`](../007-task-source-atomicity/contracts/task-mutation-outcome.contract.md) |
| Failure message template                            | `src/shell/app/lib/task_mutation_failure_message.util.ts`                                                                                                                                         |
| E2e harness conventions                             | [`assets/guides/TESTING_GUIDE.md`](../../guides/TESTING_GUIDE.md), [`assets/docs/specs/e2e/fixture-manifest.md`](../../docs/specs/e2e/fixture-manifest.md)                                        |
| Catalog key (unchanged)                             | `task_source_atomicity` in [`assets/catalog/catalog.yaml`](../../catalog/catalog.yaml)                                                                                                            |
| Spec CLI conventions                                | [`SDD_WORKFLOW_GUIDE.md`](../../guides/SDD_WORKFLOW_GUIDE.md), [`TOOLS_GUIDE.md`](../../guides/TOOLS_GUIDE.md), `tools/bin/spec.script.ts`                                                      |
| Feature context file                                | `.specify/feature.json` → `feature_directory`                                                                                                                                                     |
| Catalog key derivation                            | `catalogKeyFromSlug()` in `tools/governance/specs/workflow/handoff_generate.script.ts`                                                                                                            |

## Out of scope

- Changing `TaskMutationOutcome` fields, HTTP status codes, or source-first ordering
- New task fields, authorization, or sync algorithms
- Full workflow orchestrator (xstate, profiles, auto-progression — [`009`](../009-agentic-workflow-orchestrator/spec.md))
- Spawning IDE-only `speckit.*` skills from the shell without an explicit `--run-advisory` escape hatch
- Electrobun main-process builds (preview harness only for fault injection v1)
- Replacing existing 007 unit/route test coverage

## Glossary

| Term               | Meaning                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Outcome-aware save | Renderer logic that inspects `TaskMutationOutcome.ok` before treating a mutation as success                  |
| Preview harness    | Playwright BDD stack: preview server on `PREVIEW_PORT`, `bdd/e2e` steps, `assets/features/e2e/*.feature`     |
| Fault injection    | Test-only backend control that forces `source_write_failed` or `conflict` without Playwright `route.fulfill` |
| Atomicity feature  | Gherkin feature `assets/features/e2e/task-source-atomicity.feature` tagged `@spec:task-source-atomicity`     |
| Feature inference  | Resolution of active `assets/specs/NNN-slug/` from CLI args, `.specify/feature.json`, branch name, or cwd     |
| Slice check        | Fast validation (`spec slice` / `spec ready --light`) before full `spec ready`                                |
| Runnable command   | A `detectPhase()` suggestion whose prefix is in the shell allowlist (`mise run`, `hk check`, `bash tools/`)   |

## Delivery slices

Two tracks in one spec; **harness first** so later tasks use the improved CLI.

| Slice | Requirements | Rationale |
| ----- | ------------ | --------- |
| **H0 — Harness** | TMF-6, TMF-7, TMF-8 | Inference + slice check + workflow run; unblocks 008/009 SDD loops |
| **P1 — Product** | TMF-1, TMF-3 | Renderer failures + docs; fast user-visible win |
| **P2 — E2e** | TMF-2, TMF-4, TMF-5 | Real transport, fixture isolation, BDD split |

Recommended order: **TMF-6 → TMF-7 → TMF-8 → TMF-1 → TMF-3 → TMF-2 → TMF-4 → TMF-5**.

## Clarifications

### Session 2026-06-09

- Q: Single list-level error surface vs per-dialog errors for keyboard mutations? → A: Use one list-level error surface for keyboard/list mutations, while dialog mutations keep dialog-local `form.error`.
- Q: Fault injection via env only vs optional `X-KB-E2e-Fault` request header? → A: Use env-only fault injection; no request-header control.
- Q: Add catalog spec pointer `008-task-mutation-failure-ux` under `task_source_atomicity`? → A: Yes, add 008 as an additional spec pointer under the existing catalog key.
- Q: Should spec harness CLI improvements live in 008 or 009? → A: **008** ships the lightweight prelude (inference, slice, workflow run); **009** owns orchestration kernel and profiles.
- Q: Default `spec workflow` behavior — print or run? → A: **Run** when the next command is allowlisted; **`--dry-run`** preserves today's print-only behavior.
- Q: Where does feature inference read from? → A: Explicit arg → `.specify/feature.json` → git branch `NNN-slug` → cwd under `assets/specs/`; fail with actionable error if ambiguous.

---

## REQUIREMENT TMF-6: `spec ready` infers feature dir and catalog key

**User story:** As a contributor on a feature branch, I want `mise run spec ready` to
default to the active feature so I do not re-type paths and catalog keys.

### Acceptance criteria

1. WHEN `mise run spec ready` is invoked without a positional feature dir, THEN the CLI SHALL resolve the feature directory using precedence: explicit arg → `.specify/feature.json` `feature_directory` → current git branch matching `^\d{3}-` mapped to `assets/specs/<branch>` → cwd when cwd is inside `assets/specs/NNN-slug/`.
   - **Measure:** Resolution tests cover all four sources and pick the highest-precedence match.
   - **Evidence:** Co-located spec for `resolveActiveFeatureDir()` (or equivalent) in `tools/governance/specs/`.

2. WHEN `--key` is omitted, THEN the CLI SHALL resolve the catalog key by lookup in `assets/catalog/catalog.yaml` (`specs:` entries containing the feature folder basename), falling back to `catalogKeyFromSlug()` with a stderr warning when no catalog row matches.
   - **Measure:** Given `008-task-mutation-failure-ux`, lookup returns a key when catalog lists the folder; fallback emits exactly one warning line.
   - **Evidence:** Unit tests with fixture catalog YAML; manual run on 008 worktree.

3. WHEN both feature dir and key are inferred successfully, THEN `mise run spec ready` with no positional args SHALL behave identically to the fully qualified command for that feature.
   - **Measure:** Inferred and explicit invocations produce the same command sequence and exit code on a clean tree.
   - **Evidence:** Integration spec stubbing spawn steps; 008 quickstart documents bare `mise run spec ready`.

4. WHEN inference is ambiguous (multiple candidates) or no candidate exists, THEN the CLI SHALL exit non-zero and print each resolution rule tried plus an example fully qualified command.
   - **Measure:** Ambiguous-fixture test exits 2; message includes `assets/specs/NNN-slug` example.
   - **Evidence:** Unit test for ambiguous `.specify/feature.json` vs branch mismatch.

---

## REQUIREMENT TMF-7: Light slice validation between tasks

**User story:** As an implementer finishing one task row, I want a fast gate that
applies lint fixes and validates spec structure without running full e2e and hk.

### Acceptance criteria

1. WHEN `mise run spec slice` is invoked (alias: `mise run spec ready --light`), THEN the CLI SHALL infer the feature dir using TMF-6 rules and run, in order: (a) repo auto-fix for formatting/lint (`hk check --profile fix` or documented equivalent that applies safe fixes), (b) `mise run spec lint <feature_dir> --strict`.
   - **Measure:** Slice completes in under full `spec ready` duration on the same tree; exits non-zero when spec lint fails after fixes.
   - **Evidence:** `tools/bin/spec.script.spec.ts` or dedicated `slice.script.spec.ts`; documented in 008 quickstart.

2. WHEN the active SDD phase is `implement` or later (per `detectPhase()` on the inferred feature dir), THEN `spec slice` MAY additionally run `mise run spec trace <feature_dir> --strict` before lint.
   - **Measure:** Phase-gated trace runs only when `tasks.md` exists; skipped during specify/plan-only filesets.
   - **Evidence:** Unit test with mocked `scanFeatureDir` / phase fixture.

3. WHEN `spec slice` succeeds, THEN it SHALL NOT run catalog validate, tag e2e, or `gate.sh` (those remain full `spec ready` only).
   - **Measure:** Spawn log for slice contains exactly the light steps; full ready still runs four-step pipeline.
   - **Evidence:** Integration test comparing command lists.

4. WHEN a contributor completes a tasks.md row, THEN the 008 quickstart SHALL recommend `mise run spec slice` before commit and `mise run spec ready` before PR.
   - **Measure:** Quickstart contains both commands with one-sentence scope difference.
   - **Evidence:** `assets/specs/008-task-mutation-failure-ux/quickstart.md`.

---

## REQUIREMENT TMF-8: `spec workflow` infers context and runs the next runnable step

**User story:** As an operator driving orchestrated handoff, I want one command to
advance the workflow when the next step is shell-runnable, and print-only mode when
I need to inspect first.

### Acceptance criteria

1. WHEN `mise run spec workflow` is invoked without a workflow name, THEN the CLI SHALL default the workflow id to `orchestrated-handoff` (the only v1 allowed name in `ALLOWED_WORKFLOW_NAMES`).
   - **Measure:** Bare `mise run spec workflow --feature …` delegates to `orchestrated-handoff.script.ts` without requiring the positional name.
   - **Evidence:** `tools/bin/spec.script.ts` + mise usage update; unit test for empty name default.

2. WHEN `--feature` is omitted, THEN `spec workflow` SHALL resolve the feature dir using the same inference chain as TMF-6 AC1.
   - **Measure:** Workflow and ready infer the same dir for identical repo state.
   - **Evidence:** Shared resolver module; cross-command unit tests.

3. WHEN no action flag is set, THEN the default behavior SHALL **run** the next step: spawn the `detectPhase()` command when its prefix matches the allowlist `['mise run', 'hk check', 'bash tools/governance/specs/gate.sh']`; otherwise print the advisory command and exit 0 (same as today's `--next` output).
   - **Measure:** Allowlisted next command (e.g. gate phase) is spawned with inherited stdio; `speckit.plan` is printed not spawned.
   - **Evidence:** Orchestrated-handoff script spec with mocked spawn; manual run at gate phase.

4. WHEN `--dry-run` is passed, THEN behavior SHALL match pre-008 print-only semantics: emit `phase_decided` event, print command (+ focus hint comment), and never spawn subprocesses.
   - **Measure:** Dry-run and legacy `--next` produce identical stdout for the same fileset.
   - **Evidence:** Snapshot or string-compare test; SDD guide updated to recommend `--dry-run` for inspection.

5. WHEN `--lint`, `--manifest`, or `--next` flags are passed explicitly, THEN semantics SHALL remain backward compatible (`--next` treated as alias for `--dry-run` with deprecation stderr notice).
   - **Measure:** Existing orchestrated-handoff specs pass with deprecation warning only for `--next`.
   - **Evidence:** `orchestrated_handoff.script.spec.ts` green.

6. WHEN default run mode executes a command, THEN it SHALL record the same NDJSON `phase_decided` event as dry-run before spawning, including `command` and `focus_hint`.
   - **Measure:** Event tail contains one `phase_decided` row per invocation with non-empty `command`.
   - **Evidence:** `workflow_run.script.spec.ts` or integration read of `tmp/workflow-runs/`.

---

## REQUIREMENT TMF-1: Renderer treats mutation failures as first-class UI outcomes

**User story:** As a user editing tasks, I want failed saves to stay in context with a
clear message so I do not believe a mutation succeeded when it did not.

### Acceptance criteria

1. WHEN `createTask` or `updateTask` resolves with `ok: false`, THEN the task sheet
   dialog SHALL remain open and SHALL NOT invoke the sheet close callback.
   - **Measure:** 100% of simulated failure responses in co-located hook/component
     specs leave `saving: false` and keep the dialog mounted.
   - **Evidence:** `src/shell/renderer/hooks/list/use_task_sheet.hook.spec.ts` (or
     equivalent co-located spec).

2. WHEN `createTask` or `updateTask` resolves with `ok: false`, THEN the sheet SHALL set `form.error` from the server `message` or from `buildTaskMutationFailureMessage` inputs.
   - **Measure:** Failure specs assert non-empty `form.error` for `source_write_failed` and `conflict`.
   - **Evidence:** Hook spec and optional `task_sheet.component.tsx` error region spec.

3. WHEN `createTask` or `updateTask` resolves with `ok: true`, THEN the sheet SHALL
   close and existing happy-path list/detail refresh behavior SHALL remain unchanged.
   - **Measure:** Existing task sheet and list integration specs pass without
     regression.
   - **Evidence:** `bun test` on touched renderer modules.

4. WHEN `handleCycleStatus` or `handleCyclePriority` receives `ok: false`, THEN the
   form SHALL show `form.error`, SHALL NOT advance the cycled field locally, and
   SHALL set `saving: false`.
   - **Measure:** Hook specs cover at least one cycle failure per field.
   - **Evidence:** Co-located hook spec.

5. WHEN keyboard shortcuts or list actions invoke task mutation RPC and the response has `ok: false`, THEN the UI SHALL surface one list-level error pattern without implying success, while task sheet mutations continue to use dialog-local `form.error`.
   - **Measure:** At least one co-located spec per entry point (`use_task_keyboard.hook.ts`, `use_list_page_shell.hook.ts`, or shared helper) documents the chosen error surface.
   - **Evidence:** Hook/spec files plus manual quickstart step confirming visibility in preview.

---

## REQUIREMENT TMF-2: E2e failure paths use real preview transport with backend fault injection

**User story:** As a maintainer, I want atomicity e2e scenarios to exercise the same
RPC transport as production preview so failure tests catch integration regressions.

### Acceptance criteria

1. WHEN preview fault injection is active for create, THEN `POST /api/createTask` SHALL return HTTP 200 with `ok: false`, `status: 'source_write_failed'`, from `task.routes.ts` (not Playwright `route.fulfill`).
   - **Measure:** Route or harness test asserts outcome shape and correlation id when injection is on.
   - **Evidence:** `src/shell/main/rpc/routes/task.routes.spec.ts` or preview harness spec.

2. WHEN preview fault injection simulates update conflict, THEN `POST /api/updateTask` SHALL return `ok: false`, `status: 'conflict'`, with version fields from real task state and a stale client token.
   - **Measure:** Conflict test supplies deliberate stale `sourceVersion` against a live preview task row.
   - **Evidence:** Route or harness integration test plus updated Gherkin scenario.

3. WHEN fault injection is inactive, THEN mutation routes SHALL behave exactly as
   shipped in 007 (no changed defaults).
   - **Measure:** Existing 007 route and app mutation tests pass unchanged except
     for additive injection cases.
   - **Evidence:** `bun test src/shell/app src/shell/main/rpc --filter task`.

4. WHEN fault injection env is unset or the app is not in preview/e2e mode, THEN injection controls SHALL be ignored, request-header fault toggles SHALL be unsupported, and Electrobun production builds SHALL NOT honor injection.
   - **Measure:** Gate requires explicit allowlist (e.g. `KB_E2E_FAULT_INJECTION=1` from preview startup only) and mutation behavior remains unchanged when custom fault headers are present.
   - **Evidence:** Spec with env unset plus quickstart security note.

5. WHEN atomicity scenarios run, THEN step files SHALL NOT use Playwright `route.fulfill` to synthesize mutation outcomes for `@spec:task-source-atomicity` failure Givens.
   - **Measure:** Zero `route.fulfill` matches in atomicity Given step implementations.
   - **Evidence:** Green `mise run test tag task_source_atomicity --e2e` after step refactor.

6. WHEN TSA-1 or TSA-2 assert failure, THEN assertions SHALL target visible UI (open dialog + error text or documented `data-testid`), not Playwright-stored intercept outcomes.
   - **Measure:** Scenarios pass without `EditTaskDescription` bypassing success via `lastTaskMutationOutcome` recall.
   - **Evidence:** `bdd/e2e/screenplay/task_crud.task.ts` removes save-flow outcome recall workaround.

---

## REQUIREMENT TMF-3: Verification docs match the repo harness

**User story:** As a contributor, I want copy-pasteable commands so I can validate
this feature without inferring stale flags or wrong catalog keys.

### Acceptance criteria

1. WHEN a contributor runs focused unit/route validation from the quickstart, THEN the command SHALL be `bun test src/shell/app src/shell/main/rpc --filter task`.
   - **Measure:** Every command block in quickstart exits 0 on a clean tree at feature completion.
   - **Evidence:** `assets/specs/008-task-mutation-failure-ux/quickstart.md`.

2. WHEN a contributor runs focused e2e validation, THEN the quickstart SHALL document `mise run test tag task_source_atomicity --e2e` and SHALL NOT document `bun test bdd/e2e --filter task-source-atomicity`.
   - **Measure:** Quickstart uses catalog key `task_source_atomicity` (snake_case) exclusively.
   - **Evidence:** Quickstart file; optional cross-link fix in `007` quickstart.

3. WHEN a contributor runs readiness validation, THEN the quickstart SHALL document bare `mise run spec ready` (inferred) and fully qualified `mise run spec ready assets/specs/008-task-mutation-failure-ux --key task_mutation_failure_ux` with separate **Slice**, **Focused**, and **Ready** sections.
   - **Measure:** Ready section lists tag, catalog validate, hk, and gate steps explicitly; Slice section documents `mise run spec slice`.
   - **Evidence:** Quickstart headings and command blocks.

4. WHEN fault injection is documented, THEN the quickstart SHALL name the enable env var or Gherkin step and state preview-only scope.
   - **Measure:** One dedicated quickstart subsection covers injection enablement and production exclusion.
   - **Evidence:** Quickstart "Fault injection" subsection.

---

## REQUIREMENT TMF-4: Atomicity scenarios declare their own task data

**User story:** As a maintainer, I want atomicity e2e to survive unrelated changes
to shared release fixture task titles.

### Acceptance criteria

1. WHEN scenario "Failed mutation does not create sync reversal" runs, THEN it SHALL
   NOT depend on selecting a task titled `Release Todo Task` from the shared release
   fixture.
   - **Measure:** Gherkin Background or Given steps seed or select a task unique to
     atomicity (e.g. `Atomicity conflict probe`) via documented setup.
   - **Evidence:** `assets/features/e2e/task-source-atomicity.feature` diff.

2. WHEN the shared release fixture renames incidental tasks, THEN atomicity scenarios
   SHALL continue to pass without edits to `bdd/e2e/support/seed_fixture.support.ts`
   release task names unrelated to this feature.
   - **Measure:** Local test renaming a decoy release task title does not break TSA-2
     (document procedure in quickstart or fixture-manifest addendum).
   - **Evidence:** Feature quickstart "Fixture isolation" note.

3. WHEN new scenarios need task rows, THEN the setup approach SHALL be documented in `assets/docs/specs/e2e/fixture-manifest.md` or the 008 quickstart.
   - **Measure:** At least one paragraph describes feature-local task seeding as the reference pattern.
   - **Evidence:** Fixture manifest or 008 quickstart cross-link.

---

## REQUIREMENT TMF-5: Atomicity BDD helpers are feature-scoped

**User story:** As a contributor editing generic task flows, I should not need to
read atomicity fault injection in the shared task step file.

### Acceptance criteria

1. WHEN inspecting generic task BDD support, THEN `bdd/e2e/steps/task_management.steps.ts` SHALL contain only steps shared by non-atomicity features.
   - **Measure:** Atomicity-only Givens/Thens live in `bdd/e2e/steps/task_source_atomicity.steps.ts`.
   - **Evidence:** File split; `bdd/e2e/steps/**/*.ts` glob still registers the new module.

2. WHEN atomicity screenplay helpers exist, THEN they SHALL live in `bdd/e2e/screenplay/task_source_atomicity.task.ts`, not inside `task_crud.task.ts`.
   - **Measure:** `task_crud.task.ts` contains zero references to `lastTaskMutationOutcome`.
   - **Evidence:** Screenplay file split and grep-clean generic task module.

3. WHEN bddgen runs, THEN generated specs SHALL register all steps without duplicates or orphaned imports.
   - **Measure:** `bun run bdd:e2e:bddgen` exits 0 and tag e2e run passes.
   - **Evidence:** `mise run test tag task_source_atomicity --e2e` output.

---

## E2e declaration

| Requirement         | E2e tag                       | Scenario (name only)                                     |
| ------------------- | ----------------------------- | -------------------------------------------------------- |
| TMF-1, TMF-2        | `@spec:task-source-atomicity` | Task mutation reports failure on source write failure    |
| TMF-1, TMF-2, TMF-4 | `@spec:task-source-atomicity` | Failed mutation does not create sync reversal            |
| TMF-2               | `@spec:task-source-atomicity` | Mutation failure emits correlated structured diagnostics |

Gherkin text remains in **`assets/features/e2e/task-source-atomicity.feature`**. Product
requirements TMF-1–TMF-5 update those scenarios; harness requirements TMF-6–TMF-8
are verified by unit/integration tests on `tools/governance/specs/` and `tools/bin/spec.script.ts`.

## Assumptions

- Preview server and Playwright global setup can set `KB_E2E_FAULT_INJECTION=1` (or
  equivalent) without affecting non-e2e `mise run app` sessions.
- Eden Treaty continues to return HTTP 200 with structured failure bodies for mutation
  routes (007 contract).
- Catalog will gain key `task_mutation_failure_ux` (or equivalent) pointing at
  `008-task-mutation-failure-ux`; `task_source_atomicity` may retain a spec pointer to
  008 for the corrective e2e work.
- Mutation latency target: list-level error surfacing stays perceptibly instant; no new blocking I/O on keyboard mutation path (constitution Principle I).
- `hk` exposes a `--profile fix` (or documented auto-fix profile) suitable for slice mode; if missing, plan picks the closest existing profile and documents it.
- Shared feature-resolution logic lives in one module imported by `spec ready`, `spec slice`, and `spec workflow` to prevent drift.

## Open Questions

| #    | Question                                                                               | Status   | Notes                                                                                       |
| ---- | -------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| OQ-1 | Single list-level error surface vs per-dialog errors for keyboard mutations?           | Resolved | List-level for keyboard/list; dialog-local `form.error` for sheets.                         |
| OQ-2 | Fault injection via env only vs optional `X-KB-E2e-Fault` request header?              | Resolved | Env-only injection.                                                                         |
| OQ-3 | Add catalog spec pointer `008-task-mutation-failure-ux` under `task_source_atomicity`? | Resolved | Yes for e2e corrective link; plan also adds dedicated `task_mutation_failure_ux` key.       |
| OQ-4 | Should spec harness CLI improvements live in 008 or 009?                               | Resolved | 008 prelude; 009 orchestrator.                                                              |
| OQ-5 | Default `spec workflow` — print or run?                                                | Resolved | Run allowlisted commands; `--dry-run` for print-only.                                       |
| OQ-6 | Subcommand name for light validation — `spec slice` vs `ready --light`?                  | Open     | Spec allows both; plan picks one canonical mise surface and documents alias.                |
| OQ-7 | Does `hk check --profile fix` exist today or need a new hk profile?                      | Open     | Resolve in plan.md before TMF-7 implementation.                                             |
