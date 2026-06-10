# Fix handoff — 011-mise-sdd-cli (mixed) — review b1221747

**Branch:** `feature/011-mise-sdd-cli`  
**Prior:** `tmp/handoffs/review-011-mise-sdd-cli-mixed-8001bf56.md`  
**Normative:** `assets/specs/011-mise-sdd-cli/{spec,plan,tasks,handoff}.md`

Load: **app-context** + **mise-tasks** + **app-testing**

Do not commit unless asked.

---

## Agent prompt

Complete 011 after re-review `b1221747`. **Phases 0–2 + MSC-6** are Evidence-green. **Do not merge** until handoff Evidence table passes verbatim and phases 5–7 close.

### Operator CLI conventions (mandatory)

1. **Positional first** — for `gate`, `ready`, `trace`, `audit feature`, `test`, `workflow run`: accept optional `[feature_dir]` positional. When positional is present, ignore redundant `--feature` / `--feat` flags.

2. **Inference** — when positional and flags omitted, resolve via `resolveActiveFeatureDir()` (`.specify/feature.json` → branch → cwd).

3. **One flag name** — standardize on **`--feature <dir>`** at spec task root only OR drop per-subcommand duplicates in `mise.toml`. Remove `--feat`, `--features`, mixed `usage_feature_dir` env names; map mise `usage_feature` in dispatch via shared helper `resolveSpecFeatureDir({ positional?, usage_feature? })`.

4. **Lint default** — `mise run spec lint` with no args lints all `assets/specs/NNN-*/spec.md` (today’s `--all` behavior). Keep `[target]` positional as single-feature shortcut.

5. **Handoff Evidence sync** — update `handoff.md` AC + Verify blocks to match working invocations **or** implement backward-compatible aliases so old strings still parse.

6. **Unit tests required**
   - `spec_test.script.spec.ts` — scope matrix, feature inference, smoke invokes `workflow run`
   - `spec.script.spec.ts` — positional vs `--feature` precedence, each subcmd route
   - `task_runner.script.spec.ts` — **TTY pretty mode** (mock `chooseRenderer` → pretty); assert gum output shape per step (MSC-1); keep raw STEP/TASK tests

7. **gum spin** — if spec/plan requires per-step spin, implement in `runSteps` pretty path (currently summary-only gum). If deferring, update spec MSC-1 Measure/Evidence in same PR.

8. **Catalog** — no manual `catalog.yaml` edits; register via workflow dogfood stage.

---

## P0 — Evidence blockers (phase 3–4)

| ID   | Task                                                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-1 | Fix `mise run spec test unit --feature assets/specs/011-mise-sdd-cli` exit 0: unit scope runs `tools/governance/specs/**/*.spec.ts` + feature governance paths per `plan.md` § spec test (011 dir has no co-located `.spec.ts`) |
| P0-2 | Add `tools/governance/specs/spec_test.script.spec.ts` (MSC-TEST-04)                                                                                                                                                             |
| P0-3 | Wire `app gates --all` in `mise.toml` bash: `usage_all` → run quality + policy (or `gates all` positional). Update handoff MSC-7 Evidence to match                                                                              |
| P0-4 | Update `handoff.md`: `--feature` not `--feat`; `spec audit feature <dir>`; unblock status; remove step 0 wait-for-010                                                                                                           |
| P0-5 | Refactor `spec.script.ts` + `mise.toml`: shared feature resolver; remove duplicate per-subcmd `--feature` where positional exists; fix `trace` (drop `--features` alias)                                                        |
| P0-6 | `gate` dispatch: pass `usage_feature` into `resolveSpecGateFeatureDir` (not only `usage_feature_dir`)                                                                                                                           |

---

## P1 — phases 5–7

### Phase 5 (MSC-DOCS-*)

- [ ] Finish `default.yaml` evidence/triggers (post-011 names throughout)
- [ ] Guides: `MISE_GUIDE`, `SDD_WORKFLOW`, `CI_GUIDE`, `TOOLS_GUIDE`, `AGENTS.md`, `.github/**` — `spec audit security`, `workflow run`, no top-level `audit`
- [ ] `EXPECTED_PACKAGE_SCRIPTS` in policy — bdd:*, build:ci, styles:compile, etc.; `mise run policy check --strict` exit 0
- [ ] Move policy inline bun from `mise.toml` → `tools/bin/policy.script.ts` (no recursion)

### Phase 6 (MSC-8/9)

- [ ] Partial run with archived log under `tmp/workflow-runs/`
- [ ] Full run to terminal gate; record run id in `handoff.md`
- [ ] `workflow run --dry-run` must print stage plan + exit without side effects (not only `speckit.implement`)

### Phase 7 (MSC-10)

- [ ] Full Verify block in handoff.md exit 0
- [ ] Uncheck phase 3 checkpoint in tasks.md until MSC-3 Evidence passes

---

## Verify (re-review gate)

```sh
bun test --config /dev/null tools/support/lib/cli/task_runner.script.spec.ts
bun test --config /dev/null tools/bin/spec.script.spec.ts
bun test --config /dev/null tools/governance/specs/spec_test.script.spec.ts
mise run spec test unit --feature assets/specs/011-mise-sdd-cli
mise run spec audit feature assets/specs/011-mise-sdd-cli --strict
mise run spec ready assets/specs/011-mise-sdd-cli --key workflows
mise run app gates --all
mise run policy check --strict
mise run spec workflow run --feature assets/specs/011-mise-sdd-cli --dry-run
mise run spec workflow run --feature assets/specs/011-mise-sdd-cli
mise run spec lint assets/specs/011-mise-sdd-cli
mise run spec gate assets/specs/011-mise-sdd-cli
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

---

## Out of scope

- 010 package work
- Fixing unrelated knip ls-lint flake in parallel CI (note if spec ready flakes)
