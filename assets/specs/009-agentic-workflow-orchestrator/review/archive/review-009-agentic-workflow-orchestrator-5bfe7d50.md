# Review audit — 009-agentic-workflow-orchestrator — 2026-06-10 (M3)

Verdict: **REQUEST_CHANGES** · Branch: `feature/009-m3-pr-ci-completion` · `5bfe7d50` · HEAD~1..HEAD · slice: governance-tools

## Scope

M3 commit adds `ci_gate.script.ts`, `providers_runner.script.ts`, `runProviders()` on orchestrator, `default.yaml` pr-prep + providers, `CI_GUIDE.md` section, fixture profile stubs. Evidence commands all exit 0; several AC semantics not met in production path.

## AC matrix

| ID        | Status  | Note                                                                                                                   |
| --------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| AWO-6 AC1 | PARTIAL | Evidence (orchestrator.spec + ast-grep) passes; no AWO-6 / pr-prep test; `triggers.post` never invoked in orchestrator |
| AWO-6 AC2 | PARTIAL | `persistPrRef` tested; `runProvider` and disabled-profile skip untested                                                |
| AWO-6 AC3 | FAIL    | `checkCiGate` unit tests pass; `runProviders` does not gate `terminal_success` on CI exit 0                            |
| AWO-6 AC4 | PARTIAL | Escalate unit test only; no failing-then-passing integration (required in tasks.md)                                    |

## Evidence commands

| ID        | Command                         | Exit | Output hint                  |
| --------- | ------------------------------- | ---- | ---------------------------- |
| AWO-6 AC1 | orchestrator.script.spec.ts     | 0    | 7 pass (no AWO-6 assertions) |
| AWO-6 AC1 | lint:ast-grep                   | 0    | clean                        |
| AWO-6 AC2 | providers_runner.script.spec.ts | 0    | 3 pass                       |
| AWO-6 AC3 | ci_gate.script.spec.ts          | 0    | 10 pass                      |
| AWO-6 AC4 | ci_gate.script.spec.ts          | 0    | 10 pass                      |
| Suite     | workflow/                       | 0    | 245 pass / 23 files          |

## Blockers

[CRITICAL] AWO-6 AC3 \| `orchestrator.script.ts:336` `runProviders` after stage loop — CI fail/escalate does not prevent `terminal_success` / `run.summary` outcome \| gate terminal outcome on `checkCiGate === 'pass'` or transition machine to failure on escalate

[IMPORTANT] AWO-6 AC1 \| `dispatchStageCommand` ignores `stageDef.triggers.post`; CI_GUIDE claims post trigger runs \| invoke `triggers.post` via `runProvider`/`invokeWithTelemetry` when stage completes; add orchestrator spec for pr-prep stage order

[IMPORTANT] AWO-6 AC4 \| tasks.md requires failing-then-passing stub integration \| add spec with counter stub script under `tools/__tests__/fixtures/workflow/` exercising CI retry loop in `runProviders`

[IMPORTANT] `default.yaml` \| `providers.*` use `gh pr …` but `execution_policy.allowed_prefixes` omits `gh` \| wrap in `mise run …` or add `gh` to prefixes consistently with SECURITY policy

## Fix handoff

```text
Fix handoff — 009 M3 pr-ci — review 5bfe7d50

Load: app-context + app-testing + mise-tasks

P0: orchestrator.script.ts runProviders + run() | CI gate must block terminal_success | track ciGate outcome; emit run.summary terminal_failure on escalate; skip success when CI not pass
Verify: bun test --config /dev/null ./tools/governance/specs/workflow/orchestrator.script.spec.ts

P0: orchestrator.script.ts | wire triggers.post on pr-prep (and stage completion) | run profile trigger command via L2 before/after envelope read per stageDef
Verify: bun test --config /dev/null ./tools/governance/specs/workflow/orchestrator.script.spec.ts

P1: ci_gate or orchestrator spec | failing-then-passing stub | stub script exits 1 then 0; assert retry then pass
P1: providers_runner.script.spec.ts | runProvider + empty providers skip
P1: default.yaml | fix gh prefix mismatch

Before done: failed AC Evidence + workflow/ suite + spec lint/gate
Do not commit unless asked.
```

## Diff paths

- assets/catalog/workflows/default.yaml
- assets/guides/CI_GUIDE.md
- tools/__tests__/fixtures/workflow/fixture-profile.yaml
- tools/governance/specs/workflow/ci_gate.script.{ts,spec.ts}
- tools/governance/specs/workflow/providers_runner.script.{ts,spec.ts}
- tools/governance/specs/workflow/orchestrator.script.ts
