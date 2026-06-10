<!-- markdownlint-disable-file -->

# Tasks: Workflow packages & engine follow-ups (`010`)

**Input**: [`plan.md`](./plan.md), [`spec.md`](./spec.md) (WEP-1…WEP-9)
**Prerequisite**: **009 closeout merged** on `main`.

**Delivery**: **one PR** — `feature/010-workflow-packages`.

---

## Phase 1: Scaffold workspaces (WEP-1)

- [ ] WEP-SETUP-01 Add `packages/workflow-core/package.json` and `packages/workflow-runtime/package.json` (`@kb/workflow-*`, `exports`).
- [ ] WEP-SETUP-02 Root `package.json` workspaces + `tsconfig` path aliases.
- [ ] WEP-SETUP-03 [P] Barrel `src/index.ts`; `bun install` resolves packages.

**Checkpoint**: `bun install` exit 0.

---

## Phase 2: Promote L1 → `workflow-core` (WEP-2)

- [ ] WEP-CORE-01 `git mv` pure modules per plan.
- [ ] WEP-CORE-02 Move co-located specs; fix imports.
- [ ] WEP-CORE-03 ast-grep / depcruise on core package.

**Checkpoint**: `cd packages/workflow-core && bun test` (or `bun test --config packages/workflow-core/bunfig.toml`) exit 0.

---

## Phase 3: Promote L2 → `workflow-runtime` (WEP-3)

- [ ] WEP-RT-01 `git mv` runtime modules per plan.
- [ ] WEP-RT-02 `workflow-runtime` → `workflow-core` dependency.
- [ ] WEP-RT-03 Move co-located specs; fix imports.

**Checkpoint**: `cd packages/workflow-runtime && bun test` (or `bun test --config packages/workflow-runtime/bunfig.toml`) exit 0.

---

## Phase 4: Governance shims (WEP-4)

- [ ] WEP-SHIM-01 Keep kb CLI seams under `tools/governance/specs/workflow/`.
- [ ] WEP-SHIM-02 Re-export shims for `spec.script.ts` / workflow runners.
- [ ] WEP-SHIM-03 Conformance + workflow suite green.

**Checkpoint**: `bun test --config /dev/null tools/governance/specs/workflow/` exit 0.

---

## Phase 5: Workflow guide (WEP-5)

- [ ] WEP-GUIDE-WF-01 [P] Package layout section in [`WORKFLOW_GUIDE.md`](../../guides/WORKFLOW_GUIDE.md).

---

## Phase 6: Profile SDD bindings (WEP-6, PROFILE-SDD-01)

- [ ] WEP-PROFILE-01 Fill per-stage `evidence:` / `triggers.post` in `default.yaml` per plan table.
- [ ] WEP-PROFILE-02 Terminal `gate` stage evidence: `mise run spec gate` (+ document quality gate seam).
- [ ] WEP-PROFILE-03 `mise run catalog validate` + conformance spec green.

**Checkpoint**: profile replays SDD phase order; no stub-only stages except worker-only analyze/plan/tasks.

---

## Phase 7: Orchestrator smoke (WEP-7, SMOKE-01)

- [ ] WEP-SMOKE-01 Update `.github/workflows/smoke.yml` to orchestrator-driven gate path.
- [ ] WEP-SMOKE-02 Document in [`CI_GUIDE.md`](../../guides/CI_GUIDE.md) § Workflow smoke.
- [ ] WEP-SMOKE-03 [P] Optional: manual `mise run spec workflow run` dogfood note in handoff.

**Checkpoint**: smoke workflow green on `main`; direct-only gate path removed or secondary.

---

## Phase 8: kb lint boundary (WEP-8)

- [ ] WEP-LINT-01 Confirm `profile_guide_crossref.script.ts` is not imported by `packages/*`.
- [ ] WEP-LINT-02 [P] Add WORKFLOW_GUIDE note: kb-only conformance lints vs engine packages.

---

## Phase 9: Closeout (WEP-9)

- [ ] WEP-CLOSEOUT-01 `mise run spec lint assets/specs/010-workflow-packages` + `mise run spec gate assets/specs/010-workflow-packages` + `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
- [ ] WEP-CLOSEOUT-02 Update [`009` handoff](../009-agentic-workflow-orchestrator/handoff.md) deferred table; point mise CLI to **011**.

**Checkpoint**: [`handoff.md`](./handoff.md) verify block.

---

## Phase 10: Bun package manager (WEP-10) — follow-up on same PR

- [ ] WEP-PM-01 Add root `catalog` (or `workspaces.catalog`) for `xstate`, `@sinclair/typebox`, `yaml`; root deps use `catalog:` where shared.
- [ ] WEP-PM-02 Replace semver pins in `packages/workflow-core/package.json` and `packages/workflow-runtime/package.json` with `catalog:` + keep `@kb/workflow-core`: `workspace:*`.
- [ ] WEP-PM-03 Run `bun install`; commit `bun.lock` catalog section.
- [ ] WEP-PM-04 Fix handoff Evidence: `cd packages/workflow-core && bun test` (not `--config` path filter).
- [ ] WEP-PM-05 Update `.github/workflows/smoke.yml` to `bun ci` (or `--frozen-lockfile`); drop redundant direct `spec gate` if orchestrator path covers it.
- [ ] WEP-PM-06 [P] Document Bun PM conventions in [`WORKFLOW_GUIDE.md`](../../guides/WORKFLOW_GUIDE.md) § Package layout.
- [ ] WEP-PM-07 Resolve Biome violations in `packages/workflow-*` so `gate.sh` exits 0.

**Checkpoint**: `bash .agents/skills/app-quality-gate/scripts/gate.sh` green; WEP-10 AC1–AC5 evidenced.

**Handoff:** [`review/review-010-bun-pm-handoff.md`](./review/review-010-bun-pm-handoff.md)

---

## Explicitly NOT in 010

| Item                         | Owner   |
| ---------------------------- | ------- |
| Mise SDD hub / `spec test`   | **011** |
| `task_runner` gum output     | **011** |
| `app` / `policy` bin extract | **011** |
| 009 runtime hotfixes         | **009** |

---

## Dependencies

```text
Phase 1 → 2 → 3 → 4 → 5
              ↘
Phase 6 (profile) → 7 (smoke depends on profile bindings)
Phase 8 parallel with 6–7
Phase 9 last
```

**011** starts after 010 merges.
