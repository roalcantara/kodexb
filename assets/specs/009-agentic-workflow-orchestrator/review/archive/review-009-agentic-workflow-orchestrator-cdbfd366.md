# Review audit — 009-agentic-workflow-orchestrator — M4 retro/sandbox

**Verdict:** REQUEST_CHANGES · **Branch:** `feature/009-m4-retro-sandbox` · **Range:** uncommitted WIP vs `cdbfd366` (no M4 commit) · **Slice:** governance-tools

## Scope

Operator-reported gates all exit 0. Implementation is **uncommitted** (10 modified + 9 untracked). Handoff steps 6–7 (commit, PR) and M4-CLOSEOUT checkboxes not done. Review is against handoff contract + wiring checklist, not implementer chat.

## AC matrix

| ID         | Status  | Note                                                                                                                                                        |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWO-8 AC1  | PASS    | `writeRunRetrospective` wired at end of `orchestrator.run()`; tagged tests in `retrospective.script.spec.ts` + `orchestrator.script.spec.ts`                |
| AWO-8 AC2  | PASS    | Ranked recommendations + event refs in `retrospective.script.spec.ts`                                                                                       |
| AWO-8 AC3  | PASS    | `appendInsights` via `writeRunRetrospective`; tagged AC3 in `agent_memory.script.spec.ts`                                                                   |
| AWO-8 AC4  | FAIL    | No orchestrator startup load; `mergeInsightsIntoStageMemory` never called in `orchestrator.script.ts`; no `AWO-8 AC4` test in `orchestrator.script.spec.ts` |
| AWO-11 AC1 | PARTIAL | Evidence specs pass; no `it('AWO-11 AC1: …')` in `profile.schema.spec.ts` or `sandbox.script.spec.ts` per handoff checklist                                 |
| AWO-11 AC2 | PARTIAL | Four dimensions covered under `AWO-11 AC2` describe blocks; `workflow_invoker` sets `diagnostic.code: COMMAND_PREFIX_REJECTED` not `SANDBOX_VIOLATION`      |
| AWO-11 AC3 | PASS    | `profile_loader.script.spec.ts` AWO-11 AC3                                                                                                                  |
| AWO-11 AC4 | PASS    | Orchestrator integration emits `sandbox.violation` NDJSON                                                                                                   |

## Evidence commands

| ID         | Command                                                                                        | Exit | Output hint            |
| ---------- | ---------------------------------------------------------------------------------------------- | ---- | ---------------------- |
| AWO-8 AC1  | `bun test --config /dev/null ./tools/governance/specs/workflow/retrospective.script.spec.ts`   | 0    | pass                   |
| AWO-8 AC1  | `bun test --config /dev/null ./tools/governance/specs/workflow/orchestrator.script.spec.ts`    | 0    | 9 pass                 |
| AWO-8 AC2  | `bun test --config /dev/null ./tools/governance/specs/workflow/retrospective.script.spec.ts`   | 0    | pass                   |
| AWO-8 AC3  | `bun test --config /dev/null ./tools/governance/specs/workflow/agent_memory.script.spec.ts`    | 0    | pass                   |
| AWO-8 AC4  | `bun test --config /dev/null ./tools/governance/specs/workflow/agent_memory.script.spec.ts`    | 0    | unit merge only        |
| AWO-8 AC4  | `bun test --config /dev/null ./tools/governance/specs/workflow/orchestrator.script.spec.ts`    | 0    | no AC4 row             |
| AWO-11 AC1 | `bun test --config /dev/null ./tools/governance/specs/workflow/schemas/profile.schema.spec.ts` | 0    | untagged sandbox tests |
| AWO-11 AC1 | `bun test --config /dev/null ./tools/governance/specs/workflow/sandbox.script.spec.ts`         | 0    | no AC1 tag             |
| AWO-11 AC2 | `bun test --config /dev/null ./tools/governance/specs/workflow/sandbox.script.spec.ts`         | 0    | pass                   |
| AWO-11 AC3 | `bun test --config /dev/null ./tools/governance/specs/workflow/profile_loader.script.spec.ts`  | 0    | pass                   |
| AWO-11 AC4 | `bun test --config /dev/null ./tools/governance/specs/workflow/orchestrator.script.spec.ts`    | 0    | pass                   |

Operator also reported PASS: full workflow suite (279), `spec.script.spec.ts`, ast-grep, spec lint/gate, `app gates --quality`, `spec ready`, `gate.sh`, e2e regression.

## Blockers

[IMPORTANT] `orchestrator.script.ts` | `loadOrchestratorInsights` never called; `mergeInsightsIntoStageMemory` not wired into stage memory | load catalog in constructor/`run()` and merge insights into stage memory before dispatch (use `ensureStageMemory` + merge)

[IMPORTANT] `orchestrator.script.spec.ts` | Handoff requires `AWO-8 AC4` orchestrator integration test | two-run test: append catalog in run 1, assert `agent_memory_insights` in stage memory on run 2

[IMPORTANT] `orchestrator_retro.script.ts`, `orchestrator_providers.script.ts` | No co-located `*.script.spec.ts` | add minimal specs per repo DoD / handoff wiring checklist

[IMPORTANT] `workflow_invoker.script.ts:30` | Sandbox block uses `diagnostic.code: COMMAND_PREFIX_REJECTED` | use `SANDBOX_VIOLATION` per AWO-11 AC2

## Fix handoff

```text
Fix handoff — 009-agentic-workflow-orchestrator (governance-tools) — review cdbfd366

Load: app-context + app-testing + mise-tasks

P0: orchestrator.script.ts | wire catalog load + mergeInsightsIntoStageMemory into stage memory path | call loadInsights at startup; merge before stage work
Verify: bun test --config /dev/null ./tools/governance/specs/workflow/orchestrator.script.spec.ts

P0: orchestrator.script.spec.ts | add it('AWO-8 AC4: …') two-run integration | assert agent_memory_insights in persisted stage memory
Verify: bun test --config /dev/null ./tools/governance/specs/workflow/orchestrator.script.spec.ts

P1: orchestrator_retro.script.ts + orchestrator_providers.script.ts | add co-located specs | smoke export tests
Verify: bun test --config /dev/null tools/governance/specs/workflow/

P1: workflow_invoker.script.ts:30 | diagnostic.code SANDBOX_VIOLATION on sandbox path | one-line fix + invoker spec if present
Verify: bun test --config /dev/null ./tools/governance/specs/workflow/sandbox.script.spec.ts

P1: profile.schema.spec.ts / sandbox.script.spec.ts | tag AWO-11 AC1 tests per handoff checklist | rename or add `it('AWO-11 AC1: …')`

Out of scope: commit/PR (operator step 6–7 after fix pass)

Before done (subset):
bun test --config /dev/null tools/governance/specs/workflow/
bun test --config /dev/null ./tools/governance/specs/workflow/orchestrator.script.spec.ts
mise run spec gate assets/specs/009-agentic-workflow-orchestrator

Do not commit unless asked.
```

## Diff paths (WIP)

**Modified:** `orchestrator.script.ts`, `orchestrator.script.spec.ts`, `workflow_invoker.script.ts`, `profile_loader.script.ts`, `profile_loader.script.spec.ts`, `default.yaml`, `fixture-profile.yaml`, `SECURITY_GUIDE.md`, `WORKFLOW_OBSERVABILITY_GUIDE.md`, `handoff.md`

**Untracked:** `retrospective.script.ts`, `retrospective.script.spec.ts`, `agent_memory.script.ts`, `agent_memory.script.spec.ts`, `sandbox.script.ts`, `sandbox.script.spec.ts`, `orchestrator_retro.script.ts`, `orchestrator_providers.script.ts`, `assets/catalog/agent_memory.yaml`

**Notes:** `agent_memory.script.ts` uses `JSON.parse`/`JSON.stringify` while catalog path is `.yaml` — seed YAML ignored until first append rewrites as JSON. Consider YAML parse or `.json` path alignment with spec.
