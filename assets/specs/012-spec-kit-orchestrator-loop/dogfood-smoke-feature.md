# KIT-SMOKE-FEATURE-DOGFOOD (operator)

**Fixture:** `tools/__tests__/fixtures/workflow/smoke-feature`
**Feature:** [`012-spec-kit-orchestrator-loop`](./spec.md) Slice B
**Automated counterpart:** `bun test --config /dev/null tools/bin/spec_kit.script.spec.ts` + `mise run spec test smoke` (SKO-7; unattended path still in progress)

Use this recipe for **manual operator dogfood** on the committed smoke fixture.
CI / `spec test smoke` must eventually cover the unattended path; this doc is the human-readable contract and evidence checklist.

## Prerequisites

- On branch `feature/012-spec-kit-orchestrator-loop` (or `main` after merge).
- Repo root; `mise` + `bun` available.
- Optional clean slate for gate markers:

  ```sh
  rm -rf tools/__tests__/fixtures/workflow/smoke-feature/.gates
  ```

---

## REQUIREMENT: KIT-SMOKE-FEATURE-DOGFOOD

As an **SDD operator**,
I want to **step through `spec kit next` on the smoke fixture**,
In order to **confirm resolve → preflight → dispatch (and human-gate pause) before relying on CI smoke**.

### Acceptance criteria

1. WHEN operator runs
   `mise run spec kit next tools/__tests__/fixtures/workflow/smoke-feature --dry-run`
   THEN stdout SHALL contain `review-spec`
   AND SHALL contain a gate hint (`--approve` or `Operator review`).

2. WHEN operator runs
   `mise run spec kit next tools/__tests__/fixtures/workflow/smoke-feature --loop`
   THEN stdout SHALL match `/<slug>-<digits>-<hex> \[review-spec\]/`
   AND stderr SHALL contain `human gate "review-spec" requires approval`
   AND exit code SHALL be `1` (recoverable pause, not a crash).

3. WHEN operator runs
   `mise run spec kit next tools/__tests__/fixtures/workflow/smoke-feature --approve`
   (after AC 2 or with uncleared gates)
   THEN stdout SHALL contain `kit checklist: dispatching /speckit-checklist`
   AND exit code SHALL be `0`.

4. WHEN operator runs AC 1 before and after one successful `--approve`
   THEN `--dry-run` stdout SHALL differ (stage advanced past `review-spec`).

5. WHEN operator runs
   `mise run spec workflow run tools/__tests__/fixtures/workflow/smoke-feature --dry-run`
   THEN stdout SHALL match AC 1 (alias parity with `kit next --dry-run`).

6. WHEN operator runs AC 3 again without creating `checklists/requirements.md`
   THEN a subsequent `mise run spec kit next tools/__tests__/fixtures/workflow/smoke-feature --dry-run`
   MAY still resolve to `checklist`
   (stub writes envelope only; file-based done-when not satisfied — known gap until smoke harness lands).

### Out of scope (this recipe)

- Full unattended loop to terminal gate (SKO-7 / `mise run spec test smoke`).
- Live `assets/specs/NNN-*` dirs (use smoke fixture only).
- Real `/speckit-*` or `gh` calls (Slice A/B stubs).

---

## Evidence artifact (optional)

After a dogfood pass, capture:

| Field        | Value                                                       |
| ------------ | ----------------------------------------------------------- |
| Date         | `YYYY-MM-DD`                                                |
| Operator     | name or handle                                              |
| Branch / SHA | `git branch --show-current` + `git rev-parse --short HEAD`  |
| Run id       | from stdout prefix, e.g. `smoke-feature-1781193805111-f8f5` |
| Transcript   | paste or redirect (see below)                               |
| Envelopes    | `tmp/workflow-runs/<date>/<run_id>/*.envelope.*.json`       |

**Capture transcript:**

```sh
FIXTURE=tools/__tests__/fixtures/workflow/smoke-feature
LOG=tmp/dogfood/kit-smoke-feature-$(date +%Y%m%d-%H%M%S).log
mkdir -p tmp/dogfood

{
  echo "=== dry-run ('mise run spec kit next $FIXTURE --dry-run') ==="
  mise run spec kit next "$FIXTURE" --dry-run
  echo "exit=$?"

  echo "=== loop ('mise run spec kit next $FIXTURE --loop') => expect pause ==="
  mise run spec kit next "$FIXTURE" --loop
  echo "exit=$?"

  echo "=== approve ('mise run spec kit next $FIXTURE --approve') => expect checklist stub ==="
  mise run spec kit next "$FIXTURE" --approve
  echo "exit=$?"

  echo "=== dry-run after approve ('mise run spec kit next $FIXTURE --dry-run') ==="
  mise run spec kit next "$FIXTURE" --dry-run
  echo "exit=$?"

  echo "=== workflow run dry-run parity ('mise run spec workflow run $FIXTURE --dry-run') ==="
  mise run spec workflow run "$FIXTURE" --dry-run
  echo "exit=$?"
} 2>&1 | tee "$LOG"

echo "Wrote $LOG"
```

Link the log path and run id in [`handoff.md`](./handoff.md) § Run artifacts.

---

## Quick reference

| Intent                               | Command                                          |
| ------------------------------------ | ------------------------------------------------ |
| Peek next stage                      | `mise run spec kit next <fixture> --dry-run`     |
| Clear one human gate + run next verb | `mise run spec kit next <fixture> --approve`     |
| Auto-advance until next gate         | `mise run spec kit next <fixture> --loop`        |
| Workflow alias (dry)                 | `mise run spec workflow run <fixture> --dry-run` |
| Workflow alias (loop)                | `mise run spec workflow run <fixture>`           |
