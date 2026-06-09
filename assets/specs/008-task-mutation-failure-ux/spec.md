<!-- markdownlint-disable-file -->

# Task mutation failure UX

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

This feature **completes the 007 acceptance loop** at the UI and e2e layers. It does
**not** change mutation semantics, write order, or route outcome shapes.

## Introduction

Users and operators must see truthful outcomes when task mutations fail. Today,
failure is visible in unit/route tests and in BDD via intercepted HTTP responses,
but not consistently in product UI or end-to-end transport. Closing that gap
reduces split-brain trust issues in preview/dogfood and establishes reusable
patterns (structured failure UX, preview-safe fault injection, feature-scoped BDD)
for later workflow orchestration work ([`009-agentic-workflow-orchestrator`](../009-agentic-workflow-orchestrator/spec.md)).

## Authority and upstream contract

| Topic | Authority |
| ----- | --------- |
| Mutation semantics, write order, outcome JSON shape | [`007-task-source-atomicity`](../007-task-source-atomicity/spec.md) and [`contracts/task-mutation-outcome.contract.md`](../007-task-source-atomicity/contracts/task-mutation-outcome.contract.md) |
| Failure message template | `src/shell/app/lib/task_mutation_failure_message.util.ts` |
| E2e harness conventions | [`assets/guides/TESTING_GUIDE.md`](../../guides/TESTING_GUIDE.md), [`assets/docs/specs/e2e/fixture-manifest.md`](../../docs/specs/e2e/fixture-manifest.md) |
| Catalog key (unchanged) | `task_source_atomicity` in [`assets/catalog/catalog.yaml`](../../catalog/catalog.yaml) |

## Out of scope

- Changing `TaskMutationOutcome` fields, HTTP status codes, or source-first ordering
- New task fields, authorization, or sync algorithms
- Workflow orchestrator runtime ([`009`](../009-agentic-workflow-orchestrator/spec.md))
- Electrobun main-process builds (preview harness only for fault injection v1)
- Replacing existing 007 unit/route test coverage

## Glossary

| Term | Meaning |
| ---- | ------- |
| Outcome-aware save | Renderer logic that inspects `TaskMutationOutcome.ok` before treating a mutation as success |
| Preview harness | Playwright BDD stack: preview server on `PREVIEW_PORT`, `bdd/e2e` steps, `assets/features/e2e/*.feature` |
| Fault injection | Test-only backend control that forces `source_write_failed` or `conflict` without Playwright `route.fulfill` |
| Atomicity feature | Gherkin feature `assets/features/e2e/task-source-atomicity.feature` tagged `@spec:task-source-atomicity` |

## Delivery order (recommended)

Implement and verify in this order to avoid rework:

1. **TMF-1** — renderer outcome UX (unblocks honest UI assertions)
2. **TMF-3** — quickstart / verification docs (fast win)
3. **TMF-2** — preview fault injection + e2e transport (replaces interception)
4. **TMF-4** — self-contained scenario data (stabilize backgrounds)
5. **TMF-5** — BDD module split (cleanup after test shape settles)

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

2. WHEN `createTask` or `updateTask` resolves with `ok: false`, THEN the sheet
   SHALL set `form.error` to the server `message` when present, otherwise to text
   from `buildTaskMutationFailureMessage` inputs derived from the outcome.
   - **Measure:** Failure specs assert non-empty `form.error` matching user-safe
     wording for `source_write_failed` and `conflict`.
   - **Evidence:** Same hook spec; optional component spec on
     `task_sheet.component.tsx` asserting error region visibility.

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

5. WHEN keyboard shortcuts or list actions invoke task mutation RPC and the response has `ok: false`, THEN the UI SHALL surface one consistent visible error pattern without implying success.
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

4. WHEN fault injection env is unset or the app is not in preview/e2e mode, THEN injection controls SHALL be ignored and Electrobun production builds SHALL NOT honor them.
   - **Measure:** Gate requires explicit allowlist (e.g. `KB_E2E_FAULT_INJECTION=1` from preview startup only).
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

3. WHEN a contributor runs readiness validation, THEN the quickstart SHALL document `mise run spec ready assets/specs/008-task-mutation-failure-ux --key task_source_atomicity` with separate **Focused** and **Ready** sections.
   - **Measure:** Ready section lists tag, catalog validate, hk, and gate steps explicitly.
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

| Requirement | E2e tag | Scenario (name only) |
| ----------- | ------- | -------------------- |
| TMF-1, TMF-2 | `@spec:task-source-atomicity` | Task mutation reports failure on source write failure |
| TMF-1, TMF-2, TMF-4 | `@spec:task-source-atomicity` | Failed mutation does not create sync reversal |
| TMF-2 | `@spec:task-source-atomicity` | Mutation failure emits correlated structured diagnostics |

Gherkin text remains in **`assets/features/e2e/task-source-atomicity.feature`**. This
feature updates scenarios/steps to satisfy TMF-1–TMF-5; it does not add a separate
feature file unless plan chooses `@spec:task-mutation-failure-ux` alias tags later.

## Assumptions

- Preview server and Playwright global setup can set `KB_E2E_FAULT_INJECTION=1` (or
  equivalent) without affecting non-e2e `mise run app` sessions.
- Eden Treaty continues to return HTTP 200 with structured failure bodies for mutation
  routes (007 contract).
- Catalog entry `task_source_atomicity` remains **shipped**; 008 is corrective hardening.

## Open Questions

| # | Question | Status | Notes |
| - | -------- | ------ | ----- |
| OQ-1 | Single list-level error surface vs per-dialog errors for keyboard mutations? | Open | TMF-1 AC5 allows one consistent pattern; resolve in plan.md |
| OQ-2 | Fault injection via env only vs optional `X-KB-E2e-Fault` request header? | Open | Prefer env + route-scoped test API; plan must pick one |
| OQ-3 | Add catalog spec pointer `008-task-mutation-failure-ux` under `task_source_atomicity`? | Open | Likely yes in tasks; no new catalog key |
