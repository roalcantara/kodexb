<!-- markdownlint-disable-file -->

# Tasks: Mise SDD CLI (`011`)

**Input**: [`plan.md`](./plan.md), [`spec.md`](./spec.md) (MSC-1…MSC-10)
**Prerequisite**: **010 merged** on `main`.

**Delivery**: **one PR** — `feature/011-mise-sdd-cli`.
**Closeout**: orchestrator dogfood on this feature dir (MSC-9).

---

## Phase 0: Baseline

- [X] MSC-BASE-01 Branch `feature/011-mise-sdd-cli`; set `.specify/feature.json` → `assets/specs/011-mise-sdd-cli`.
- [X] MSC-BASE-02 `mise run spec lint` + `mise run spec gate` on 011 spec (pre-implementation).

---

## Phase 1: Task runner + render mode (MSC-1)

- [X] MSC-RUNNER-01 Implement `tools/support/lib/cli/task_runner.script.ts` (`runSteps`, `TaskRunReport`, gum spin).
- [X] MSC-RUNNER-02 Extend `render_mode.script.ts` for TTY auto-pretty / `--raw` forced raw.
- [X] MSC-RUNNER-03 Co-located `task_runner.script.spec.ts` (TTY mocked, raw line format).
- [X] MSC-RUNNER-04 Wire `spec gate` as first consumer (lint → trace → gate.sh steps).

**Checkpoint**: `mise run spec gate assets/specs/011-mise-sdd-cli` exit 0 (TTY and `CI=true` raw).

---

## Phase 2: `spec` command tree (MSC-2, MSC-4…MSC-6)

- [X] MSC-SPEC-01 Rewrite `mise.toml` `spec` usage to the normative tree using **native nested `cmd` blocks**; `--raw`/`--feat`/`--json` as `global` flags declared once at task root; `choices` enums on `test [scope]`, `runs <action>`, `review-handoff <action>`, `handoff generate --focus`/`--worker`; retain `default=` on `--focus`/`--worker`/`--base`/`lint --root` (plan § Usage spec structure + Advanced usage features matrix). No per-subcommand redeclaration of global flags; `run` stays the one-line `bun tools/bin/spec.script.ts`.
- [X] MSC-SPEC-02 Expand `tools/bin/spec.script.ts` dispatch to route on the **positional subcommand chain from `process.argv`** (keep the existing `usage_cmd ?? args.shift()` pattern; nested cmds may not flatten into one `usage_cmd`), reading flags incl. `global` via `usage_*`: init; `audit docs rogue-refs` / `audit feature` / `audit security`; `workflow run|resume|runs|bench`; `workflow handoff generate|scrub`; `worktree add`; `library manifest`; `opencode check`. No inline bash dispatch in `mise.toml`. Co-located `spec.script.spec.ts` asserts each nested route.
- [X] MSC-SPEC-03 Remove top-level `audit` task; merge `tools/bin/audit.script.ts` into spec audit paths.
- [X] MSC-SPEC-04 `spec init` replaces `feature-init`; update `feature_init.script.ts` entry if needed.
- [X] MSC-SPEC-05 `spec workflow run` replaces `orchestrated-handoff` name in dispatch + profiles.
- [X] MSC-SPEC-06 `spec audit docs|feature|security` modules + co-located specs.
- [X] MSC-SPEC-07 Wire `spec ready` through `task_runner`.

**Checkpoint**: `mise run spec --help` documents new tree; no `unknown action` for documented subcmds.

---

## Phase 3: `spec test` facade (MSC-3)

- [ ] MSC-TEST-01 Implement `tools/governance/specs/spec_test.script.ts`.
- [ ] MSC-TEST-02 Scope as a positional `[scope]` `choices` enum (`unit|e2e|smoke|regression`) in the `spec test` usage block + `--feat <dir>` flag. mise validates the enum (invalid value rejected pre-dispatch); **no script-side mutual-exclusion** — omitted `[scope]` runs the default composite.
- [ ] MSC-TEST-03 Default: active feature unit + e2e + governance specs for slug.
- [ ] MSC-TEST-04 Co-located `spec_test.script.spec.ts`.
- [ ] MSC-TEST-05 Update `.github/workflows/smoke.yml` if not fully orchestrator-driven from 010.
- [ ] MSC-TEST-06 Narrow `mise run test` usage to `ci` (+ document in `MISE_GUIDE.md`).

**Checkpoint**: `mise run spec test unit --feat assets/specs/011-mise-sdd-cli` exit 0.

---

## Phase 4: `app` + `policy` extraction (MSC-7)

- [ ] MSC-APP-01 Lift `app` inline bash → `tools/bin/app.script.ts` (`start`, `styles`, `gates`, `lifecycle`).
- [ ] MSC-POL-01 Lift `policy` inline bun → `tools/bin/policy.script.ts`.
- [ ] MSC-APP-02 `app gates` uses `task_runner` (quality, policy, all).
- [ ] MSC-CAT-01 `catalog validate` adopts `task_runner` when multi-step.

**Checkpoint**: `mise run app gates all` + `mise run policy check` exit 0.

---

## Phase 5: Profile + docs migration (MSC-4, MSC-10)

- [ ] MSC-DOCS-01 Update [`default.yaml`](../../catalog/workflows/default.yaml) to post-011 command names.
- [ ] MSC-DOCS-02 Update [`MISE_GUIDE.md`](../../guides/MISE_GUIDE.md) — SDD hub, output contract, migration table.
- [ ] MSC-DOCS-03 Update [`SDD_WORKFLOW_GUIDE.md`](../../guides/SDD_WORKFLOW_GUIDE.md), [`CI_GUIDE.md`](../../guides/CI_GUIDE.md), [`TOOLS_GUIDE.md`](../../guides/TOOLS_GUIDE.md).
- [ ] MSC-DOCS-04 Ripgrep migration pass: guides, specs, `.github`, `.agents`, `CLAUDE.md`, `AGENTS.md`.
- [ ] MSC-DOCS-05 Update the `EXPECTED_PUBLIC_TASKS` (and `EXPECTED_PACKAGE_SCRIPTS` if touched) allowlist in the `policy` check — currently inline in `mise.toml` (`checkPublicTaskSurface`), moved to `tools/bin/policy.script.ts` by MSC-POL-01 — to the post-011 public-task surface (drop `audit`; keep `spec`, `app`, `catalog`, `policy`, `test`, and other current publics). Derive the exact delta by running `mise run policy check` and matching the reported `public-task-surface` expected-vs-actual diff (no guessing).

---

## Phase 6: Orchestrator dogfood (MSC-8, MSC-9)

- [ ] MSC-DOGFOOD-01 During implement: partial `mise run spec workflow run` with run log archived (MSC-8).
- [ ] MSC-DOGFOOD-02 Complete full workflow run through terminal gate on `assets/specs/011-mise-sdd-cli`.
- [ ] MSC-DOGFOOD-03 Record run id + stage timeline in PR / [`handoff.md`](./handoff.md).

**Checkpoint**: orchestrator run `DONE` at gate; human gates documented if used.

---

## Phase 7: Closeout (MSC-10)

- [ ] MSC-CLOSEOUT-01 `mise run spec lint assets/specs/011-mise-sdd-cli` + `mise run spec gate` + `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
- [ ] MSC-CLOSEOUT-02 PR description lists MSC-1…MSC-9 with dogfood run id.

**Checkpoint**: [`handoff.md`](./handoff.md) verify block.

---

## Explicitly NOT in 011

| Item              | Owner   |
| ----------------- | ------- |
| `packages/*`      | **010** |
| 009 engine hotfix | **009** |

---

## Dependencies

```text
Phase 0
Phase 1 (task_runner) → 2 → 3
                     ↘ 4 (parallel with 2–3 after Phase 1)
Phase 5 (after 2–4 command names stable)
Phase 6 (after 5 — profile uses new commands)
Phase 7 last
```

**Recommended:** use `mise run spec workflow run` during Phase 2–6 to progress implement stage (MSC-8) rather than only manual commits.
