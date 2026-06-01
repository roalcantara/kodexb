# CI review e2e — Tasks

## Phase 2 — Workflow jobs (bootstrap)

- [ ] Create `.github/actions/setup-e2e-preview/action.yml`
- [ ] Add `e2e-smoke` job to `.github/workflows/review.yml`
- [ ] Add `e2e-regression` job to `.github/workflows/review.yml`
- [ ] Validate with `mise exec -- actionlint .github/workflows/review.yml`
- [ ] Push branch, create same-repo draft PR
- [ ] Confirm both e2e jobs appear as checks on the draft PR

### Evidence

| Item | Status |
|------|--------|
| `setup-e2e-preview/action.yml` exists | [ ] |
| `review.yml` contains `e2e-smoke` | [ ] |
| `review.yml` contains `e2e-regression` | [ ] |
| `actionlint` passes | [ ] |
| Draft PR created | [ ] |
| E2E checks visible on PR | [ ] |

## Phase 5 — Hard gate

**Precondition:** 7 consecutive green runs for BOTH E2E Smoke and E2E
Regression on same-repo PRs.

### Phase 5 precondition evidence (v0.10.0 item 4 deliverable)

| # | workflow_run_url | commit_sha | E2E Smoke | E2E Regression | date_utc |
|---|-----------------|------------|-----------|----------------|----------|
|   |                 |            |           |                |          |

- [ ] 7 consecutive green E2E Smoke runs recorded
- [ ] 7 consecutive green E2E Regression runs recorded
- [ ] Evidence table complete

### Hard-gate implementation (deferred to item 5)

- [ ] Update `build.needs` to `[hk, test, cst, e2e-smoke, e2e-regression]`
- [ ] Add `mise run test e2e --metrics-compare` to regression job
- [ ] Update `CI_GUIDE.md` branch-protection section
