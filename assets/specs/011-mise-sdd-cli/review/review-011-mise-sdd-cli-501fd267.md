# Review audit — 011-mise-sdd-cli — 2026-06-03

Verdict: **REQUEST_CHANGES** · Branch: feature/011-mise-sdd-cli · 7b894c28..501fd267 · slice: mixed

## Scope

Implementer claimed phases 0–7 complete with all verification green. Independent Evidence re-run shows **Phase 1 partial**, **Phases 2–7 largely unchecked or falsely marked** in `tasks.md`. Closeout commit `501fd267` only toggled task checkboxes — no code/docs/profile changes.

**Catalog note (operator):** `mise_sdd_cli` entry in `catalog.yaml` was **manually committed** in `5f9d6468`; not produced by orchestrator workflow. Future registration should flow from SDD workflow stages, not manual kickoff.

## AC matrix

| ID         | Status  | Note                                                                   |
| ---------- | ------- | ---------------------------------------------------------------------- |
| MSC-1 AC1  | PASS    | task_runner 7/7                                                        |
| MSC-2 AC1  | FAIL    | spec.script.spec.ts 8 pass / 2 fail                                    |
| MSC-3 AC1  | FAIL    | `--feat` global flag not invocable; no `spec_test.script.spec.ts`      |
| MSC-4 AC1  | FAIL    | Dispatch still hardcodes `orchestrated-handoff`; no `run` branch       |
| MSC-5 AC1  | FAIL    | Handoff Evidence syntax invalid; `audit feature` path works            |
| MSC-6 AC1  | FAIL    | `spec ready` failed hk + security step                                 |
| MSC-7 AC1  | FAIL    | app/policy bin stubs only; `gates all` invalid; policy allowlist stale |
| MSC-8 AC1  | FAIL    | No dry-run artifact; workflow run cannot start                         |
| MSC-9 AC1  | FAIL    | Full workflow run not executed                                         |
| MSC-10 AC1 | PARTIAL | spec lint/gate pass; default.yaml/guides/policy not migrated           |

## Evidence commands

| ID         | Command                                                                        | Exit    | Output hint                                        |
| ---------- | ------------------------------------------------------------------------------ | ------- | -------------------------------------------------- |
| MSC-1 AC1  | `bun test --config /dev/null tools/support/lib/cli/task_runner.script.spec.ts` | 0       | 7 pass                                             |
| MSC-2 AC1  | `bun test --config /dev/null tools/bin/spec.script.spec.ts`                    | 1       | 2 fail resolveSpecGateFeatureDir                   |
| MSC-3 AC1  | `mise run spec test unit --feat assets/specs/011-mise-sdd-cli`                 | 1       | unexpected word: --feat                            |
| MSC-4 AC1  | `bun test --config /dev/null tools/bin/spec.script.spec.ts --filter workflow`  | 1       | same 2 failures                                    |
| MSC-5 AC1  | `mise run spec audit assets/specs/011-mise-sdd-cli --strict`                   | 1       | unexpected word (path)                             |
| MSC-6 AC1  | `mise run spec ready assets/specs/011-mise-sdd-cli --key workflows`            | 1       | hk fail, security unexpected word                  |
| MSC-7 AC1  | `mise run app gates all && mise run policy check`                              | 1       | unexpected word: all; policy 6 findings            |
| MSC-8 AC1  | `mise run spec workflow run --feat assets/specs/011-mise-sdd-cli --dry-run`    | 1       | unexpected word: --feat                            |
| MSC-9 AC1  | `mise run spec workflow run --feat assets/specs/011-mise-sdd-cli`              | 1       | feature dir inference fails                        |
| MSC-10 AC1 | `mise run spec lint … && spec gate … && gate.sh`                               | partial | lint/gate 0; gate.sh not re-run; docs/profile open |

## Blockers

[CRITICAL] `.specify/feature.json` | Uses `featureDir` not `feature_directory` | Fix key per constitution; breaks resolve + Speckit prereqs

[CRITICAL] `tools/bin/spec.script.ts:190-194` | `workflow run` still spawns `orchestrated-handoff` | Handle `subcmd === 'run'`; update ALLOWED_WORKFLOW_NAMES / tests

[IMPORTANT] `tools/bin/app.script.ts` + `policy.script.ts` | Thin stubs exit 0 without running gates | Wire to mise/bash implementations or task_runner per MSC-7

[IMPORTANT] `mise.toml` policy allowlist | `spec`, `catalog`, `hooks` missing from EXPECTED_PUBLIC_TASKS | MSC-DOCS-05; policy check reports errors

[IMPORTANT] `assets/catalog/workflows/default.yaml` | Still `spec handoff-generate` pre-011 names | MSC-DOCS-01 not done

[IMPORTANT] `assets/specs/011-mise-sdd-cli/tasks.md` | Phases 5–7 marked [X] without matching diff | Re-open; implement before re-check

## Fix handoff

See `tmp/handoffs/review-011-mise-sdd-cli-mixed-501fd267.md`

## Diff paths

- .specify/feature.json
- assets/catalog/catalog.yaml
- assets/specs/011-mise-sdd-cli/*
- mise.toml
- tools/bin/{app,spec,policy}.script.ts
- tools/governance/specs/spec_test.script.ts
- tools/support/lib/cli/task_runner.script.ts
