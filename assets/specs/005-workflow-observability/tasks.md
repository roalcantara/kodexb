<!-- markdownlint-disable-file -->

# Tasks — `005-workflow-observability`

Ordered tasks reference requirement IDs from [`spec.md`](./spec.md). No EARS
text copied here per [`SDD_WORKFLOW_GUIDE.md` § Normative quartet](../../guides/SDD_WORKFLOW_GUIDE.md#normative-quartet).

## Phase 1 — Event schema + writer (MVP)

| #   | Task                                                                                                                 | Done when                                                                                                                  | Refs                   |
| --- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | Author `tools/governance/specs/workflow/workflow_run.script.ts` with the TypeBox `WorkflowEvent` discriminated union | All event variants (`phase_decided`, `manifest_emitted`, `handoff_written`, `dispatch_invoked`) defined with `Value.Check` | WOBS-1                 |
| 2   | Add `WorkflowRunWriter` that mints `run_id`, builds the daily directory path, and appends one JSON line per event    | Smoke test writes 3 events and re-reads them byte-identical                                                                | WOBS-1, WOBS-5         |
| 3   | Implement `pruneOlderThan(days, root)` and `bestEffortPrune(root)` helpers                                           | Backdated date dirs cleaned by `pruneOlderThan`; `bestEffortPrune` non-throwing                                            | WOBS-5                 |
| 4   | Co-locate `workflow_run.script.spec.ts` covering schema, writer round-trip, prune, and writer-failure stub           | `bun test --config /dev/null tools/governance/specs/workflow/workflow_run.script.spec.ts` passes                           | WOBS-1, WOBS-5, WOBS-7 |

## Phase 2 — Emit sites in existing scripts (MVP)

| #   | Task                                                                                | Done when                                                                                             | Refs               |
| --- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------ |
| 5   | Emit `phase_decided` from `orchestrated_handoff.script.run()` for `--next`          | Event includes FileSet fingerprint, probe result, Phase, command, focusHint, `duration_ms`            | WOBS-2             |
| 6   | Emit `manifest_emitted` from the `--manifest` branch                                | Event includes subtask types + count + `duration_ms`                                                  | WOBS-2 (companion) |
| 7   | Emit `handoff_written` from `handoff_generate.script.run()` after the file write    | Event includes path, focus, `ac_row_count`, `has_e2e_block`, `duration_ms`; `--dry-run` emits nothing | WOBS-3             |
| 8   | Emit `dispatch_invoked` from `dispatchToOpencode` (both branches)                   | Event includes `opencode_found`, `body_bytes`, `exit_code`, nullable `session_id`                     | WOBS-4             |
| 9   | mkdtempSync fixtures in `orchestrated_handoff.script.spec.ts` covering WOBS-2 paths | New tests do not read `assets/specs/003-sync-frecency-preserve/`                                      | WOBS-2 (spec note) |
| 10  | Update `handoff_generate.script.spec.ts` with dispatch fixture covering WOBS-4      | Both `opencode_found` branches asserted; missing-opencode keeps file emission per 004 OHW-4 AC2       | WOBS-4             |

## Phase 3 — Read-side CLI (MVP)

| #   | Task                                                                              | Done when                                                                        | Refs   |
| --- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------ |
| 11  | Author `runs_cli.script.ts` with `list`, `show <run_id>`, `tail`, `prune` actions | All four actions covered by tests against seeded fixture; no follow mode in MVP  | WOBS-6 |
| 12  | Add `cmd "runs" {…}` block under `[tasks."spec"]` in `mise.toml`                  | Usage clauses cover `--limit`, `<run_id>` positional, `--older-than-days`        | WOBS-6 |
| 13  | Add `case 'runs'` dispatcher in `tools/bin/spec.script.ts`                        | `validateRunsAction()` (or equivalent shape) rejects unknown actions with exit 2 | WOBS-6 |
| 14  | Wire lazy `bestEffortPrune` into `list` action                                    | Storage caps in practice; lazy call never blocks or throws                       | WOBS-5 |

## Phase 4 — No-weakening guarantees + failure semantics

| #   | Task                                                                                 | Done when                                                     | Refs       |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ---------- |
| 15  | Add stub-writer failure test: writer throws → parent script's exit code is unchanged | Test in `workflow_run.script.spec.ts` covers the failure path | WOBS-7 AC2 |
| 16  | Confirm no diffs to `lint.script.ts`, `trace.script.ts`, `gate.sh` exit-code logic   | Diff review in PR; gate.sh stays green                        | WOBS-7 AC1 |

## Phase 5 — Performance harness + baselines

| #   | Task                                                                                                     | Done when                                                                                                | Refs           |
| --- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------- |
| 17  | Author `tools/metrics/harnesses/perf/workflow_observability.perf.script.ts` (or extend `perf.script.ts`) | p95 over 100 iterations measured for `handoff-generate` and two `--next` scopes (populated + early-exit) | WOBS-8, WOBS-9 |
| 18  | Commit baselines under `tools/metrics/baselines/workflow-observability/`                                 | `handoff-generate.json`, `next.json`, `next-early-exit.json` all present with realistic values           | WOBS-8, WOBS-9 |
| 19  | Wire `mise run test perf workflow-observability` (or named scope) into the existing perf task            | Local + CI run shows green; regression threshold 25%                                                     | WOBS-8 AC2     |

## Phase 6 — CI / HK verification path

| #   | Task                                                                                                                 | Done when                                                                               | Refs                          |
| --- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------- |
| 20  | Confirm `workflow_run.script.spec.ts` is picked up by `bun test --config /dev/null tools/governance/specs/workflow/` | New spec appears in the run output; CI green                                            | WOBS-1, spec § Clarifications |
| 21  | Verify `hk.pkl` excludes `tmp` (it already does) and that no new path needs adding                                   | No diff required; documented in PR body                                                 | WOBS-5 AC1                    |
| 22  | Verify `.gitignore` covers `tmp/` (it already does) and that no new path needs adding                                | No diff required; documented in PR body                                                 | WOBS-5 AC1                    |
| 23  | Verify the gate runs `workflow_run.script.spec.ts` via the existing `bun test` invocation in `gate.sh`               | Stage 2 of `bash .agents/skills/app-quality-gate/scripts/gate.sh` includes the new spec | WOBS-1, WOBS-7                |

## Phase 7 — Dogfooding + guide

| #   | Task                                                                                         | Done when                                                                                                  | Refs                   |
| --- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------- |
| 24  | Run the orchestrator and handoff-generate against pilot 003 with MVP instrumentation on      | `tmp/workflow-runs/<date>/<run_id>.ndjson` written; `mise run spec runs show <run_id>` displays the events | WOBS-2, WOBS-3, WOBS-6 |
| 25  | Add a short section to `assets/guides/SDD_WORKFLOW_GUIDE.md` describing `mise run spec runs` | Section names the four actions, the JSONL path, and the retention rule                                     | WOBS-6                 |
| 26  | Add `tasks.md` references for Phase 8 follow-ups so v0.13.x has an entry point               | Phase 8 below kept as a tracker, not implemented in this PR                                                | spec § Out of scope    |

## Phase 8 — v0.13.x follow-ups (NOT shipped in this PR)

These remain pending until v0.13.x and explicitly belong to a follow-up spec or
PR. Listed here so reviewers see the deferred surface area.

| #   | Task (deferred)                                                                                 | Refs                                  |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------- |
| 27  | Adopt LogTape in `tools/` under `['kb', 'tools', 'spec', 'workflow']` with `@logtape/file` sink | spec § Out of scope (LogTape)         |
| 28  | Plumb `WORKFLOW_RUN_ID` env across mise → bun script invocations for cross-process correlation  | spec § Out of scope (WORKFLOW_RUN_ID) |
| 29  | Build `mise run spec runs join <run_id>` Mermaid emitter                                        | spec § Out of scope (Mermaid)         |
| 30  | Optional Spec Kit hook bridge for capturing human approve/reject events                         | spec § Out of scope (hook bridge)     |

## Verification

```bash
# Spec hygiene
mise run spec lint assets/specs/005-workflow-observability --strict
mise run spec trace assets/specs/005-workflow-observability --strict

# Workflow + lint together
mise run spec workflow orchestrated-handoff --feature assets/specs/005-workflow-observability --lint

# Unit + integration tests for new code
bun test --config /dev/null tools/governance/specs/workflow/

# Read-side smoke
mise run spec runs list
mise run spec runs show $(ls tmp/workflow-runs/*/*.ndjson | head -1 | xargs basename -s .ndjson)

# Performance
mise run test perf workflow-observability

# Full gate
bash .agents/skills/app-quality-gate/scripts/gate.sh
```
