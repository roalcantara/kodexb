<!-- markdownlint-disable-file -->

# Plan — `005-workflow-observability`

**Spec:** [`spec.md`](./spec.md) — requirements WOBS-1 … WOBS-9.
**Companion brief:** `/Users/roalcantara/.claude/plans/research-brief-sdd-recursive-emerson.md` (Path A MVP).
**Phase model reuse:** identical to [`004-orchestrated-handoff/spec.md`](../004-orchestrated-handoff/spec.md) — this PR observes, it does not redefine phases.

This plan is pointer-only per [`WORKFLOW_SDD_GUIDE.md` § Normative quartet](../../guides/WORKFLOW_SDD_GUIDE.md#normative-quartet). EARS text is not copied here; tasks reference requirement IDs.

## Design contract

The feature ships in three orthogonal pieces, with two Path B layers explicitly deferred to v0.13.x.

1. **TypeBox event schema + writer module** (WOBS-1, WOBS-5, WOBS-7)
   New file `tools/governance/specs/workflow/workflow_run.script.ts` exports the discriminated-union `WorkflowEvent` schema, the `WorkflowRunWriter` class that appends to `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.ndjson`, and the retention helpers (`pruneOlderThan`, `bestEffortPrune`). The writer never throws on disk error; failures degrade to a stderr line and let the parent script's exit code stand (WOBS-7 AC2).

2. **Emit sites in existing scripts** (WOBS-2, WOBS-3, WOBS-4)
   Four insertion points: `orchestrated_handoff.script.run()` emits `phase_decided` after `detectPhase`; the `--manifest` branch emits `manifest_emitted`; `handoff_generate.script.run()` emits `handoff_written` after the file write; `dispatchToOpencode` emits `dispatch_invoked` on either branch. Each emission carries a `duration_ms` measured by `performance.now()` or `Bun.nanoseconds()`. No changes to the existing public APIs of those scripts; observation is internal.

3. **Read-side CLI + performance harness** (WOBS-6, WOBS-8, WOBS-9)
   New mise subcommand `mise run spec runs {list|show|tail|prune}` dispatched via `tools/bin/spec.script.ts` into a new `tools/governance/specs/workflow/runs_cli.script.ts`. A new perf script under `tools/metrics/harnesses/perf/workflow_observability_perf.script.ts` (or extending the existing `perf.script.ts` with a workflow scope) runs the two budgets in CI with committed baselines under `tools/metrics/baselines/workflow-observability/`.

### Deferred to v0.13.x follow-up (NOT in this PR)

- **LogTape adoption in `tools/`.** Today MVP writes via `appendFileSync`. The Path B layer 1 task migrates to LogTape's `@logtape/file` sink with category prefix `['kb', 'tools', 'spec', 'workflow']`. See `tasks.md` Phase 7.
- **Cross-invocation `WORKFLOW_RUN_ID` env var.** MVP records one run per `bun` process. Follow-up plumbs the env so `--next` then `handoff-generate` then `gate` join into one logical run.
- **`mise run spec runs join <run_id>` Mermaid emitter.** Reads the event log, writes a Mermaid sequence diagram. Follow-up.
- **Spec Kit hook bridge** for capturing human approve/reject decisions on workflow gates. Out of MVP per spec Clarifications.

## Traceability

| Requirement | Primary artifact                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| WOBS-1      | `workflow_run.script.ts` (TypeBox `WorkflowEvent` union); `workflow_run.script.spec.ts`               |
| WOBS-2      | `orchestrated_handoff.script.ts` emit sites; mkdtemp fixture in `orchestrated_handoff.script.spec.ts` |
| WOBS-3      | `handoff_generate.script.ts` emit site; `handoff_generate.script.spec.ts`                             |
| WOBS-4      | `dispatchToOpencode` emit site; fake-opencode shim test                                               |
| WOBS-5      | Writer path + retention helpers; `hk.pkl` exclude + `.gitignore` review; prune fixture test           |
| WOBS-6      | `runs_cli.script.ts`; `mise.toml` `[tasks."spec"]` block; dispatcher case in `spec.script.ts`         |
| WOBS-7      | No diffs in `lint.script.ts` / `trace.script.ts` / `gate.sh`; stub-writer failure-mode test           |
| WOBS-8      | Perf harness scope `handoff-generate`; baseline JSON under `tools/metrics/baselines/`                 |
| WOBS-9      | Perf harness scope `next`; separate baseline JSON                                                     |

## File touch list

- `assets/specs/005-workflow-observability/spec.md` (this spec)
- `assets/specs/005-workflow-observability/plan.md` (this file)
- `assets/specs/005-workflow-observability/tasks.md`
- `assets/specs/005-workflow-observability/handoff.md`
- `tools/governance/specs/workflow/workflow_run.script.ts` (new)
- `tools/governance/specs/workflow/workflow_run.script.spec.ts` (new)
- `tools/governance/specs/workflow/runs_cli.script.ts` (new)
- `tools/governance/specs/workflow/orchestrated_handoff.script.ts` (emit sites)
- `tools/governance/specs/workflow/orchestrated_handoff.script.spec.ts` (mkdtemp fixtures)
- `tools/governance/specs/workflow/handoff_generate.script.ts` (emit site)
- `tools/governance/specs/workflow/handoff_generate.script.spec.ts` (emit + dispatch fixtures)
- `tools/metrics/harnesses/perf/workflow_observability_perf.script.ts` (new) OR extend `perf.script.ts`
- `tools/metrics/baselines/workflow-observability/handoff-generate.json` (new)
- `tools/metrics/baselines/workflow-observability/next.json` (new)
- `tools/metrics/baselines/workflow-observability/next-early-exit.json` (new)
- `tools/bin/spec.script.ts` (new `runs` dispatcher case)
- `mise.toml` (new `cmd "runs" {…}` block under `[tasks."spec"]`)
- `assets/guides/WORKFLOW_SDD_GUIDE.md` (small section pointing at `mise run spec runs`)
- `hk.pkl` (verify `tmp` already excluded; no edit expected)
- `.gitignore` (verify `tmp/` already covered; no edit expected)

## Non-functional constraints

Per `spec.md` § Performance / non-functional notes: per-event write under 1 ms;
no new runtime deps (Bun built-ins only); audit log append-only; MVP scope
strictly Path A.

## Out of scope

See [`spec.md` § Out of scope](./spec.md#out-of-scope). Optional Spec Kit
satellites (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`)
are intentionally absent per OHW-8 AC3 — the research brief lives at
`/Users/roalcantara/.claude/plans/research-brief-sdd-recursive-emerson.md`
and is the canonical research artefact.
