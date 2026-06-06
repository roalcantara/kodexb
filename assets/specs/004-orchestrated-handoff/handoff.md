<!-- markdownlint-disable-file -->

# Handoff — `004-orchestrated-handoff`

**Spec:** `assets/specs/004-orchestrated-handoff/`
**Branch:** `feat/004-orchestrated-handoff`
**Release:** v0.13.x (target)

## Agent prompt

```text
Implement spec 004-orchestrated-handoff. Read spec.md (requirements OHW-1 … OHW-8),
plan.md (design contract + traceability table), and tasks.md (ordered tasks).

Use spec OHW IDs as references; do not copy EARS text into plan.md or tasks.md.

Before done:
  bun test --config /dev/null tools/governance/specs/workflow/
  mise run spec lint assets/specs/004-orchestrated-handoff --strict
  mise run spec trace assets/specs/004-orchestrated-handoff --strict
  mise run spec workflow orchestrated-handoff --feature assets/specs/004-orchestrated-handoff --lint
  bash .agents/skills/app-quality-gate/scripts/gate.sh
```

## Acceptance criteria tracker

| ID         | Done when                                                                                                                                                                | Evidence                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| OHW-1 AC1  | `specify workflow list` (or catalog parse) shows orchestrated-handoff with id/name/version/description                                                                   | `bun test --config /dev/null tools/governance/specs/workflow/` (workflow_yaml fixture) |
| OHW-1 AC2  | Every `steps[].command` references a known speckit.* command; gates have `[approve, reject]`                                                                             | `bun test --config /dev/null tools/governance/specs/workflow/` (workflow_yaml fixture) |
| OHW-1 AC3  | Both speckit and orchestrated-handoff registered in `.specify/workflow-catalogs.yml`                                                                                     | `bun test --config /dev/null tools/governance/specs/workflow/` (workflow_yaml fixture) |
| OHW-2 AC1  | `mise run spec handoff-generate --feature 003 --focus gherkin` writes `tmp/handoffs/opencode-sync-frecency-preserve-gherkin.md`                                       | Pilot smoke + `bun test … handoff_generate.script.spec.ts`                            |
| OHW-2 AC2  | Every SF-n ACm row in handoff.md becomes a prompt row with `@ac:SF-n_ACm` + `sf{n}ac{m}`                                                                                  | `bun test … handoff_generate.script.spec.ts` (parseHandoffAcTable)                    |
| OHW-2 AC3  | Operator-smoke rows produce `@e2e` Playwright block; `@unit` rows never get Playwright                                                                                    | `bun test … handoff_generate.script.spec.ts` (pilot 003 fixture)                      |
| OHW-2 AC4  | 003 pilot prompt references `assets/features/sync.feature`, `bdd/unit/`, and `mise run test tag sync_frecency_preserve`                                                  | Pilot 003 integration test                                                            |
| OHW-2 AC5  | `--worker claude/codex/deepseek` or `--focus bogus` exits 2                                                                                                              | `bun test … handoff_generate.script.spec.ts` (parseArgs)                              |
| OHW-3 AC1  | `--next` matches the 10-row transition table                                                                                                                              | `bun test … orchestrated_handoff.script.spec.ts` (transition table)                   |
| OHW-3 AC2  | `plan.md` without `checklists/analyze-plan.md` → `speckit.analyze` + plan-pass focus hint                                                                                 | Transition test                                                                       |
| OHW-3 AC3  | `tasks.md` + `handoff.md` without `checklists/analyze-tasks.md` → `speckit.analyze` + tasks-pass focus hint                                                               | Transition test                                                                       |
| OHW-3 AC4  | `analyze-tasks` done + manifest needs `gherkin-bdd-handoff` → `mise run spec handoff-generate` command                                                                    | Transition test (A1 fix)                                                              |
| OHW-3 AC5  | `checklists/implement-done.md` present → `mise run spec gate`                                                                                                            | Transition test (A3 fix)                                                              |
| OHW-3 AC6  | `--manifest` XML + manifest probe gates `--next`; unit-only fixture skips handoff-generate                                                                                | `bun test … orchestrated_handoff.script.spec.ts` (manifest + transition)              |
| OHW-3 AC7  | `gherkin-bdd-handoff` description names `tmp/handoffs/opencode-{slug}-gherkin.md`                                                                                         | Manifest content test                                                                 |
| OHW-4 AC1  | `--dispatch` invokes `opencode run` with argv (small) or stdin (large); propagates exit                                                                                  | `bun test … handoff_generate.script.spec.ts` (dispatchToOpencode)                     |
| OHW-4 AC2  | Missing opencode → file written, stderr warning, exit 0                                                                                                                  | `bun test … handoff_generate.script.spec.ts`                                          |
| OHW-4 AC3  | `ORCHESTRATED_HANDOFF_DISPATCH=1` env converges with `--dispatch`                                                                                                         | Environment-driven test                                                               |
| OHW-5 AC1  | Guide drops "Deferred" line for orchestrated-handoff; new section contains the three mise commands + resume                                                              | `bun test … sdd_guide_content.script.spec.ts`                                         |
| OHW-5 AC2  | Guide describes opencode worker vs primary implement, links `tmp/handoffs/` + `--focus`, states v1 opencode-only                                                          | `bun test … sdd_guide_content.script.spec.ts`                                         |
| OHW-5 AC3  | Constitution has `[^analyze-dual]` footnote on Analyze row; guide § orchestrated-handoff documents both passes                                                            | Diff review + grep                                                                    |
| OHW-6 AC1  | `mise run spec workflow orchestrated-handoff --feature <dir> --lint` delegates to `lint.script.ts --strict <dir>` and propagates exit code                            | `bun test … orchestrated_handoff.script.spec.ts` (runLint)                            |
| OHW-6 AC2  | Guide § Review-spec gate contains literal substring `deterministic EARS gate`                                                                                            | `bun test … sdd_guide_content.script.spec.ts`                                         |
| OHW-6 AC3  | `tools/governance/specs/lint.script.ts` unchanged or strengthened only                                                                                                    | Diff review                                                                           |
| OHW-7 AC1  | Guide § Plan skill routing has routing table + cap rule `Maximum 4 skills`                                                                                               | `bun test … sdd_guide_content.script.spec.ts`                                         |
| OHW-7 AC2  | `.cursor/skills/speckit-plan/SKILL.md` not forked in repo → guide documents the rule + names upstream skill                                                              | Manual review                                                                         |
| OHW-7 AC3  | Generated handoff prompt mentions `Plan skill routing` / `at most 4 skills` under Required reading                                                                       | `bun test … handoff_generate.script.spec.ts`                                          |
| OHW-8 AC1  | Guide § Normative quartet documents the quartet + no-EARS-copy rule                                                                                                      | `bun test … sdd_guide_content.script.spec.ts`                                         |
| OHW-8 AC2  | `.specify/templates/plan-template.md` marks satellites OPTIONAL                                                                                                          | `bun test … sdd_guide_content.script.spec.ts` (plan template fixture)                 |
| OHW-8 AC3  | 004 dir has plan/tasks/handoff but NO research/data-model/contracts/quickstart                                                                                            | Directory listing in spec lint + manual review                                        |
| OHW-8 AC4  | Generator Per-AC slice section prints AC → slice only (no Evidence duplication)                                                                                          | `bun test … handoff_generate.script.spec.ts`                                          |

## Operator markers (per OHW-3 AC5)

Create one of these files after the corresponding phase finishes:

- `checklists/analyze-plan.md` — after plan-pass analyze
- `checklists/analyze-tasks.md` — after tasks-pass analyze
- `checklists/implement-done.md` — after `speckit.implement` and unit checks pass

The orchestrator's `--next` reads these markers; they double as workflow
audit trail.

## E2e (stretch)

Per `spec.md` § E2e declaration, e2e Gherkin is **stretch** for 004. The
deterministic gates are the release evidence.
