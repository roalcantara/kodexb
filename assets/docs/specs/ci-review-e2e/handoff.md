# CI review e2e — Handoff

## Status

**Item 4 (bootstrap):** in progress — CI wiring pending, 7-green collection
pending.

**Item 5 (hard gate):** not started — deferred per v0.10.0-scope.md.

## Current branch

`release/v0.10.0` @ latest commit (items 1–3 done; local e2e green).

## What exists

- `review.yml` with hk, test, cst, build jobs
- `setup-bun-project` composite action (mise mode)
- `junit-summary` composite action
- Local e2e smoke (20/20) and regression (44/44) green

## What this handoff creates

1. `assets/docs/specs/ci-review-e2e/` — requirements, design, tasks, handoff
2. `.github/actions/setup-e2e-preview/action.yml` — composite action
3. `e2e-smoke` + `e2e-regression` jobs in `review.yml` (bootstrap mode)
4. `assets/docs/specs/README.md` — ci-review-e2e index entry

## What needs the agent

1. Push `release/v0.10.0`, create same-repo draft PR
2. Confirm e2e jobs appear as checks
3. Accumulate 7 consecutive green runs for each tier
4. Record evidence in `tasks.md` Phase 5 table
5. Update `v0.10.0-scope.md` §Evidence item 4 when done

## Constraints

- e2e jobs run on draft PRs (bootstrap mode)
- `build.needs` stays `[hk, test, cst]` during bootstrap
- No `--metrics-compare` in bootstrap
- Fork PRs skip e2e jobs
- Do NOT enable hard gate (item 5) until maintainer approval
