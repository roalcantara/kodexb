# CI review e2e — Requirements

## Overview

Integrate the Playwright BDD e2e smoke and regression suites into the
`review.yml` CI workflow so every same-repo PR receives browser-level
regression feedback alongside lint, test, and build.

## Requirement syntax

- **WHEN** event, **THEN** the system **SHALL** response.
- **IF** precondition, **THEN** the system **SHALL** response.

## Requirements

### R1 — Parallel e2e jobs in review.yml

**User story:** As a reviewer I want e2e failures surfaced on the PR checks
tab so I can decide whether to merge without running the suite locally.

#### Acceptance criteria

1. WHEN a PR is opened or synchronized on the same repository, THEN the
   `review.yml` workflow SHALL include an `e2e-smoke` job that runs
   `CI=true NODE_ENV=test mise run test e2e --smoke --metrics-report`.
2. WHEN a PR is opened or synchronized on the same repository, THEN the
   `review.yml` workflow SHALL include an `e2e-regression` job that runs
   `CI=true NODE_ENV=test mise run test e2e --regression --metrics-report`.
3. WHEN a PR originates from a fork, THEN both e2e jobs SHALL be skipped.
4. WHEN the `e2e-smoke` job completes, THEN it SHALL upload a
   `report-e2e-smoke` artifact containing `tmp/e2e/` and
   `tmp/playwright-report/`.
5. WHEN the `e2e-regression` job completes, THEN it SHALL upload a
   `report-e2e-regression` artifact.
6. WHEN either e2e job produces JUnit output, THEN the workflow SHALL
   publish a check (E2E Smoke / E2E Regression) via
   `mikepenz/action-junit-report`.

### R2 — Bootstrap mode (non-blocking)

**User story:** As a maintainer I want e2e jobs visible on draft PRs without
blocking the build, so I can stabilize them before making them mandatory.

#### Acceptance criteria

1. WHEN e2e jobs are in bootstrap mode, THEN `preview.needs` SHALL remain
   `[hk, test, cst]` and SHALL NOT include e2e jobs.
2. WHEN a PR is a draft, THEN e2e jobs SHALL still run.
3. WHEN a PR is from a fork, THEN e2e jobs SHALL be skipped.

### R3 — Hard gate (deferred to item 5)

**User story:** As a maintainer I want e2e jobs to block the preview build
after at least 7 consecutive green runs prove stability.

#### Acceptance criteria

1. IF at least 7 consecutive workflow runs on same-repo PRs produce green
   E2E Smoke AND green E2E Regression, THEN the hard-gate precondition is
   satisfied.
2. WHEN the hard-gate precondition is satisfied, THEN
   `build.needs` SHALL be updated to `[hk, test, cst, e2e-smoke, e2e-regression]`.
3. WHEN the hard gate is active, THEN `e2e-regression` SHALL run
   `mise run test e2e --metrics-compare` and fail on degradation.

### R4 — Composite action reuse

**User story:** As a workflow maintainer I want a single composite action for
e2e setup so both jobs share the same dependency installation logic.

#### Acceptance criteria

1. WHEN an e2e job runs, THEN it SHALL use `.github/actions/setup-e2e-preview`
   for checkout, Bun/mise setup, Playwright cache, and
   `bun run e2e:preview:install`.

### R5 — Evidence and documentation

**User story:** As a release maintainer I want documented evidence of
bootstrap stability before enabling the hard gate.

#### Acceptance criteria

1. WHEN 7 consecutive green runs are collected, THEN `tasks.md` Phase 5
   precondition evidence SHALL contain a table with run URLs, commit SHAs,
   and pass/fail status for both jobs.
2. WHEN the item is complete, THEN `v0.10.0-scope.md` SHALL reference the
   evidence and draft PR URL.
