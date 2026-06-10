# Review audit — 011-mise-sdd-cli — f18c5638

**Verdict:** REQUEST_CHANGES · **Branch:** `feature/011-mise-sdd-cli` · **Range:** `7b894c28..f18c5638` · **slice:** mixed · **HEAD:** `f18c5638`

## Scope

Review of fix pass after `b1221747` fix handoff. Implementer claims P0-1/2/3/6 partial fixes at `f18c5638`. Operator CLI conventions **00–07** (including new `app gates` default-all) are **mandatory** for next pass — not yet implemented.

## AC matrix

| ID         | Status  | Note                                                                                                     |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------- |
| MSC-1 AC1  | PASS    | 7/7 task_runner tests; raw STEP/TASK lines only — no gum spin / pretty TTY tests                         |
| MSC-2 AC1  | PARTIAL | 10/10 spec.script tests; mise tree still redeclares `--feature` per subcmd; no `--raw`/`--json` coverage |
| MSC-3 AC1  | FAIL    | handoff `--feat` → mise exit 1; `--feature` works; no positional `[feature]`                             |
| MSC-4 AC1  | PASS    | spec.script.spec.ts exit 0 (filter runs all 10 — minor)                                                  |
| MSC-5 AC1  | FAIL    | flat `spec audit <dir>` invalid; `spec audit feature <dir>` works                                        |
| MSC-6 AC1  | PASS    | `spec ready … --key workflows` exit 0                                                                    |
| MSC-7 AC1  | PARTIAL | `app gates --all` exit 0; handoff `app gates all` exit 1; `policy check --strict` exit 1                 |
| MSC-8 AC1  | FAIL    | `--feat` exit 1; `--feature --dry-run` prints `speckit.implement` only — no stage plan / run artifact    |
| MSC-9 AC1  | SKIP    | full workflow run not executed; no run id in handoff                                                     |
| MSC-10 AC1 | PASS    | lint + gate + gate.sh chain exit 0                                                                       |

**Rollup:** 5P · 3F · 2~ · 1-

## Evidence commands

| ID              | Command                                                                        | Exit | Output hint                                  |
| --------------- | ------------------------------------------------------------------------------ | ---- | -------------------------------------------- |
| MSC-1 AC1       | `bun test --config /dev/null tools/support/lib/cli/task_runner.script.spec.ts` | 0    | 7 pass                                       |
| MSC-2 AC1       | `bun test --config /dev/null tools/bin/spec.script.spec.ts`                    | 0    | 10 pass                                      |
| MSC-3 AC1       | `mise run spec test unit --feat assets/specs/011-mise-sdd-cli`                 | 1    | `unexpected word: --feat`                    |
| MSC-3 AC1 (alt) | `mise run spec test unit --feature assets/specs/011-mise-sdd-cli`              | 0    | 99 pass / 14 files                           |
| MSC-4 AC1       | `bun test --config /dev/null tools/bin/spec.script.spec.ts --filter workflow`  | 0    | 10 pass                                      |
| MSC-5 AC1       | `mise run spec audit assets/specs/011-mise-sdd-cli --strict`                   | 1    | `unexpected word: assets/…`                  |
| MSC-5 AC1 (alt) | `mise run spec audit feature assets/specs/011-mise-sdd-cli --strict`           | 0    | OK                                           |
| MSC-6 AC1       | `mise run spec ready assets/specs/011-mise-sdd-cli --key workflows`            | 0    | TASK spec-ready ok                           |
| MSC-7 AC1       | `mise run app gates all && mise run policy check`                              | 1    | `unexpected word: all` on first cmd          |
| MSC-7 AC1 (alt) | `mise run app gates --all`                                                     | 0    | quality + policy                             |
| MSC-7 AC1 (alt) | `mise run policy check --strict`                                               | 1    | package-script-surface + public-task-surface |
| MSC-8 AC1       | `mise run spec workflow run --feat … --dry-run`                                | 1    | `--feat` unknown to mise                     |
| MSC-8 AC1 (alt) | `mise run spec workflow run --feature … --dry-run`                             | 0    | prints `speckit.implement` only              |
| MSC-9 AC1       | `mise run spec workflow run --feat …`                                          | —    | not run (would fail on `--feat`)             |
| MSC-10 AC1      | lint && gate && gate.sh                                                        | 0    | all green                                    |

## Review-fix P0 (b1221747) scorecard

| ID   | Status   | Note                                                                                        |
| ---- | -------- | ------------------------------------------------------------------------------------------- |
| P0-1 | PARTIAL  | unit scope = `tools/governance/specs/**` (99 tests); positional `[feature]` not wired       |
| P0-2 | PARTIAL  | `spec_test.script.spec.ts` exists (1 import-only test); MSC-TEST-04 still `[ ]` in tasks.md |
| P0-3 | DONE     | `usage_all` → quality + policy in mise bash                                                 |
| P0-4 | NOT DONE | handoff still blocked-on-010, `--feat`, flat audit, stale Verify                            |
| P0-5 | NOT DONE | `--feature` duplicated root + every subcmd; `--feat` in spec_test.script.ts                 |
| P0-6 | DONE     | `gate` reads `usage_feature_dir \|\| usage_feature`                                         |

## Operator CLI conventions (00–07) — NOT MET

| Rule                                                                      | Status                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------ |
| 00 global `--raw`/`--json` only; mutual exclusion; unit tests all subcmds | FAIL                                             |
| 01 `spec lint`: drop `--all`/`--feature`/`--root`; optional `[feature]`   | FAIL                                             |
| 02 `spec trace`: drop `--feature`; optional `[feature]`                   | FAIL                                             |
| 03 `spec gate`: drop `--feature`; optional `[feature]` infer              | PARTIAL (positional works; flag remains)         |
| 04 `spec ready`: drop `--feature`; optional `[feature]`                   | PARTIAL                                          |
| 05 `spec test`: drop `--feature`; optional `[feature]`                    | FAIL                                             |
| 06 `spec handoff`: drop `--feature` on generate/scrub                     | FAIL                                             |
| 07 `app gates`: drop `--all`; default = quality + policy when no flags    | FAIL (`--all` present; bare `app gates` exits 2) |

## Blockers

[IMPORTANT] `assets/specs/011-mise-sdd-cli/handoff.md` | Evidence table uses `--feat`, flat audit, `app gates all`; status blocked-on-010 | Sync AC + Verify to positional CLI (00–07) or implement aliases until migrated

[IMPORTANT] `mise.toml:1408-1523` | Root + per-subcmd `--feature`; lint `--all`/`--root`; app `gates --all` | Refactor usage per operator 00–07

[IMPORTANT] `tools/governance/specs/spec_test.script.ts` | Still parses `--feat`; usage string wrong | Positional `[feature]` + shared `resolveSpecFeatureDir`; drop `--feat`

[IMPORTANT] `mise.toml:863-877` | `app gates` with no flags → exit 2 | Default both gates; remove `--all` flag (07)

[IMPORTANT] phases 5–7 / MSC-8–9 | No dogfood run id; dry-run not a stage plan | Partial + full `workflow run`; archive under `tmp/workflow-runs/`

[IMPORTANT] `policy check --strict` | package-script allowlist drift (bdd:*, build:ci, …) | MSC-DOCS-05 / EXPECTED_PACKAGE_SCRIPTS update

## Fix handoff

See `tmp/handoffs/review-011-mise-sdd-cli-mixed-f18c5638.md`

## Diff paths (22)

.specify/feature.json, assets/catalog/*, assets/specs/011-mise-sdd-cli/*, hk.pkl, mise.toml, package.json, tools/bin/{app,policy,spec}.script.ts, tools/governance/specs/spec_test.*, tools/support/lib/cli/task_runner.*
