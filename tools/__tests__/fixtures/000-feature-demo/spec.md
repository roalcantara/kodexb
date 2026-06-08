<!-- markdownlint-disable-file -->

# Workflow observability

**Feature Branch**: `feat/005-workflow-observability`
**Release**: v0.13.0 (target — MVP only; LogTape / cross-process correlation deferred to v0.13.x follow-up)
**Status**: Draft

**Input**: Add structured audit, decision logging, and per-phase performance measurement to the orchestrated-handoff workflow (see [`004-orchestrated-handoff/spec.md`](../004-orchestrated-handoff/spec.md)) so maintainers can answer "what happened, why, and how fast?" without rerunning the workflow.

## Introduction

The orchestrated-handoff workflow shipped in spec 004 with deterministic phase detection, a manifest probe, and an opencode dispatch path. What it does not have is a durable record of what happened during a run. Today the only post-hoc evidence is git history (auto-commit disabled per the constitution), checklist markers under each feature's `checklists/` directory, the rendered files in `tmp/handoffs/`, and stdout from `console.error`. None of that is queryable, time-stamped, or correlated across the four scripts that participate in a workflow run.

This spec adds a minimum viable audit trail. Every emit site in `orchestrated_handoff.script.ts` and `handoff_generate.script.ts` writes a TypeBox-validated event to a daily JSONL file under `tmp/workflow-runs/`. A new `mise run spec runs {list|show|tail|prune}` subcommand lets operators read those events back. Two performance budgets — one for `handoff-generate`, one for `--next` — keep the instrumentation honest. The MVP intentionally stops short of LogTape adoption in `tools/`, cross-process correlation via a shared `WORKFLOW_RUN_ID`, OpenTelemetry export, and Mermaid status visualisations; those become tracked v0.13.x follow-ups (see [Out of scope](#out-of-scope)).

The reference research brief is `/Users/roalcantara/.claude/plans/research-brief-sdd-recursive-emerson.md`. The phase model is identical to 004; this spec adds observation, not new phases.

## Clarifications

### Session 2026-06-07

- Q: What ships in the MVP and what is follow-up? → A: **MVP = Path A** from the research brief (TypeBox event schema, JSONL writer, four emit sites, read-side CLI, two perf budgets, retention). LogTape adoption in `tools/`, the `WORKFLOW_RUN_ID` env variable for cross-invocation correlation, the `runs join` Mermaid emitter, and the Spec Kit hook bridge are **v0.13.x follow-ups** — tracked in `tasks.md` but not blocking v0.13.0.
- Q: Should WOBS-8 cover one budget or two? → A: **Two budgets** with separate WOBS IDs. `handoff_generate` keeps the 250 ms target from 004's non-functional notes (WOBS-8). `--next` gets its own, tighter budget (WOBS-9) because it is pure file scan + decision logic.
- Q: How do WOBS-2 integration tests obtain a populated feature dir? → A: **`mkdtempSync` scratch fixtures only.** Do not depend on the live state of `tools/__tests__/fixtures/003-sync-frecency-preserve/` — its checklist markers may change as 003 progresses through its own lifecycle and would flake tests.
- Q: Does WOBS need a retention policy? → A: **Yes.** Run records live under `tmp/workflow-runs/` (which `hk.pkl` already excludes). WOBS-5 mandates a `runs prune` command plus a best-effort lazy prune triggered by `runs list`, deleting runs older than 30 days. Without this, local disks grow unbounded over the life of the project.
- Q: Should the spec assume Spec Kit hook events for capturing human approve/reject decisions on workflow gates? → A: **No.** Capturing human gate decisions from `specify workflow run` is out of MVP scope. The orchestrator infers approval indirectly via the presence of `checklists/analyze-plan.md`, `checklists/analyze-tasks.md`, and `checklists/implement-done.md` markers; that inference is documented but not promoted to an event type in MVP.
- Q: Do we wire the new `workflow_run.script.spec.ts` into CI/HK? → A: **Yes.** A dedicated task in `tasks.md` confirms the spec runs under `bun test --config /dev/null tools/governance/specs/workflow/` (already CI-covered for that directory) and that `hk.pkl` does not exclude it.

## Out of scope

- Multi-provider dispatch beyond opencode and any tracing of the opencode internal session graph (deferred per 004 OHW-4 v2).
- LogTape adoption inside `tools/` (Path B layer 1 in the research brief). Tracked as a v0.13.x follow-up; MVP stays on `console.error` for diagnostics and direct `appendFileSync` for the audit log.
- Cross-invocation `WORKFLOW_RUN_ID` env propagation. MVP records one run per `bun` process; correlating `--next` with a later `handoff-generate` invocation is a v0.13.x follow-up.
- `mise run spec runs join` Mermaid emitter and any visual status board (Path B layer 1).
- Spec Kit hook bridge (`before_*` / `after_*` event capture). Out of MVP scope. The orchestrator infers approval via checklist markers only.
- OpenTelemetry export via `@logtape/otel` (Path C in the research brief; deferred until distributed tracing is needed).
- LangChain / LangGraph / LangSmith adoption (see research brief § 14; deferred unconditionally for v0.13.x).
- Field-level redaction of LLM prompts in the audit log. MVP excludes prompt bodies entirely; redaction belongs to whichever follow-up wants to log them.

## Glossary

| Term                     | Meaning                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workflow event**       | One TypeBox-validated JSON object emitted by an orchestrator or generator script during a run.                                                                         |
| **Workflow run**         | A sequence of events sharing the same `run_id`. In MVP one run equals one `bun` process; cross-process correlation is a follow-up.                                     |
| **Run id**               | A short identifier of the form `<slug>-<UTC-epoch>-<rand4>` minted at the start of an emitter script's `run()`.                                                        |
| **FileSet fingerprint**  | Short hash (e.g. SHA-256 truncated to 12 hex chars) of the boolean fields returned by `scanFeatureDir`. Lets WOBS-2 record decision inputs without storing path lists. |
| **Audit log**            | The JSONL file at `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.ndjson` that holds every event for a run.                                                                   |
| **Read-side CLI**        | The new `mise run spec runs {list                                                                                                                                      | show | tail | prune}` subcommand. Read-only; never mutates `tools/__tests__/fixtures/` or `.specify/`. |
| **Operator-smoke event** | A `dispatch_invoked` event whose `opencode_found` field is `false` — captures the file-only fallback path documented in 004 OHW-4 AC2.                                 |

---

## REQUIREMENT WOBS-1: Event schema is TypeBox-validated

**User story:** As a maintainer reading the audit log, I want every event in
`tmp/workflow-runs/` to conform to a single TypeBox schema so I can write a
parser once and trust that every row matches it.

### Acceptance criteria

1. WHEN any script under `tools/governance/specs/workflow/` emits a workflow event, THEN the event SHALL pass `Value.Check` against a shared TypeBox schema before being written to disk.
   - **Measure:** Round-trip test renders each event variant, runs `Value.Check`, writes JSON, re-reads, and asserts `Value.Check` passes a second time.
   - **Evidence:** `bun test --config /dev/null tools/governance/specs/workflow/workflow_run.script.spec.ts`.

2. WHEN a new event type is added later, THEN it SHALL extend the discriminated-union schema in one place and SHALL be exercised by an explicit fixture in `workflow_run.script.spec.ts`.
   - **Measure:** Test fails if the discriminator list and fixture list diverge.
   - **Evidence:** Same spec; coverage assertion over the schema union.

---

## REQUIREMENT WOBS-2: Phase decision is recorded

**User story:** As a maintainer debugging "why did `--next` say what it said?",
I want each `--next` invocation to leave a `phase_decided` event behind so I
can replay the inputs without rerunning the workflow.

### Acceptance criteria

1. WHEN `orchestrated_handoff.script.run()` resolves a `--next` invocation to a phase, THEN a `phase_decided` event SHALL be emitted carrying the FileSet fingerprint, manifest probe result, chosen Phase, command string, optional focusHint, and `duration_ms`.
   - **Measure:** mkdtemp scratch fixture seeds spec/plan/tasks/handoff + checklists, runs the orchestrator, and asserts one `phase_decided` event with the expected Phase string.
   - **Evidence:** `bun test --config /dev/null tools/governance/specs/workflow/orchestrated_handoff.script.spec.ts` (new mkdtempSync fixture).

2. WHEN the manifest probe runs as part of the handoff-emit transition, THEN the event SHALL include the probe's boolean result so the decision is replayable from the log alone.
   - **Measure:** Same scratch fixture exercises both manifest-true and manifest-false paths; assert event field matches.
   - **Evidence:** Same spec.

---

## REQUIREMENT WOBS-3: Handoff emission is recorded

**User story:** As a maintainer reviewing what worker prompts shipped, I want a
record of every `handoff_generate` write so I can later see which feature and
focus were involved without grepping `tmp/handoffs/`.

### Acceptance criteria

1. WHEN `handoff_generate.script.run()` writes a prompt file, THEN a `handoff_written` event SHALL include the absolute file path, focus value, `ac_row_count`, `has_e2e_block` boolean, and `duration_ms`.
   - **Measure:** Pilot 003 fixture (read-only, no scratch dir needed) writes to a scratch output path; assertions cover event fields.
   - **Evidence:** `bun test --config /dev/null tools/governance/specs/workflow/handoff_generate.script.spec.ts`.

2. WHEN `--dry-run` is passed and no file is written, THEN no `handoff_written` event SHALL be emitted (dry-run is observation-free by design).
   - **Measure:** Dry-run smoke; assert empty events list.
   - **Evidence:** Same spec.

---

## REQUIREMENT WOBS-4: Dispatch outcome is recorded

**User story:** As a maintainer auditing opencode runs, I want each dispatch
attempt to leave a `dispatch_invoked` event capturing whether opencode was
found, the body size, and the exit code so I can review failures offline.

### Acceptance criteria

1. WHEN `dispatchToOpencode` runs because `--dispatch` was passed or `ORCHESTRATED_HANDOFF_DISPATCH=1` was set, THEN a `dispatch_invoked` event SHALL include `opencode_found`, `body_bytes`, `exit_code`, and a nullable `session_id` (best-effort scrape).
   - **Measure:** Fake-opencode shim test asserts each field; positive and negative `opencode_found` paths covered.
   - **Evidence:** `bun test --config /dev/null tools/governance/specs/workflow/handoff_generate.script.spec.ts`.

2. WHEN opencode is not on `$PATH`, THEN `dispatch_invoked.opencode_found` SHALL be `false`, `session_id` SHALL be `null`, and the file-only fallback documented in 004 OHW-4 AC2 SHALL still produce the prompt file.
   - **Measure:** Missing-opencode test asserts event and file both present.
   - **Evidence:** Same spec.

---

## REQUIREMENT WOBS-5: Audit lives under `tmp/workflow-runs/` with bounded retention

**User story:** As a developer with finite disk space, I want audit logs in a
predictable, gitignored location with a built-in retention policy so my local
checkout does not grow unbounded.

### Acceptance criteria

1. WHEN events are written, THEN they SHALL be appended to `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.ndjson` as one JSON object per line, and the `tmp/` parent SHALL be excluded from git and `hk.pkl`.
   - **Measure:** Post-write existence test plus grep of `hk.pkl` exclude list and `.gitignore` for `tmp`.
   - **Evidence:** `bun test --config /dev/null tools/governance/specs/workflow/workflow_run.script.spec.ts` (filesystem path test).

2. WHEN `mise run spec runs prune` is invoked, THEN run files under date directories older than 30 days SHALL be removed; in addition, `mise run spec runs list` SHALL perform a best-effort lazy prune so storage never grows unbounded in normal use.
   - **Measure:** Scratch fixture seeds backdated date directories, invokes prune, then asserts only fresh dirs remain.
   - **Evidence:** Same spec (prune fixture).

---

## REQUIREMENT WOBS-6: Read-side CLI ships in the same PR

**User story:** As an operator who just ran a workflow, I want to read the
events back without writing my own parser, so I want a small CLI that streams
runs and events.

### Acceptance criteria

1. WHEN `mise run spec runs list` is invoked, THEN the dispatcher SHALL print the 20 most recent runs (one per line) with feature slug, last phase, `duration_ms` sum, and a final result code.
   - **Measure:** Seed fixture, run list, assert stdout shape.
   - **Evidence:** `bun test --config /dev/null tools/governance/specs/workflow/workflow_run.script.spec.ts`.

2. WHEN `mise run spec runs show <run_id>` is invoked, THEN the dispatcher SHALL stream the JSONL events for that run to stdout in chronological order, unchanged from disk.
   - **Measure:** Seed fixture, invoke show, assert byte-identical output to the underlying file.
   - **Evidence:** Same spec.

3. WHEN `mise run spec runs tail` is invoked, THEN the dispatcher SHALL stream the events of the most recent run for today and exit on EOF (no follow mode in MVP).
   - **Measure:** Seed fixture, invoke tail, assert process exits cleanly with the events printed.
   - **Evidence:** Same spec.

---

## REQUIREMENT WOBS-7: No deterministic gate is weakened

**User story:** As a maintainer of the quality gate, I do not want
observability instrumentation to change pass/fail behaviour of any existing
script.

### Acceptance criteria

1. WHEN observability instrumentation lands, THEN `tools/governance/specs/lint.script.ts`, `tools/governance/specs/trace.script.ts`, and `.agents/skills/app-quality-gate/scripts/gate.sh` SHALL be unchanged in their failure semantics — added emit calls do not alter exit codes.
   - **Measure:** Diff review confirms no exit-code logic changes in those three files; full `bash .agents/skills/app-quality-gate/scripts/gate.sh` stays green.
   - **Evidence:** PR diff review + green gate run.

2. WHEN an event write fails (disk full, permission denied), THEN the originating workflow command SHALL still complete with the same exit code it would have produced without instrumentation, logging the failure to stderr.
   - **Measure:** Inject a stub writer that throws; assert the parent script exit code is unchanged.
   - **Evidence:** Stub-writer test in `workflow_run.script.spec.ts`.

---

## REQUIREMENT WOBS-8: Performance budget — `handoff-generate`

**User story:** As an operator running `handoff-generate` interactively, I want
audit emission to stay under the 250 ms target that 004 set as a
non-functional note.

### Acceptance criteria

1. WHEN `handoff_generate.script.run()` is invoked with `--focus gherkin` against a populated feature dir, THEN the wall-time from process start to file written SHALL be under 250 ms at p95 over 100 iterations with audit emission enabled.
   - **Measure:** Bench harness following `tools/metrics/harnesses/perf/perf.script.ts` pattern; pilot 003 used as the populated fixture.
   - **Evidence:** New perf script + JSON baseline check in CI.

2. WHEN the bench harness compares against the baseline, THEN a regression of more than 25% over the recorded p95 SHALL fail CI.
   - **Measure:** Baseline JSON committed under `tools/metrics/baselines/`; CI compares.
   - **Evidence:** Same perf harness, baseline review in PR.

---

## REQUIREMENT WOBS-9: Performance budget — `--next`

**User story:** As an operator running `--next` repeatedly during a workflow
session, I want it to feel instant — audit emission must not push it over the
threshold of "noticeable lag".

### Acceptance criteria

1. WHEN `mise run spec workflow orchestrated-handoff --feature <dir> --next` is invoked against a populated feature dir, THEN the wall-time from process start to the first stdout line SHALL be under 100 ms at p95 over 100 iterations with audit emission enabled.
   - **Measure:** Same bench harness as WOBS-8 with a `--next` scope; populated fixture seeded via mkdtempSync to remove dependence on 003's live state.
   - **Evidence:** Same perf script with a separate `--next` baseline JSON.

2. WHEN the orchestrator skips the manifest probe (no `handoff.md` yet), THEN the wall-time SHALL be under 50 ms at p95 over 100 iterations.
   - **Measure:** Bench harness exercises the early-exit branch.
   - **Evidence:** Same perf harness, separate baseline scope.

---

## E2e declaration

| Requirement | E2e tag                             | Scenario (name only)                                                             |
| ----------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| WOBS-2 AC1  | `@workflow_observability` (pending) | Phase decision events match the printed `--next` command for each transition row |
| WOBS-6 AC1  | `@workflow_observability` (pending) | `mise run spec runs list` reflects the most recent seeded fixture                |

E2e Gherkin is **stretch** for this feature. Deterministic unit tests, the perf
harness, and `gate.sh` are the release evidence. If e2e scenarios are added
later, they live under a new `assets/features/governance.feature` block with a
single catalog key `workflow_observability`.

## Performance / non-functional notes

- Audit emission must complete in under 1 ms per event on a typical SSD; bench against `tools/metrics/harnesses/perf/perf.script.ts`. Anything slower indicates we are over-serialising.
- The audit log must be append-only at the file level; do not rewrite existing lines. JSONL is chosen specifically so partial writes do not corrupt previous entries.
- No new runtime dependencies. Bun built-ins only (`Bun.file`, `node:fs`, `node:path`, `node:crypto` for the `run_id` random suffix, `Bun.nanoseconds()` or `performance.now()` for timing).
- The MVP intentionally ignores cross-process correlation, OTel export, and Mermaid visualisation. See [Out of scope](#out-of-scope) for the deferred set.
