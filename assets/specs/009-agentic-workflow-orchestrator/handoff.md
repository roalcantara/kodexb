<!-- markdownlint-disable-file -->

# Handoff — Agentic workflow orchestrator (`009`) — M4 slice

**Spec:** [`spec.md`](./spec.md) (AWO-8, AWO-11) · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md) Phase 7
**Architecture:** [`review/002/tool-agnostic-engine-review.md`](./review/002/tool-agnostic-engine-review.md) · **Data paths:** [`data-model.md`](./data-model.md)
**Program:** full sequence in [`tasks.md`](./tasks.md) · **This handoff:** **M4 only** (PR 5+). **Stop** after M4 closeout — do not start Polish on this branch.

**Prerequisite:** MVP + **M1** + **M2** + **M3** merged on `main`.

---

## Agent workflow (follow in order — do not reorder)

| Step | Action                                                                               | Success signal                                               |
| ---- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 1    | [Branch](#branch-step-1--mandatory)                                                  | `git branch --show-current` → `feature/009-m4-retro-sandbox` |
| 2    | Read [Lessons](#lessons-from-m2m3--read-before-coding) + [File map](#file-touch-map) | You know which files to **create**, **modify**, and **wire** |
| 3    | Implement [tasks](#implementation-tasks-phase-7) in order                            | Each task’s **Done when** bullets satisfied                  |
| 4    | Complete [Wiring checklist](#wiring-checklist-mandatory-before-verify)               | Every box checked                                            |
| 5    | [Verify](#verify-step-5--mandatory-all-must-exit-0)                                  | Every command exit 0 (`echo $?` after each)                  |
| 6    | [Commit](#commit-step-6--mandatory-after-verify)                                     | `git log -1` shows your M4 commit                            |
| 7    | [Post-commit](#post-commit-step-7--mandatory)                                        | PR URL from `gh pr create`                                   |

**Claiming done without step 5 green is a handoff violation.** Marking task checkboxes `[X]` before integration tests exist will fail `/app-review-handoff`.

---

## Lessons from M2/M3 — read before coding

Prior slices passed **unit tests on pure helpers** but failed review because **production paths were unwired** or **Evidence did not assert AC semantics**. Avoid:

| Anti-pattern                                  | M2/M3 example                                            | M4 requirement                                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| L1 module exists, orchestrator never calls it | intervention not wired until fix pass                    | Every new module must be **imported and invoked** from `orchestrator.script.ts` or `workflow_invoker.script.ts` at a documented boundary |
| Evidence → unit spec only                     | `checkCiGate` passed; CI didn’t block `terminal_success` | AC Evidence must include **orchestrator integration** tests named `AWO-8 ACn` / `AWO-11 ACn`                                             |
| Fixture stub file unused                      | `stub-ci-fail-then-pass.sh` not referenced               | Every fixture under `tools/__tests__/fixtures/workflow/` must be **referenced by a spec**                                                |
| Handoff AC table misaligned                   | AC3 pointed at `memory.spec` for intervention behavior   | Evidence column must name the spec file that **asserts that AC**                                                                         |

**Rule:** If you cannot point to an `it('AWO-X ACn: …')` that fails when you delete the orchestrator wiring, the AC is not done.

---

## Branch (step 1 — mandatory)

Run **exactly** from repo root with a clean or stashed working tree:

```sh
git fetch origin
git checkout main
git pull origin main
git checkout -b feature/009-m4-retro-sandbox
git branch --show-current
```

**Required output:** `feature/009-m4-retro-sandbox`
If wrong branch: stop and fix before writing code.

If the branch already exists: `git checkout feature/009-m4-retro-sandbox && git rebase origin/main`.

---

## Mission

Ship **retrospective self-improvement + worker sandbox enforcement** (AWO-8, AWO-11):

1. **Retrospective (AWO-8)** — after terminal outcome, write `tools/metrics/workflow-runs/<date>/<run_id>.retro.md` (four sections + ranked recommendations linked to NDJSON `event.id`s); append insights to `assets/catalog/agent_memory.yaml`; load catalog insights at orchestrator startup into stage memory.
2. **Sandbox (AWO-11)** — at dispatch boundary, enforce optional per-stage `sandbox:` descriptor; block violations with `SANDBOX_VIOLATION` + `sandbox.violation` event; `passthrough` requires `acknowledged_unsafe: true` at profile load.

**Invariants:**

- L1 (`retrospective.script.ts`, `sandbox.script.ts`) — pure; no I/O, no spawn, no toolchain string literals.
- L3 (`agent_memory.script.ts`) — catalog file I/O only.
- L2 — spawn stays in `command_invoker` / `workflow_invoker`; sandbox **checks** run before `invokeWithTelemetry`.
- Retro path: **metrics** dir (`persistenceConfig.metricsDir`), not `tmp/workflow-runs/` (see [`data-model.md`](./data-model.md)).

---

## File touch map

| Path                                                           | Action                                                                        | Owner task                                 |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| `tools/governance/specs/workflow/retrospective.script.ts`      | **CREATE** L1                                                                 | M4-ENGINE-01                               |
| `tools/governance/specs/workflow/retrospective.script.spec.ts` | **CREATE**                                                                    | M4-ENGINE-01                               |
| `tools/governance/specs/workflow/agent_memory.script.ts`       | **CREATE** L3                                                                 | M4-PROFILE-01                              |
| `tools/governance/specs/workflow/agent_memory.script.spec.ts`  | **CREATE**                                                                    | M4-PROFILE-01                              |
| `tools/governance/specs/workflow/sandbox.script.ts`            | **CREATE** L1                                                                 | M4-ADAPTER-01                              |
| `tools/governance/specs/workflow/sandbox.script.spec.ts`       | **CREATE**                                                                    | M4-ADAPTER-01                              |
| `tools/governance/specs/workflow/orchestrator.script.ts`       | **MODIFY** wire retro + memory load + sandbox                                 | M4-ENGINE-01, M4-PROFILE-01, M4-ADAPTER-01 |
| `tools/governance/specs/workflow/orchestrator.script.spec.ts`  | **MODIFY** add M4 integration tests                                           | all                                        |
| `tools/governance/specs/workflow/workflow_invoker.script.ts`   | **MODIFY** sandbox gate before invoke                                         | M4-ADAPTER-01                              |
| `tools/governance/specs/workflow/profile_loader.script.ts`     | **MODIFY** passthrough acknowledgment                                         | M4-ADAPTER-01                              |
| `assets/catalog/agent_memory.yaml`                             | **CREATE** on first append (or seed example in fixtures)                      | M4-PROFILE-01                              |
| `assets/catalog/workflows/default.yaml`                        | **MODIFY** optional `sandbox` on one stage; `providers.retrospective` if used | M4-ADAPTER-01                              |
| `tools/__tests__/fixtures/workflow/fixture-profile.yaml`       | **MODIFY** sandbox + retro fixtures                                           | M4-ADAPTER-01                              |
| `assets/guides/SECURITY_GUIDE.md`                              | **MODIFY** § runtime worker sandbox                                           | M4-GUIDE-01                                |
| `assets/guides/OBSERVABILITY_GUIDE.md`                         | **MODIFY** cross-ref retro artifact                                           | M4-GUIDE-01                                |

---

## Project overrides

- **Skills:** `app-context`, `app-testing`, `mise-tasks`
- **Bun** only; `bun test --config /dev/null …` (repo `bunfig.toml` roots at `src/`)
- **TypeBox** only; co-located `*.script.spec.ts` for every new `*.script.ts`
- **Tests:** `mkdtemp` scratch dirs; fixture profiles; **no real network / no production catalog writes** in unit specs
- **Single-file test paths:** prefix with `./` (e.g. `./tools/governance/specs/workflow/retrospective.script.spec.ts`)
- **Logging:** `getLogger`; never `console.*`
- **Scope:** `tools/` + `assets/catalog/` + guides — **not** `src/`

---

## Implementation tasks (Phase 7 — mark `[X]` in tasks.md when done)

### ENGINE — retrospective (L1 + orchestrator wire)

- [X] **M4-ENGINE-01** (AWO-8.1, AWO-8.2)
  - **CREATE** `retrospective.script.ts`: build retro markdown from NDJSON tail — sections **Blockers**, **Retries**, **Interventions**, **Successful patterns**; ranked recommendations each citing ≥1 `event.id`.
  - **CREATE** `retrospective.script.spec.ts` with `it('AWO-8 AC1: …')` and `it('AWO-8 AC2: …')` using fixture NDJSON fixtures.
  - **WIRE** `orchestrator.script.ts`: after `run.summary` / terminal outcome, call retro writer → `metricsDir/<date>/<run_id>.retro.md` (use `WorkflowRunWriter` paths / `persistenceConfig.metricsDir`).
  - **Done when:** orchestrator integration test proves `.retro.md` exists with four sections after a terminal fixture run.

### PROFILE — agent memory catalog (L3 + startup load)

- [X] **M4-PROFILE-01** (AWO-8.3, AWO-8.4)
  - **CREATE** `agent_memory.script.ts`: append insight entries (`insight_id`, `run_id`, `timestamp`, body/tags); load insights for startup; merge into stage memory via existing `memory.script.ts` / `ensureStageMemory`.
  - **CREATE** `agent_memory.script.spec.ts` with `it('AWO-8 AC3: …')` (append + schema) and `it('AWO-8 AC4: …')` (multi-run: seed catalog → next run stage memory contains insight).
  - **WIRE** orchestrator constructor / `run()` start: load catalog insights; after retro, append new insights from retro output.
  - **Done when:** orchestrator spec seeds `agent_memory.yaml` in scratch catalog path and asserts stage memory on second run.

### ADAPTER — sandbox enforcement (L1 + L2 gate)

- [X] **M4-ADAPTER-01** (AWO-11.1–11.4)
  - **CREATE** `sandbox.script.ts`: pure checks — tool allowlist, fs_scope roots/deny, network policy, secret_handling; return violation descriptor field or null.
  - **CREATE** `sandbox.script.spec.ts`: **one `it('AWO-11 AC2: …')` per dimension** (tool, fs, network, secret).
  - **MODIFY** `workflow_invoker.script.ts` (or thin `sandbox_gate.script.ts` called from invoker): if stage has `sandbox`, run checks before `runCommand`; on violation emit `sandbox.violation` via writer and return blocked result (no spawn).
  - **MODIFY** `profile_loader.script.ts`: reject `secret_handling: passthrough` without `acknowledged_unsafe: true` (`it('AWO-11 AC3: …')` in profile_loader or sandbox spec).
  - **MODIFY** `fixture-profile.yaml`: stage with minimal `sandbox:` block for tests.
  - **Done when:** orchestrator spec dispatches stage with sandbox and asserts `sandbox.violation` in NDJSON for injected violation.

### GUIDE

- [X] **M4-GUIDE-01** [P] Document runtime worker sandbox in [`SECURITY_GUIDE.md`](../../guides/SECURITY_GUIDE.md) (replace “defined per workflow spec” stub); cross-ref retro path in [`OBSERVABILITY_GUIDE.md`](../../guides/OBSERVABILITY_GUIDE.md).

### Closeout

- [X] **M4-CLOSEOUT-01** Wiring checklist complete; all Verify commands exit 0; Phase 7 `[X]` in [`tasks.md`](./tasks.md); handoff checkboxes `[X]`.

---

## Wiring checklist (mandatory before Verify)

Check each item in the implementing agent’s head — **all must be true**:

- [X] `orchestrator.script.ts` calls retrospective after terminal run (not only a standalone unit test).
- [X] `orchestrator.script.ts` loads `agent_memory` at startup and appends after retro.
- [X] `workflow_invoker.script.ts` (or callee) runs sandbox checks when `stageDef.sandbox` is present.
- [X] `profile_loader.script.ts` enforces `acknowledged_unsafe` for `passthrough`.
- [X] `orchestrator.script.spec.ts` contains ≥2 new tests tagged `AWO-8` and ≥1 tagged `AWO-11`.
- [X] Every new `*.script.ts` has co-located `*.script.spec.ts`.
- [X] No `gh`/`mise`/`hk` string literals in L1 modules (`retrospective.script.ts`, `sandbox.script.ts`).
- [X] `bun run lint:ast-grep` still clean (spawn only in L2 adapter).

---

## Maintainer AC checklist (M4 slice)

Check a row only when its Evidence exits 0 **and** the named spec contains an `it('AWO-X ACn: …')` that asserts the AC behavior (not merely imports the module).

| ID         | Done when                                                                         | Evidence                                                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWO-8 AC1  | Terminal run writes `.retro.md` with four sections under metrics path             | `bun test --config /dev/null ./tools/governance/specs/workflow/retrospective.script.spec.ts` **and** `./tools/governance/specs/workflow/orchestrator.script.spec.ts` |
| AWO-8 AC2  | Recommendations ranked; each references an `event.id` from fixture NDJSON         | `bun test --config /dev/null ./tools/governance/specs/workflow/retrospective.script.spec.ts`                                                                         |
| AWO-8 AC3  | Insights append to catalog with `insight_id`, `run_id`, `timestamp`               | `bun test --config /dev/null ./tools/governance/specs/workflow/agent_memory.script.spec.ts`                                                                          |
| AWO-8 AC4  | Next run loads catalog insights into stage memory                                 | `bun test --config /dev/null ./tools/governance/specs/workflow/agent_memory.script.spec.ts` **and** `./tools/governance/specs/workflow/orchestrator.script.spec.ts`  |
| AWO-11 AC1 | Profile with/without `sandbox` validates; dispatch honors descriptor when present | `bun test --config /dev/null ./tools/governance/specs/workflow/schemas/profile.schema.spec.ts` **and** `./tools/governance/specs/workflow/sandbox.script.spec.ts`    |
| AWO-11 AC2 | Each sandbox dimension blocks with `SANDBOX_VIOLATION`                            | `bun test --config /dev/null ./tools/governance/specs/workflow/sandbox.script.spec.ts`                                                                               |
| AWO-11 AC3 | `passthrough` without `acknowledged_unsafe` fails profile load                    | `bun test --config /dev/null ./tools/governance/specs/workflow/profile_loader.script.spec.ts`                                                                        |
| AWO-11 AC4 | Blocked action emits `sandbox.violation` in NDJSON                                | `bun test --config /dev/null ./tools/governance/specs/workflow/orchestrator.script.spec.ts`                                                                          |

---

## Verify (step 5 — mandatory; all must exit 0)

Run from repo root. After **each** command: `echo $?` must print `0`.

```sh
# Full workflow Layer A suite (includes all new specs)
bun test --config /dev/null tools/governance/specs/workflow/

# Parent-level CLI specs (./ prefix required)
bun test --config /dev/null ./tools/governance/specs/workflow_run.script.spec.ts
bun test --config /dev/null ./tools/bin/spec.script.spec.ts

# Per-AC specs (run individually while developing)
bun test --config /dev/null ./tools/governance/specs/workflow/retrospective.script.spec.ts
bun test --config /dev/null ./tools/governance/specs/workflow/agent_memory.script.spec.ts
bun test --config /dev/null ./tools/governance/specs/workflow/sandbox.script.spec.ts
bun test --config /dev/null ./tools/governance/specs/workflow/orchestrator.script.spec.ts
bun test --config /dev/null ./tools/governance/specs/workflow/profile_loader.script.spec.ts

# Static
bun run lint:ast-grep

# Spec documents
mise run spec lint assets/specs/009-agentic-workflow-orchestrator
mise run spec gate assets/specs/009-agentic-workflow-orchestrator

# Repo merge bar (run before commit)
mise run app gates --quality
mise run spec ready
bash .agents/skills/app-quality-gate/scripts/gate.sh

# Regression (required before merge)
CI=true NODE_ENV=test mise run test e2e --regression
```

Operator before merge: `/app-review-handoff` on this file with Evidence exit codes.

---

## Out of scope (this handoff)

- Phase 8 Polish (`POLISH-01`, `POLISH-02`)
- `PROFILE-SDD-*`, `SMOKE-*`
- `packages/workflow-*`, `src/` changes
- Process isolation / containers (AWO-11 is descriptor + dispatcher enforcement only)

---

## Commit (step 6 — mandatory after Verify)

One commit on `feature/009-m4-retro-sandbox`:

```sh
git add \
  tools/governance/specs/workflow/ \
  tools/governance/specs/workflow_run.script.ts \
  assets/catalog/workflows/default.yaml \
  assets/catalog/agent_memory.yaml \
  tools/__tests__/fixtures/workflow/ \
  assets/guides/SECURITY_GUIDE.md \
  assets/guides/OBSERVABILITY_GUIDE.md \
  assets/specs/009-agentic-workflow-orchestrator/

git commit -m "$(cat <<'EOF'
feat(workflow): add M4 retrospective and sandbox slice

Retro artifacts, agent_memory catalog, sandbox enforcement at
dispatch boundary (AWO-8, AWO-11).

EOF
)"
```

Confirm: `git log -1 --oneline` and `git status` clean (or only intentional unstaged files).

---

## Post-commit (step 7 — mandatory)

```sh
git push -u origin HEAD

gh pr create \
  --title "feat(workflow): 009 M4 retrospective and sandbox" \
  --body "$(cat <<'EOF'
## Summary
- Add retrospective stage writing `.retro.md` and ranked recommendations
- Add `agent_memory.yaml` append/load and startup insight surfacing
- Enforce optional per-stage sandbox at dispatch with `sandbox.violation` events

## Test plan
- [ ] `bun test --config /dev/null tools/governance/specs/workflow/`
- [ ] `bun test --config /dev/null ./tools/governance/specs/workflow/orchestrator.script.spec.ts`
- [ ] `bun run lint:ast-grep`
- [ ] `mise run spec gate assets/specs/009-agentic-workflow-orchestrator`
- [ ] `/app-review-handoff` on handoff.md

EOF
)"
```

If PR exists: `gh pr view --web`. If push rejected: `git pull --rebase origin main` then push again.

---

## Roadmap (after M4 merges — not this branch)

| Slice        | Phase | Requirements                                     | PR           |
| ------------ | ----- | ------------------------------------------------ | ------------ |
| **Polish**   | 8     | AWO-12.3 guide crossref; NFR baselines + harness | —            |
| **Optional** | —     | PROFILE-SDD, SMOKE                               | nightly only |
