# CodeRabbit review — adopt / skip + implementation handoff

**Feature:** `011-mise-sdd-cli`
**Branch:** `feature/011-mise-sdd-cli` (PR #28)
**Context:** Post-merge polish pass on CodeRabbit findings. Shipped CLI follows **operator rules 00–07** (review `review-011-mise-sdd-cli-f18c5638.md`): positional `[feature]` only; **no** `--feat` / `--feature` on the mise tree; `app gates` with no flags = quality + policy; **no** `--all`.

---

## Executive summary

| Verdict                                     | Count |
| ------------------------------------------- | ----- |
| **Adopt** (fix before or right after merge) | 4     |
| **Adopt (docs only)**                       | 1     |
| **Skip** (intentional 011 behavior)         | 2     |
| **Defer (nitpick / optional)**              | 4     |

CodeRabbit partially read **stale** surfaces (`_app_raw` bash, pre-011 `plan.md`/`spec.md` `--feat` language). Do **not** reintroduce `--feat` or `app gates --all` without an explicit product decision — reconcile **documentation** to match shipped behavior instead.

---

## Finding-by-finding evaluation

### 1. `handoff.md` — `--feat` vs positional `[feature]` (line 48)

|                |                                                                                                                                                                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CodeRabbit** | Reconcile conflict: add `--feat` global or unify wording across handoff / plan / spec.                                                                                                                                                                                                                |
| **Verdict**    | **Adopt (docs only)**                                                                                                                                                                                                                                                                                 |
| **Rationale**  | **Shipped behavior is correct:** positional `[feature]` (optional; omitted → `resolveActiveFeatureDir()`). Operator rule 05 and `handoff.md` MSC-3 already say `(no --feat)`. **Drift** is in `spec.md`, `plan.md`, and `tasks.md` (MSC-SPEC-01 / MSC-TEST-02), which still describe global `--feat`. |
| **Action**     | Update normative docs to positional-only. Do **not** add `--feat` to `mise.toml` unless product reverses f18c5638.                                                                                                                                                                                    |

**Target wording (canonical):**

> Optional positional `[feature]` (feature dir or path to `spec.md`). When omitted, resolve via `resolveActiveFeatureDir()` (`.specify/feature.json`, then branch, then cwd). **No `--feat` / `--feature` flags on the mise `spec` tree** (internal spawn may still pass `--feature` to downstream scripts).

**Files:** `assets/specs/011-mise-sdd-cli/spec.md`, `plan.md`, `tasks.md` (historical MSC lines — add footnote “superseded by positional-only ship”), `assets/guides/WORKFLOW_SDD_GUIDE.md` if it mentions `--feat`.

---

### 2. `mise.toml` — `app gates` / `usage_all` / missing `--all` (~865–877)

|                    |                                                                                                                                                                                                                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CodeRabbit**     | Declare `--all`, wire `usage_all`, or default both gates when no flags.                                                                                                                                                                                                                                                                                    |
| **Verdict**        | **Skip (behavior already correct on canonical path)**                                                                                                                                                                                                                                                                                                      |
| **Rationale**      | `mise run app gates` routes to `tools/bin/app.script.ts` (`app` task `run = "bun tools/bin/app.script.ts"`). `selectGates()` + `gateSteps()` implement rule 07: no flags → quality **and** policy. **`--all` was explicitly removed.** CodeRabbit read **`_app_raw`** inline bash (`gates)` branch ~863–877), which is **not** used for `app gates` today. |
| **Optional chore** | Remove or comment the dead `gates)` case in `_app_raw` to avoid future confusion; do **not** re-add `--all`.                                                                                                                                                                                                                                               |

---

### 3. `mise.toml` — `spec workflow bench` undeclared in dispatcher (~1155–1256)

|                |                                                                                                                                                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CodeRabbit** | `cmd "bench" {}` exists; `spec.script.ts` does not route `bench`.                                                                                                                                                                                                                                                                                |
| **Verdict**    | **Adopt**                                                                                                                                                                                                                                                                                                                                        |
| **Rationale**  | Real gap. `tasks.md` MSC-SPEC-02 requires `workflow … bench` dispatch. `plan.md` maps legacy `spec workflow perf` → `spec workflow bench`. Today `bench` falls through to orchestrated-handoff default — **wrong**.                                                                                                                              |
| **Action**     | In `planWorkflow()` (`tools/bin/spec.script.ts`), add `if (sub === 'bench')` → spawn perf harness, e.g. `['bun', 'tools/metrics/harnesses/perf/perf.script.ts', 'workflow-observability']` (confirm against `plan.md` § migration table and `WORKFLOW_SDD_GUIDE.md` “workflow bench”). Add `spec.script.spec.ts` case for `workflow bench` argv. |

---

### 4. `spec.script.ts` — `spawnExitCode` null exitCode (~57–59)

|                |                                                                 |
| -------------- | --------------------------------------------------------------- |
| **CodeRabbit** | Coalesce missing `exitCode` to `1`.                             |
| **Verdict**    | **Adopt**                                                       |
| **Rationale**  | Defensive; aligns with `spec_test.script.ts` pattern. Low risk. |
| **Action**     | `return Bun.spawnSync(...).exitCode ?? 1` in `spawnExitCode`.   |

---

### 5. `spec.script.ts` — `runGateOrReady` step callbacks (~254–310)

|                |                                                                          |
| -------------- | ------------------------------------------------------------------------ |
| **CodeRabbit** | Use `?? 1` on all `Bun.spawnSync(...).exitCode` in tag/catalog/hk steps. |
| **Verdict**    | **Adopt**                                                                |
| **Action**     | Same null-coalesce in every `run:` callback inside `runGateOrReady`.     |

---

### 6. `spec_test.script.ts` — hardcoded smoke fixture path (~74–76)

|                |                                                                                                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CodeRabbit** | Replace literal path with variable / fixture resolver / CLI arg.                                                                                                                                                                   |
| **Verdict**    | **Adopt (hygiene, not semantics change)**                                                                                                                                                                                          |
| **Rationale**  | Smoke scope **must** always use `tools/__tests__/fixtures/workflow/smoke-feature` (deterministic; no live `assets/specs/*`). Do **not** accept arbitrary feature dirs for smoke.                                                   |
| **Action**     | Top-of-file constant, e.g. `const SMOKE_FIXTURE = 'tools/__tests__/fixtures/workflow/smoke-feature'` + one-line comment. Use in spawn argv. Optional: shared helper under `tools/governance/specs/` if other scopes need it later. |

---

### Nitpicks

#### 7. `app.script.ts` — `bash -lc` for policy gate (~31–37)

| **Verdict** | **Defer** |
| **Rationale** | Policy step sets `GATE_EMBEDDED_POLICY=1` inline; login shell likely unnecessary. |
| **Action (if touched)** | Prefer `['bash', '-c', 'GATE_EMBEDDED_POLICY=1 bash .agents/skills/app-quality-gate/scripts/gate_policy.sh']` to match quality step; or add comment if `-l` is required. |

#### 8. `policy.script.ts` — dynamic RegExp (~259–272)

| **Verdict** | **Defer** |
| **Action** | Replace with regex literal `/\bprocess\.env\.usage_action\b|\$\{usage_action\b/` if Biome/ast-grep nags on next edit. |

#### 9. `spec_test.script.ts` — `bun test --config /dev/null` (~43–44)

| **Verdict** | **Defer (document)** |
| **Rationale** | Intentional isolation for governance unit scope (repo `bunfig.toml` must not alter SPECS harness). |
| **Action** | One-line comment above `unitExit` spawn explaining why. |

#### 10. `sdd_guide_content.script.spec.ts` — duplicate `feat` join (~45–60)

| **Verdict** | **Defer** |
| **Action** | Extract `const FEATURE_PATH = ['assets','specs','NNN-slug'].join('/')` at describe level when editing file. |

---

## Implementation handoff (agent prompt)

Copy the block below to a fresh agent session on branch `feature/011-mise-sdd-cli`.

```markdown
## Goal

Close CodeRabbit follow-ups for 011-mise-sdd-cli per
`assets/specs/011-mise-sdd-cli/review/review-011-coderabbit-handoff.md`.
Do NOT reintroduce `--feat` or `app gates --all`.

## Required changes

1. **Docs (positional `[feature]` only)**
   - Update `assets/specs/011-mise-sdd-cli/spec.md`, `plan.md`: replace global `--feat`
     with positional `[feature]` + `resolveActiveFeatureDir()`; note internal `--feature`
     on downstream spawn is OK.
   - Ensure examples use `mise run spec test unit assets/specs/011-mise-sdd-cli`, not `--feat`.

2. **`spec workflow bench` dispatch**
   - `tools/bin/spec.script.ts`: handle `sub === 'bench'` before default orchestrated-handoff.
   - Route to `tools/metrics/harnesses/perf/perf.script.ts` with the workflow-observability
     subcommand (read `mise.toml` `perf` task + `plan.md` migration row).
   - Add test in `tools/bin/spec.script.spec.ts`.

3. **Null-safe exit codes**
   - `spawnExitCode`: `exitCode ?? 1`
   - `runGateOrReady`: all step `run` callbacks return `Bun.spawnSync(...).exitCode ?? 1`

4. **Smoke fixture constant**
   - `tools/governance/specs/spec_test.script.ts`: `SMOKE_FIXTURE` constant + comment
     (smoke always uses committed fixture, not user feature dir).

## Optional (only if trivial while in file)

- Remove/comment dead `_app_raw` `gates)` bash block in `mise.toml`.
- `app.script.ts`: `bash -c` instead of `bash -lc` for policy step.
- Comment on `--config /dev/null` in spec_test unit scope.

## Verification (all exit 0)

```sh
bun test --config /dev/null tools/bin/spec.script.spec.ts
bun test --config /dev/null tools/governance/specs/spec_test.script.spec.ts
mise run spec test unit assets/specs/011-mise-sdd-cli
mise run spec gate assets/specs/011-mise-sdd-cli
mise run app gates
mise run spec workflow bench   # after dispatch — expect perf harness, not orchestrator
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

## Constraints

- FCIS / operator rules 00–07 unchanged.
- No commit unless user asks.
- Run quality gate before any commit.
```

---

## Verification checklist (post-implementation)

- [ ] `grep -R '--feat' assets/specs/011-mise-sdd-cli/spec.md plan.md` — only historical/“removed” mentions
- [ ] `mise run spec workflow bench --help` parses; dispatch hits perf script (not orchestrator)
- [ ] `mise run app gates` runs quality + policy (no `--all` in usage)
- [ ] Unit tests green for `spec.script`, `spec_test`, `task_runner`
- [ ] Full `bash .agents/skills/app-quality-gate/scripts/gate.sh`

---

## References

- Operator rules: `assets/specs/011-mise-sdd-cli/review/review-011-mise-sdd-cli-f18c5638.md`
- Shipped dispatch: `tools/bin/spec.script.ts` (`featureFrom`, `planWorkflow`)
- Shipped gates: `tools/bin/app.script.ts` (`selectGates`, `gateSteps`)
- Active feature: `tools/governance/specs/resolve_active_feature_dir.script.ts`
