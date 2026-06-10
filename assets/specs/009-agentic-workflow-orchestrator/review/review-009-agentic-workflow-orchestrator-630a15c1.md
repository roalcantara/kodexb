# Review audit — 009-agentic-workflow-orchestrator — 2026-06-10

Verdict: **REQUEST_CHANGES** · Branch: `009-agentic-workflow-orchestrator` · `a9e5d68..630a15c1` + **~24 uncommitted MVP files** · slice: governance-tools (MVP substrate)

## Scope

Operator reported `mise run app gates --quality` PASS and `mise run spec ready` PASS. Re-derived from handoff AC Evidence + working tree (not implementer chat). **HEAD commit is docs-only**; MVP implementation lives in unstaged/untracked paths under `tools/governance/specs/workflow/`, `assets/catalog/workflows/default.yaml`, `assets/guides/WORKFLOW_GUIDE.md`.

## AC matrix

| ID         | Status  | Note                                                                                                                                                                                              |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWO-2 AC1  | PASS    | `envelope.schema.spec.ts` — neutral kinds, required fields                                                                                                                                        |
| AWO-2 AC2  | PARTIAL | Handoff Evidence targets `command_invoker`; envelope BLOCKED path is `envelope_capture.script.spec.ts` (absent/malformed, not `BLOCKED`+`diagnostic.code`)                                        |
| AWO-2 AC3  | PARTIAL | Handoff path `evidence.spec.ts` **missing**; `evidence.script.spec.ts` passes unit tests only — no `evidence_pending` transition (spec defers AC3–4 to M1)                                        |
| AWO-9 AC1  | PARTIAL | `lint:ast-grep` PASS; `no-spawn-outside-adapter` ignores `**/*.script.ts` — does not confine spawn to adapter; legacy `Bun.spawnSync` remains in `orchestrated_handoff` / `handoff_generate`      |
| AWO-9 AC2  | PARTIAL | Handoff path `execution_policy.spec.ts` **missing**; `execution_policy.script.spec.ts` PASS                                                                                                       |
| AWO-9 AC3  | FAIL    | No `COMMAND_TARGET_MISSING` diagnostic in codebase; `command_invoker` rejects missing binary via `rejected` flag only                                                                             |
| AWO-9 AC4  | FAIL    | Handoff Evidence runs `command_invoker.script.spec.ts` — telemetry lives in `workflow_invoker.script.spec.ts` (that spec PASS)                                                                    |
| AWO-10 AC1 | PASS    | `profile_loader.script.spec.ts`                                                                                                                                                                   |
| AWO-4 AC1  | PARTIAL | Handoff path `persistence.spec.ts` **missing**; `persistence.script.spec.ts` PASS                                                                                                                 |
| AWO-12 AC1 | PASS    | `conformance.script.spec.ts` — `default.yaml` subsequence matches `detectPhase()`                                                                                                                 |
| AWO-12 AC2 | FAIL    | `workflow_run.script.spec.ts` — switch missing fixtures for 8 new union members (`stage.retried`, `stage.escalated`, `transition.gated`, `decision.*`, `sandbox.violation`, `shutdown.completed`) |
| AWO-11 AC1 | PASS    | `profile.schema.spec.ts` — optional `sandbox`                                                                                                                                                     |

## Evidence commands

| ID         | Command                                                | Exit | Output hint                                      |
| ---------- | ------------------------------------------------------ | ---- | ------------------------------------------------ |
| AWO-2 AC1  | `bun test …/schemas/envelope.schema.spec.ts`           | 0    | pass                                             |
| AWO-2 AC2  | `bun test …/command_invoker.script.spec.ts`            | 0    | pass (wrong module for AC)                       |
| AWO-2 AC3  | `bun test …/evidence.spec.ts`                          | —    | **file missing** (`evidence.script.spec.ts` → 0) |
| AWO-9 AC1  | `bun run lint:ast-grep && bun test …/command_invoker…` | 0    | pass (rule gap)                                  |
| AWO-9 AC2  | `bun test …/execution_policy.spec.ts`                  | —    | **file missing** (`.script.spec.ts` → 0)         |
| AWO-9 AC3  | `bun test …/command_invoker.script.spec.ts`            | 0    | no COMMAND_TARGET_MISSING                        |
| AWO-9 AC4  | `bun test …/command_invoker.script.spec.ts`            | 0    | no task.* assertions here                        |
| AWO-10 AC1 | `bun test …/profile_loader.script.spec.ts`             | 0    | pass                                             |
| AWO-4 AC1  | `bun test …/persistence.spec.ts`                       | —    | **file missing** (`.script.spec.ts` → 0)         |
| AWO-12 AC1 | `bun test …/conformance.script.spec.ts`                | 0    | pass                                             |
| AWO-12 AC2 | `bun test …/workflow_run.script.spec.ts`               | 1    | `every variant label has a fixture`              |
| AWO-11 AC1 | `bun test …/schemas/profile.schema.spec.ts`            | 0    | pass                                             |

### Before done (handoff §Verify)

| Command                                                             | Exit | Note                                                                |
| ------------------------------------------------------------------- | ---- | ------------------------------------------------------------------- |
| `bun test --config /dev/null tools/governance/specs/workflow/`      | 1    | 174 pass, **5 fail** (1 workflow_run + 4 handoff_generate dispatch) |
| `mise run spec lint assets/specs/009-agentic-workflow-orchestrator` | 0    | pass                                                                |
| `mise run spec gate assets/specs/009-agentic-workflow-orchestrator` | 0    | pass (does not run governance workflow suite)                       |
| `mise run catalog validate`                                         | 0    | pass                                                                |

## Blockers

[IMPORTANT] handoff.md:42-53 | Evidence paths omit `.script` suffix (`evidence.spec.ts`, `execution_policy.spec.ts`, `persistence.spec.ts`) — operator AC table fails verbatim | Fix paths to `*.script.spec.ts`

[IMPORTANT] workflow_run.script.spec.ts:227-273 | `WORKFLOW_EVENT_TYPES` grew by 8 labels; switch/fixtures incomplete | Add makers + cases for all union members (AWO-12 AC2)

[IMPORTANT] handoff.md:AWO-9 AC3/AC4 | Evidence points at `command_invoker` but AC needs `envelope_capture`/`workflow_invoker` + `COMMAND_TARGET_MISSING` | Reconcile Evidence column with spec AWO-9.3/9.4

[IMPORTANT] git tree | MVP substrate uncommitted (~24 files) | Stage + commit MVP slice before merge

[CRITICAL] handoff.md:82-85 | Section still says "Next (before implement)" while tasks.md marks MVP [X] | Update handoff lifecycle header; run audit/analyze or drop stale block

## Fix handoff

```text
Fix handoff — 009-agentic-workflow-orchestrator (governance-tools) — review 630a15c1

Load: app-context + app-testing + mise-tasks

P0: workflow_run.script.spec.ts | add fixtures for stage.retried, stage.escalated, transition.gated, decision.*, sandbox.violation, shutdown.completed | extend switch in "every variant label has a fixture"
Verify: bun test --config /dev/null tools/governance/specs/workflow/workflow_run.script.spec.ts

P0: handoff.md AC table | fix Evidence paths to *.script.spec.ts; route AWO-2 AC2 → envelope_capture.script.spec.ts; AWO-9 AC4 → workflow_invoker.script.spec.ts
Verify: mise run spec review-handoff extract-evidence --feature assets/specs/009-agentic-workflow-orchestrator --json

P1: envelope_capture + command path | surface BLOCKED + diagnostic.code COMMAND_TARGET_MISSING per spec AWO-9.3 | wire test in envelope_capture or invoker layer
Verify: bun test --config /dev/null tools/governance/specs/workflow/envelope_capture.script.spec.ts

P1: no-spawn-outside-adapter.rule.yml | rule ignores **/*.script.ts — ineffective for workflow tree | narrow ignore to command_invoker only OR ban child_process outside adapter
Verify: bun run lint:ast-grep

P1: handoff_generate.script.spec.ts | 4 dispatch tests fail (missing tmp/handoffs) | fix test isolation or restore handoff file fixture

Out of scope: machine.ts (M1), PROFILE-SDD, SMOKE

Before done: bun test --config /dev/null tools/governance/specs/workflow/ ; mise run spec lint … ; mise run spec gate assets/specs/009-agentic-workflow-orchestrator

Do not commit unless asked.
```

## Diff paths (committed a9e5d68..630a15c1)

- CLAUDE.md, assets/guides/OBSERVABILITY_GUIDE.md, assets/specs/009-agentic-workflow-orchestrator/** (spec/plan/contracts/review)

## Diff paths (uncommitted MVP — review scope)

- tools/governance/specs/workflow/{command_invoker,envelope_capture,evidence,execution_policy,persistence,profile_loader,workflow_invoker,conformance,policy_plumbing}.script*
- tools/governance/specs/workflow/schemas/{envelope,profile,state}.schema*
- tools/governance/specs/workflow/workflow_run.script.ts (+ spec)
- assets/catalog/workflows/default.yaml, assets/guides/WORKFLOW_GUIDE.md
