# Review audit — 011-mise-sdd-cli — 2026-06-03 (re-review)

Verdict: **REQUEST_CHANGES** · Branch: feature/011-mise-sdd-cli · 7b894c28..8001bf56 · slice: mixed

## Scope

Re-review after fix commit `8001bf56`. **P0 items partially landed** (feature.json key, spec.script tests, default.yaml handoff trigger, public-task allowlist). Implementer claim "all green / phases 0–4 complete" is **not supported** by handoff Evidence commands. Phases 5–7 correctly reopened in `tasks.md`; phases 3–4 still marked `[X]` despite failing checkpoints.

**Operator conventions (this pass):** global `--feat` must work for all spec subcommands; normalize feature path args; lint defaults without `--all`; consistent flag handling in `mise.toml` + dispatch.

## AC matrix

| ID         | Status  | Note                                                                                               |
| ---------- | ------- | -------------------------------------------------------------------------------------------------- |
| MSC-1 AC1  | PASS    | task_runner 7/7                                                                                    |
| MSC-2 AC1  | PASS    | spec.script.spec.ts 10/10                                                                          |
| MSC-3 AC1  | FAIL    | `--feat` not invocable from mise; unit scope finds no tests in 011 dir                             |
| MSC-4 AC1  | PARTIAL | `run` subcmd routes; still spawns `orchestrated-handoff` internally; smoke scope stale             |
| MSC-5 AC1  | FAIL    | Evidence syntax invalid (`audit feature` required)                                                 |
| MSC-6 AC1  | FAIL    | `spec ready` fails hk (`spec security` hook)                                                       |
| MSC-7 AC1  | FAIL    | `app gates all` invalid; policy package-script allowlist stale; bin scripts not wired in mise.toml |
| MSC-8 AC1  | FAIL    | `--dry-run` / `--feat` not invocable                                                               |
| MSC-9 AC1  | FAIL    | Full orchestrator run not executed; no run id in handoff                                           |
| MSC-10 AC1 | PARTIAL | spec lint/gate pass; docs migration + gate.sh + policy strict open                                 |

## Evidence commands

| ID         | Command                                         | Exit    | Output hint                                 |
| ---------- | ----------------------------------------------- | ------- | ------------------------------------------- |
| MSC-1 AC1  | task_runner.spec.ts                             | 0       | 7 pass                                      |
| MSC-2 AC1  | spec.script.spec.ts                             | 0       | 10 pass                                     |
| MSC-3 AC1  | `mise run spec test unit --feat …`              | 1       | unexpected word: --feat                     |
| MSC-4 AC1  | spec.script.spec.ts --filter workflow           | 0       | 10 pass                                     |
| MSC-5 AC1  | `mise run spec audit assets/… --strict`         | 1       | unexpected word (path)                      |
| MSC-6 AC1  | `mise run spec ready … --key workflows`         | 1       | hk spec-security-changed fails              |
| MSC-7 AC1  | `mise run app gates all && policy check`        | 1       | unexpected word: all; package-script errors |
| MSC-8 AC1  | `mise run spec workflow run --feat … --dry-run` | 1       | unexpected word: --feat                     |
| MSC-9 AC1  | `mise run spec workflow run --feat …`           | 1       | same                                        |
| MSC-10 AC1 | lint + gate + gate.sh                           | partial | lint/gate 0; gate.sh not run this pass      |

## Blockers

[CRITICAL] `mise.toml` spec global `--feat` | Mise rejects `--feat` after subcommand and before subcommand | Fix usage/global wiring so Evidence invocations parse; read `usage_feat` in all dispatch paths

[CRITICAL] `hk.pkl:63-64` | Hook still `mise run spec security` | Migrate to `mise run spec audit security --changed-only --strict`

[IMPORTANT] `mise.toml` spec args | Mixed `--feature`, `--features`, `[feature_dir]`, `<feature_dir>` | Normalize per operator: global `--feat` + optional positional fallback via shared resolver

[IMPORTANT] `tools/governance/specs/spec_test.script.ts:73` | smoke still `orchestrated-handoff` | Use `workflow run`; add `spec_test.script.spec.ts`

[IMPORTANT] `mise.toml` app task | `app.script.ts` not task `run`; gates use flags not `all` | Wire extraction or add `gates all` subcmd; fix policy recursion stub

[IMPORTANT] `mise.toml` policy | `EXPECTED_PACKAGE_SCRIPTS` stale (bdd:*, build:ci, etc.) | MSC-DOCS-05; run `policy check --strict`

[IMPORTANT] Phases 5–7 | Open in tasks.md | Docs migration, dogfood MSC-8/9, closeout MSC-10

## Fix handoff

See `tmp/handoffs/review-011-mise-sdd-cli-mixed-8001bf56.md`

## Diff paths (cumulative vs main)

.specify/feature.json, assets/catalog/**, mise.toml, tools/bin/*, tools/governance/specs/spec_test.script.ts, tools/support/lib/cli/task_runner.*
