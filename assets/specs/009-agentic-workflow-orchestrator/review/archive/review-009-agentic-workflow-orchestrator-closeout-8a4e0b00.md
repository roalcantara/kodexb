# Fix handoff — 009 closeout — review `8a4e0b00`

**Verdict:** `REQUEST_CHANGES` (see full audit)
**Full audit:** `tmp/reviews/review-009-agentic-workflow-orchestrator-8a4e0b00.md`
**Branch:** `feature/009-m4-retro-sandbox` · **Base:** `cdbfd366` · **Head:** `8a4e0b00`
**Focus:** governance-tools (workflow closeout B1–D2)

---

## Load

- `app-context`
- `app-testing`
- `mise-tasks`

## P0

1. `tools/governance/specs/workflow_run.script.ts` resume path (`~197-225`) | `findActiveRun` / `listActiveRuns` exist but unused | Wire: single active run → auto-default `run_id`; multiple → print sorted candidate list + exit 2; add co-located spec tests (M1-CLI-02 / B4)

2. `tools/governance/specs/workflow/orchestrator.script.ts` resume/dispatch | No `idempotency_key` dedup (AWO-13.3) | Track dispatched keys; on hydrate skip re-dispatch when envelope file exists for same key; co-located resume spec (M1-ADAPTER-02 / B2)

## P1

3. `orchestrator.script.ts:341-354` teardown | Synchronous `invokeWithTelemetry` in stage loop | Fire-and-forget spawn with `teardown_timeout_ms` (default 30s); `task.*` events; timeout-injection spec (M1-ENGINE-02 / B1)

4. `.github/workflows/smoke.yml` + `assets/guides/CI_GUIDE.md` § Workflow smoke | Smoke = `spec gate` only; guide cites unwired `mise run spec workflow smoke` | Orchestrator dogfood against fixture feature dir + gate, **or** honest task/docs downgrade (SMOKE-01 / D2)

5. `assets/catalog/workflows/default.yaml` | PROFILE-SDD-01 marked `[X]` but only specify + handoff-generate touched | Per-stage `command:` / evidence bindings per tasks.md **or** uncheck task + defer note (D1)

6. `assets/specs/009-agentic-workflow-orchestrator/tasks.md` | Reconciliation §Still open contradicts all `[X]` | Reconcile after fixes

## P2 (minor)

- `mise.toml` `spec perf` / `spec smoke` without `spec.script.ts` handlers — wire or remove from usage until 010 `spec test`
- `shutdown()`: no bounded grace wait before `shutdown.completed`
- `tools/metrics/harnesses/workflow/perf.script.ts`: stub loop — real measurements or document as placeholder (POLISH-02)

## Verify (subset — failed areas)

```sh
bun test --config /dev/null tools/governance/specs/workflow/
bun test --config /dev/null ./tools/governance/specs/workflow_run.script.spec.ts
mise run spec lint assets/specs/009-agentic-workflow-orchestrator
mise run spec gate assets/specs/009-agentic-workflow-orchestrator
```

## Out of scope

- `packages/workflow-core` / `packages/workflow-runtime` (010)
- Mise CLI redesign / `spec test` (010 — after 009 merges)

## Do not commit unless operator asks.
