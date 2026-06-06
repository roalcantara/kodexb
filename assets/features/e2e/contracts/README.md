<!-- markdownlint-disable-file -->
# E2e contracts

Normative assets for Gherkin-driven e2e acceptance:

| Document | Purpose |
|---|---|
| [`step-catalog.md`](step-catalog.md) | Gherkin phrase inventory, screenplay mapping, scenario IDs |
| [`fixture-manifest.md`](fixture-manifest.md) | Seed data, env vars, actor memory keys |

## Quality model

Each implemented scenario SHALL be scored during task review. A passing command
does not guarantee a passing review if the scenario is low quality.

| Category | Points | How to measure |
|---|---|---|
| Business priority coverage | 20 | P0/P1 item is implemented, not just tagged; source specs referenced with `@spec:<slug>` |
| Scenario quality | 15 | User-facing language, clear Given/When/Then boundaries, no selectors/RPC names |
| Assertion strength | 20 | Then steps prove meaningful user-visible or public persistence outcomes |
| Determinism | 15 | Isolated fixture data, no real user config, no conditional skips for valid seed |
| Screenplay structure | 15 | Steps delegate to tasks/questions/interactions; selector policy centralised |
| Maintainability | 10 | Reuses existing tasks/questions; keeps variants in Examples tables |
| Diagnostics | 5 | Failure leaves trace/report; scenario name identifies broken behaviour |

**Thresholds:** P0 smoke ≥ 85, P1 regression ≥ 80, P2 deferred/native/visual ≥ 75.

**Metrics commands:** `mise run test e2e --metrics-report`, `--metrics-compare`, `--write-baseline`.
Run report: `tmp/e2e/metrics/latest.json`. Release baseline: `tools/metrics/baselines/e2e-quality/quality-baseline.json`.

## Metrics registry

The quality model SHALL produce two output forms:

| Output | Path | Lifecycle |
|---|---|---|
| Run report | `tmp/e2e/metrics/latest.json` (+ timestamped) | Every smoke/regression run |
| Release baseline | `tools/metrics/baselines/e2e-quality/quality-baseline.json` | Updated at release boundaries |

**Release questions:**

1. Are the most important flows covered today?
2. Are those tests strong enough to trust?
3. Did this increment reduce coverage, determinism, or assertion quality?
4. Is the release baseline being moved intentionally, with review evidence?

**Degradation classifications:**

| Change | Classification |
|---|---|
| P0 automation % decreases | Release-blocking |
| Any P0 scenario falls below 85 | Release-blocking |
| Weak P0 assertion count rises above 0 | Release-blocking |
| Smoke conditional skip count rises above 0 | Release-blocking |
| Known smoke flake count rises above 0 | Release-blocking |
| P1 automation % decreases without deferral note | Regression |
| Average P1 score decreases by ≥5 points | Regression |
| Scenario gains `@todo` after being implemented | Regression |
| P0/P1 automation or score improves | Improvement |

## References

- [TESTING_GUIDE.md § E2e contracts](../../guides/TESTING_GUIDE.md#e2e-contracts)
- [BDD_GHERKIN_GUIDE.md](../../guides/BDD_GHERKIN_GUIDE.md)
- [TOOLS_GUIDE.md](../../guides/TOOLS_GUIDE.md) (metrics commands)
