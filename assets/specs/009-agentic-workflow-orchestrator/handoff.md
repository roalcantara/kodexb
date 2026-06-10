<!-- markdownlint-disable-file -->

# Handoff — Agentic workflow orchestrator (`009`) — M3 slice

**Spec:** [`spec.md`](./spec.md) (AWO-6) · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md) Phase 6
**Architecture:** [`review/002/tool-agnostic-engine-review.md`](./review/002/tool-agnostic-engine-review.md) (4-layer engine)
**Program:** full multi-PR sequence in [`tasks.md`](./tasks.md) · **This handoff:** **M3 only** (PR 4). **Stop** after M3 closeout — do not start M4 until the operator merges the M3 PR.

**Prerequisite:** MVP + **M1** + **M2** merged on `main` — orchestrator, memory, intervention, resume CLI.

---

## Agent workflow (follow in order)

1. **Branch** — run the commands in [§ Branch](#branch-mandatory-first-step); confirm `git branch --show-current` prints `feature/009-m3-pr-ci-completion`.
2. **Implement** — complete every unchecked task in [§ Implementation tasks](#implementation-tasks-phase-6--mark-x-in-tasksmd-when-done).
3. **Verify** — run **every** command in [§ Verify](#verify-mandatory--all-must-exit-0); fix failures before continuing.
4. **Review prep** — operator runs `/app-review-handoff` on this file (or you report Evidence exit codes).
5. **Commit** — run [§ Commit](#commit-mandatory-after-verify-is-green) exactly; one commit for this slice.
6. **Post-commit** — run [§ Post-commit](#post-commit-mandatory-after-commit) to push and open the PR.

Do **not** skip steps or claim done while any Verify command is non-zero.

---

## Branch (mandatory first step)

From a clean working tree on updated `main`:

```sh
git fetch origin
git checkout main
git pull origin main
git checkout -b feature/009-m3-pr-ci-completion
git branch --show-current   # MUST print: feature/009-m3-pr-ci-completion
```

If the branch already exists locally: `git checkout feature/009-m3-pr-ci-completion && git rebase main`.

---

## Mission

On merged M2, ship **provider-agnostic PR/CI completion** (AWO-6):

- **Profile** — add `providers.{pr_open,pr_update,ci_status}` to [`assets/catalog/workflows/default.yaml`](../../catalog/workflows/default.yaml) and a **PR-prep** stage (`triggers.post`, e.g. `hk check --profile pr`); extend fixture profile for tests.
- **L2 adapter** — `providers_runner.script.ts`: invoke provider `command:` strings only via existing `runCommand` / `command_invoker` (no direct `gh` in engine).
- **L1 policy** — `ci_gate.script.ts`: pure CI-status gate + R2R remediation decisions (green / pending / failing; retry budget from profile).
- **Orchestrator** — wire implement → PR-prep → optional `pr_open` → CI gate → terminal success only when bound `ci_status` exits 0; R2R loop on CI failure per `default_retry`.
- **Guide** — add **Orchestrator PR/CI bindings** section to [`CI_GUIDE.md`](../../guides/CI_GUIDE.md).

**Invariant:** orchestrator code MUST NOT call `gh`, `git push`, or CI vendor APIs directly — only profile `command:` bindings ([AWO-6](spec.md#requirement-awo-6-pr-and-ci-green-completion-contract-provider-agnostic)).

---

## Project overrides (read before coding)

- **Load skills:** `app-context`, `app-testing`, `mise-tasks`
- **Bun runtime**; `bun test`, `bun run`. No Node/Jest/Vitest.
- **TypeBox only** (`Type.*` + `Value.Check`). **No Zod.**
- **Co-located specs** for every new `.script.ts`; **no mocking** — stub providers via fixture shell scripts under `tools/__tests__/fixtures/workflow/` (e.g. `stub-ci-green.sh`, `stub-ci-fail-then-pass.sh`).
- **Naming:** `snake_case.script.ts`; ls-lint + Biome enforce.
- **Logging:** `getLogger(['kb','tools','spec','workflow', …])`; never `console.*`.
- Work lives in `tools/`, **not** `src/`.

---

## Non-negotiable architecture (review 002)

1. **Providers are profile data.** `pr_open` / `pr_update` / `ci_status` live in YAML; engine reads strings and dispatches through L2 only.
2. **L1 (`ci_gate.script.ts`) stays pure** — no spawn, no `gh`/`mise`/`hk` string literals.
3. **Spawn only in L2** — `command_invoker.script.ts` / `providers_runner.script.ts`; ast-grep enforces this.
4. **PR reference** — persist provider stdout / parsed PR id in run-shared memory (`<run_id>.shared.json`) per AWO-6 AC2.
5. **Tests use fixture profiles** — never real `gh` or GitHub in unit specs.

---

## Implementation tasks (Phase 6 — mark `[X]` in tasks.md when done)

### PROFILE

- [X] **M3-PROFILE-01** Extend `default.yaml`: `providers.pr_open`, `providers.pr_update`, `providers.ci_status` (kb defaults: `gh pr create …`, `gh pr edit …`, `gh pr checks …` or `mise run` wrappers); add **pr-prep** stage after `implement` with `triggers.post`; update transitions. Add/update fixture profile (`tools/__tests__/fixtures/workflow/fixture-pr-ci.yaml` or extend `fixture-profile.yaml`) with stub `command:` bindings. (AWO-6.1, AWO-6.2)

### ADAPTER

- [X] **M3-ADAPTER-01** Implement `providers_runner.script.ts` (invoke provider commands; capture PR ref → shared memory) and `ci_gate.script.ts` (CI gate policy + R2R inputs). Wire orchestrator: PR-prep stage, CI gate before `terminal_success`, remediation loop with stubbed green/pending/failing/then-passing providers. Co-located `providers_runner.script.spec.ts` + `ci_gate.script.spec.ts`; extend `orchestrator.script.spec.ts` for implement→PR-prep path. (AWO-6.3, AWO-6.4)

### GUIDE

- [X] **M3-GUIDE-01** [P] Add **Orchestrator PR/CI bindings** to [`CI_GUIDE.md`](../../guides/CI_GUIDE.md) (provider fields, pr-prep stage, CI gate, swapping providers via profile only).

### Closeout

- [X] **M3-CLOSEOUT-01** All [Verify](#verify-mandatory--all-must-exit-0) commands exit 0; Phase 6 tasks `[X]` in [`tasks.md`](./tasks.md); handoff checkboxes above `[X]`.

---

## Maintainer AC checklist (M3 slice)

Check each row only when its Evidence command exits 0 **and** the test assertions match the AC.

| ID        | Done when                                                                                                                      | Evidence                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| AWO-6 AC1 | After implement, orchestrator enters PR-prep; commands resolve via profile `command:` only (no direct provider APIs in engine) | `bun test --config /dev/null ./tools/governance/specs/workflow/orchestrator.script.spec.ts` **and** `bun run lint:ast-grep` |
| AWO-6 AC2 | `pr_open` binding runs when enabled; PR ref in shared memory; disabled profile skips `pr_open`                                 | `bun test --config /dev/null ./tools/governance/specs/workflow/providers_runner.script.spec.ts`                             |
| AWO-6 AC3 | `terminal_success` only when bound `ci_status` exit 0; pending/failing block success                                           | `bun test --config /dev/null ./tools/governance/specs/workflow/ci_gate.script.spec.ts`                                      |
| AWO-6 AC4 | CI failure enters R2R remediation; failing-then-passing stub succeeds; escalation at retry threshold                           | `bun test --config /dev/null ./tools/governance/specs/workflow/ci_gate.script.spec.ts`                                      |

> Create the Evidence spec files in M3-ADAPTER-01 before marking AC rows done. Use `./` prefix on single-file test paths (Bun requirement).

---

## Pitfalls (prior slices — don't reintroduce)

- **Inlining `gh pr create` in orchestrator** — profile binding + `providers_runner` only.
- **CI gate in L1 with spawn** — policy pure; execution in L2.
- **Skipping fixture stubs** — real GitHub must not run in `bun test`.
- **Implementing M4 on this branch** — retrospective/sandbox is next slice.

---

## Verify (mandatory — all must exit 0)

Run from repo root. **After each command, confirm exit code 0** (`echo $?`).

```sh
# Layer A — workflow engine (directory filter; includes new specs when present)
bun test --config /dev/null tools/governance/specs/workflow/

# Layer A — parent-level CLI specs (./ prefix required for single files)
bun test --config /dev/null ./tools/governance/specs/workflow_run.script.spec.ts

# CLI routing (if spec.workflow / resume touched)
bun test --config /dev/null ./tools/bin/spec.script.spec.ts

# Static — no direct spawn outside L2; no provider API leaks
bun run lint:ast-grep

# Spec document gates
mise run spec lint assets/specs/009-agentic-workflow-orchestrator
mise run spec gate assets/specs/009-agentic-workflow-orchestrator

# Repo quality (operator merge bar — run before commit)
mise run app gates --quality
mise run spec ready
bash .agents/skills/app-quality-gate/scripts/gate.sh

# Regression (optional locally if slow; required before merge)
CI=true NODE_ENV=test mise run test e2e --regression
```

**Per-AC Evidence** (must also pass individually during development):

```sh
bun test --config /dev/null ./tools/governance/specs/workflow/orchestrator.script.spec.ts
bun test --config /dev/null ./tools/governance/specs/workflow/providers_runner.script.spec.ts
bun test --config /dev/null ./tools/governance/specs/workflow/ci_gate.script.spec.ts
```

Operator before merge: `/app-review-handoff` on this file with Evidence exit codes.

---

## Out of scope (this handoff)

- M4 (AWO-8, AWO-11 retrospective + sandbox)
- POLISH-02 NFR harness; `PROFILE-SDD-*`, `SMOKE-*`
- `packages/workflow-*`, `src/` changes, `hk.pkl` / `mise.toml` beyond doc refs

---

## Commit (mandatory after Verify is green)

Stage only M3 files. One commit on `feature/009-m3-pr-ci-completion`:

```sh
git add \
  tools/governance/specs/workflow/ \
  tools/governance/specs/workflow_run.script.ts \
  assets/catalog/workflows/default.yaml \
  tools/__tests__/fixtures/workflow/ \
  assets/guides/CI_GUIDE.md \
  assets/specs/009-agentic-workflow-orchestrator/

git commit -m "$(cat <<'EOF'
feat(workflow): Add R2R remediation

Provider bindings, PR-prep stage, CI gate, and R2R remediation
via profile command strings only (AWO-6).

EOF
)"
```

Verify commit succeeded: `git log -1 --oneline`.

---

## Post-commit (mandatory after commit)

```sh
git push -u origin HEAD

gh pr create \
  --title "feat(workflow): Add R2R remediation" \
  --body "$(cat <<'EOF'
## Summary
- Add profile `providers` bindings and PR-prep stage to default workflow
- Add providers runner + CI gate policy with R2R remediation loop
- Document orchestrator PR/CI bindings in CI_GUIDE.md

## Test plan
- [x] `bun test --config /dev/null tools/governance/specs/workflow/`
- [x] `bun test --config /dev/null ./tools/governance/specs/workflow/ci_gate.script.spec.ts`
- [x] `bun test --config /dev/null ./tools/governance/specs/workflow/providers_runner.script.spec.ts`
- [x] `bun run lint:ast-grep`
- [x] `mise run spec gate assets/specs/009-agentic-workflow-orchestrator`
- [x] `/app-review-handoff` on handoff.md

EOF
)"
```

If `gh pr create` fails because a PR already exists: `gh pr view --web`.

---

## Roadmap (not in scope — promote to handoff.md after M3 merges)

| Slice      | Phase | Requirements                                        | PR  |
| ---------- | ----- | --------------------------------------------------- | --- |
| **M4**     | 7     | AWO-8, AWO-11 — retrospective + sandbox enforcement | 5+  |
| **Polish** | 8     | AWO-12.3 guide crossref; NFR baselines + harness    | —   |
