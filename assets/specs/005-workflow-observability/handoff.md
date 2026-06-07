<!-- markdownlint-disable-file -->

# Handoff — `005-workflow-observability`

**Spec:** `assets/specs/005-workflow-observability/`
**Branch:** `feat/005-workflow-observability`
**Release:** v0.13.0 (MVP); Path B layer 1 tasks deferred to v0.13.x

## Agent prompt

```text
Implement spec 005-workflow-observability (MVP only — Path A from the
research brief). Read spec.md (requirements WOBS-1 … WOBS-9), plan.md
(design contract + traceability table), and tasks.md (Phases 1–7).

Use spec WOBS IDs as references; do not copy EARS text into plan.md or
tasks.md. The phase model is identical to spec 004-orchestrated-handoff —
do not redefine phases.

MVP scope:
  - TypeBox `WorkflowEvent` schema + writer module
  - Four emit sites (phase_decided, manifest_emitted, handoff_written,
    dispatch_invoked)
  - Read-side CLI: mise run spec runs {list, show, tail, prune}
  - Performance harness with two budgets (handoff-generate <250ms,
    --next <100ms; --next early-exit <50ms)
  - Retention: 30-day prune + best-effort lazy prune on list

Out of MVP scope (deferred to v0.13.x — Phase 8 in tasks.md):
  - LogTape adoption in tools/
  - WORKFLOW_RUN_ID env propagation across processes
  - mise run spec runs join Mermaid emitter
  - Spec Kit hook bridge for human gate approve/reject

Before done:
  bun test --config /dev/null tools/governance/specs/workflow/
  mise run spec lint assets/specs/005-workflow-observability --strict
  mise run spec trace assets/specs/005-workflow-observability --strict
  mise run spec workflow orchestrated-handoff --feature assets/specs/005-workflow-observability --lint
  mise run perf workflow-observability
  bash .agents/skills/app-quality-gate/scripts/gate.sh
```

## Acceptance criteria tracker

| ID         | Done when                                                                                                                     | Evidence                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| WOBS-1 AC1 | Every emitted event passes TypeBox `Value.Check` before write                                                                 | `bun test … workflow_run.script.spec.ts` (round-trip)                                 |
| WOBS-1 AC2 | New event types extend the discriminated union in one place + a fixture                                                       | Same spec (union/fixture sync test)                                                   |
| WOBS-2 AC1 | `--next` emits one `phase_decided` event with FileSet fingerprint, probe result, Phase, command, focusHint, duration_ms       | `bun test … orchestrated_handoff_wobs2.script.spec.ts` (mkdtempSync fixture, not 003) |
| WOBS-2 AC2 | Manifest probe boolean is replayable from the log alone                                                                       | Same spec; manifest-true + manifest-false branches                                    |
| WOBS-3 AC1 | `handoff_generate.script.run()` emits `handoff_written` with path, focus, ac_row_count, has_e2e_block, duration_ms            | `bun test … handoff_generate_wobs3.script.spec.ts` (pilot 003 fixture)                |
| WOBS-3 AC2 | `--dry-run` emits no `handoff_written` event                                                                                  | Same spec; dry-run assertion                                                          |
| WOBS-4 AC1 | `dispatchToOpencode` emits `dispatch_invoked` with `opencode_found`, body_bytes, exit_code, nullable session_id               | `bun test … handoff_generate_wobs3.script.spec.ts` (fake-opencode shim)               |
| WOBS-4 AC2 | Missing opencode keeps file emission per 004 OHW-4 AC2; event has `opencode_found: false`                                     | Same spec; missing-opencode branch                                                    |
| WOBS-5 AC1 | Events written under `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.ndjson`; `hk.pkl` excludes `tmp/`; `.gitignore` excludes `tmp/` | `bun test … workflow_run.script.spec.ts` (filesystem test) + grep                     |
| WOBS-5 AC2 | `mise run spec runs prune` removes runs older than 30 days; `runs list` triggers best-effort lazy prune                       | Backdated fixture in `workflow_run.script.spec.ts`                                    |
| WOBS-6 AC1 | `mise run spec runs list` prints the 20 most recent runs with slug/phase/duration_ms/result                                   | `bun test … workflow_run.script.spec.ts` (runs_cli fixture)                           |
| WOBS-6 AC2 | `mise run spec runs show <run_id>` streams JSONL byte-identical to disk                                                       | Same spec                                                                             |
| WOBS-6 AC3 | `mise run spec runs tail` streams the most recent run for today and exits on EOF                                              | Same spec                                                                             |
| WOBS-7 AC1 | No diff in `lint.script.ts` / `trace.script.ts` / `gate.sh` exit-code logic; full gate green                                  | Diff review + `bash .agents/skills/app-quality-gate/scripts/gate.sh`                  |
| WOBS-7 AC2 | Writer failure does not change parent script exit codes; stderr line emitted                                                  | Stub-writer test in `workflow_run.script.spec.ts`                                     |
| WOBS-8 AC1 | `handoff-generate` p95 wall-time under 250 ms over 100 iterations on pilot 003                                                | `workflow_observability.perf.script.ts` output + baseline JSON                        |
| WOBS-8 AC2 | Regression >25% over baseline fails CI                                                                                        | Baseline compare in CI via `workflow_observability.perf.script.ts`                    |
| WOBS-9 AC1 | `--next` p95 wall-time under 100 ms over 100 iterations on populated fixture                                                  | Perf harness output + baseline JSON                                                   |
| WOBS-9 AC2 | `--next` early-exit (no handoff.md) p95 wall-time under 50 ms                                                                 | Perf harness output + early-exit baseline JSON                                        |

## Operator markers (per 004 OHW-3 AC5)

Create one of these files after the corresponding phase finishes:

- `checklists/analyze-plan.md` — after plan-pass analyze
- `checklists/analyze-tasks.md` — after tasks-pass analyze
- `checklists/implement-done.md` — after `speckit.implement` and unit checks pass

The orchestrator's `--next` reads these markers; they double as workflow
audit trail until cross-process `WORKFLOW_RUN_ID` lands in v0.13.x.

## Inference: human gate approve/reject (no event in MVP)

Per spec § Clarifications, MVP does NOT capture Spec Kit human gate
approve/reject decisions as events. The orchestrator continues to infer
"approved" by the presence of the matching `checklists/*.md` marker file. The
v0.13.x hook bridge (Phase 8 task 30) will replace inference with explicit
events.

## E2e (stretch)

Per `spec.md` § E2e declaration, e2e Gherkin is **stretch** for 005. The
deterministic unit tests, the perf harness, and `gate.sh` are the release
evidence.

## Pilot dogfooding (per Phase 7 task 24)

After implementation, run the orchestrator + handoff-generate against pilot
003 with MVP instrumentation enabled:

```bash
mise run spec workflow orchestrated-handoff --feature assets/specs/003-sync-frecency-preserve --next
mise run spec handoff-generate --feature assets/specs/003-sync-frecency-preserve --focus gherkin
mise run spec runs list
mise run spec runs show <run_id_from_list>
```

Expected: `phase_decided` + `handoff_written` events visible in the JSONL
under `tmp/workflow-runs/<today>/`; `runs show` prints them in order.
