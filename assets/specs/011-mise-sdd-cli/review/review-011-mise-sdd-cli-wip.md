# Review audit — 011-mise-sdd-cli — wip (post f18c5638)

**Verdict:** APPROVE_WITH_NOTES · **Branch:** `feature/011-mise-sdd-cli` · **Base:** `7b894c28` · **Reviewed:** uncommitted WIP atop `f18c5638` · **slice:** mixed

## Scope

Re-review of fix handoff `review-011-mise-sdd-cli-mixed-f18c5638.md` after multi-agent WIP (uncommitted). Operator rules **00–07** largely implemented. Phases 5–7 docs + MSC-8/9 dogfood remain open.

## AC matrix

| ID | Status | Note |
| --- | --- | --- |
| MSC-1 AC1 | PASS | 7+ task_runner tests; raw STEP/TASK; no gum spin TTY test |
| MSC-2 AC1 | PASS | mise tree: global `--raw`/`--json` only; positional `[feature]`; 20+ spec.script tests incl. mutual exclusion |
| MSC-3 AC1 | PASS | `mise run spec test unit assets/specs/011-mise-sdd-cli` exit 0; parseScopeFeature unit tests |
| MSC-4 AC1 | PASS | spec.script.spec.ts exit 0 |
| MSC-5 AC1 | PASS | `spec audit feature … --strict` exit 0 |
| MSC-6 AC1 | PASS | `spec ready … --key workflows` TASK ok (4 steps) |
| MSC-7 AC1 | PASS | `app gates` default dual; `--all` removed; `policy check --strict` exit 0 |
| MSC-8 AC1 | PARTIAL | `--dry-run` exit 0 prints `speckit.implement` (phase probe); no archived partial run under `tmp/workflow-runs/` |
| MSC-9 AC1 | FAIL | Full run prints next command only (not allowlisted); no run id in handoff |
| MSC-10 AC1 | PARTIAL | lint + gate + gate.sh green; guides migration (MSC-DOCS-01–04) still open |

**Rollup:** 7P · 1F · 2~ · 0-

## Fix-handoff P0 scorecard (f18c5638)

| ID | Status |
| --- | --- |
| P0-1 (rules 00–06) | DONE |
| P0-2 (rule 07 app gates) | DONE |
| P0-3 (spec_test.spec) | DONE |
| P0-4 (handoff sync) | PARTIAL — Evidence updated; status unblocked in follow-up pass |
| P0-5 (policy strict) | DONE |
| P0-6 (MSC-8/9 dogfood) | NOT DONE |

## Evidence commands (executed on WIP)

| ID | Command | Exit |
| --- | --- | --- |
| MSC-1 | task_runner.script.spec.ts | 0 |
| MSC-2 | spec.script.spec.ts (+ app.script.spec.ts) | 0 (66 total) |
| MSC-3 | `spec test unit assets/specs/011-mise-sdd-cli` | 0 |
| MSC-4 | spec.script.spec.ts --filter workflow | 0 |
| MSC-5 | `spec audit feature … --strict` | 0 |
| MSC-6 | `spec ready … --key workflows` | 0 |
| MSC-7 | `app gates && policy check --strict` | 0 |
| MSC-8 | `workflow run … --dry-run` | 0 (output: `speckit.implement`) |
| MSC-9 | `workflow run …` (no dry-run) | 0 (prints only; no terminal gate / run id) |
| MSC-10 | lint && gate && gate.sh | 0 |

## Blockers (merge)

[IMPORTANT] MSC-9 | No orchestrator dogfood run id / terminal gate | Execute allowlisted workflow stages or record manual closeout per MSC-DOGFOOD-02/03

[IMPORTANT] phases 5–7 | MSC-DOCS-01–04 guides/CI migration open | Ripgrep pass + guide updates before PR

## Minor / notes

- `review-handoff` spawn still passes `--feature` flag internally (dispatch only; mise usage uses positional).
- `workflow handoff generate` still uses `--feature` in argv to downstream script (internal).
- HEAD still `f18c5638`; WIP uncommitted — commit as atomic chunk before PR.
- Reverted machine-local `.vscode` `bun.runtime` path from WIP.

## Remaining follow-up (P1 — not blocking CLI P0)

1. MSC-DOGFOOD-01/02/03 — partial + full workflow run; archive under `tmp/workflow-runs/`; record run id in handoff
2. MSC-DOCS-01–04 — MISE_GUIDE, SDD_WORKFLOW, CI_GUIDE, TOOLS_GUIDE, ripgrep migration
3. MSC-TEST-05/06, MSC-CAT-01 — smoke.yml, test usage narrow, catalog task_runner
4. MSC-CLOSEOUT-01/02 — after dogfood + docs

## Diff paths (WIP)

mise.toml, tools/bin/{app,policy,spec}*, tools/governance/specs/spec_test*, task_runner*, handoff.md, tasks.md
