# Quickstart: task mutation failure UX verification

## Preconditions

- Branch checked out: `008-task-mutation-failure-ux`
- Feature directory exists: `assets/specs/008-task-mutation-failure-ux`
- Local environment prepared via repo standard toolchain (`mise`)
- Generated CSS exists (`mise run app styles`) — required for the e2e preview server to serve `index.css`; without it, the renderer loads without styles and e2e scenarios may fail or time out

## Focused

### 1. Focused unit/route validation (TMF-1, TMF-2, TMF-3 AC1)

```bash
bun test src/shell/app src/shell/main/rpc --filter task
```

Expected:
- Renderer failure specs keep the task sheet open and set `form.error` on `ok: false`.
- Cycle-status / cycle-priority failures do not advance the field locally.
- Route fault-injection cases return HTTP 200 with `ok: false` and the correct `status`.
- Existing 007 route/app mutation tests pass unchanged when injection is inactive.

### 2. Focused e2e validation (TMF-2, TMF-3 AC2, TMF-4, TMF-5)

```bash
mise run test tag task_source_atomicity --e2e
```

Expected:
- Atomicity failure Givens are registered in `bdd/e2e/steps/task_source_atomicity.steps.ts`.
- Scenarios pass using feature-local task data, not the shared `Release Todo Task`.

> Do **not** use `bun test bdd/e2e --filter task-source-atomicity` — `bun test` only
> discovers specs under `src/`. The catalog key is `task_source_atomicity` (snake_case).

## Slice

### 3. Phase-gated slice validation (TMF-7)

Run before claiming a phase is done and before every commit:

```bash
mise run spec ready --phase
```

With an explicit phase number:

```bash
mise run spec ready assets/specs/008-task-mutation-failure-ux --phase 6
```

This runs:
- `hk check --profile fix` — auto-fix formatting/lint
- `mise run spec lint <dir> --strict` — spec structure validation
- `mise run spec trace <dir> --strict` — only when `tasks.md` exists (implement phase+)

It does **not** run catalog validate, tag e2e, or `gate.sh` — those remain for full `spec ready` before PR.

> **Mandate**: The implementer SHALL run `mise run spec ready --phase` before claiming a phase is done.

## Fault injection

Backend fault injection is **env-gated and preview/e2e-only** (OQ-2):

- All mutation routes (`createTask`, `updateTask`, `cycleStatus`, `cyclePriority`, `reorderTask`,
  `deleteTask`) check `KB_E2E_FAULT_INJECTION` at the top of `runTaskMutation` in
  `src/shell/main/rpc/routes/task.routes.ts`.
- When the env flag is unset (`KB_E2E_FAULT_INJECTION` not `'1'`), injection is ignored and
  mutation routes behave exactly as shipped in 007.
- When set to `'1'`, every mutation returns HTTP 200 with `ok: false`, `status: source_write_failed`,
  and a unique `correlationId` — without touching the database or the source file.
- Request-header fault toggles (e.g. `X-KB-E2e-Fault`) are **not** supported.
- Electrobun production builds never honor injection.

Enable for a local e2e run:

```bash
KB_E2E_FAULT_INJECTION=1 mise run test tag task_source_atomicity --e2e
```

No route interception (`route.fulfill`) is used. The existing `task_source_atomicity.steps.ts` Given
steps register the failure and assertion steps, using the real preview/RPC/AppService path.

## Fixture isolation

- Atomicity scenarios seed/select a task unique to the feature (for example
  `Atomicity conflict probe`) via documented setup in
  `bdd/e2e/support/seed_fixture.support.ts`.
- Renaming an unrelated decoy task in the shared release fixture MUST NOT break atomicity
  scenarios. Reference pattern for feature-local seeding is documented here and in
  `assets/docs/specs/e2e/fixture-manifest.md`.

## Ready

### 4. Readiness gate for completion (TMF-3 AC3)

```bash
mise run spec ready assets/specs/008-task-mutation-failure-ux --key task_source_atomicity
```

This consolidates:
- Tagged tests for `task_source_atomicity`.
- Catalog validation for key `task_source_atomicity`.
- Commit-profile / `hk` hook checks.
- Full spec gate (lint + trace + security + app quality gate).

Expected:
- Gate exits success.
- No new security / performance / lint regressions.

## Manual smoke check (optional)

- In preview with fault injection enabled (`KB_E2E_FAULT_INJECTION=1`), edit a task to force
  `source_write_failed`.
- Confirm the task sheet stays open and shows an explicit failure message (no implied success).
- Trigger a keyboard/list mutation failure (`s` for status, `p` for priority); confirm the
  list-level error surface appears at the bottom of the list.
- Trigger a conflicting update with a stale version token; confirm an explicit `conflict` error.
- Confirm that with `KB_E2E_FAULT_INJECTION` unset, all mutation routes behave normally.
