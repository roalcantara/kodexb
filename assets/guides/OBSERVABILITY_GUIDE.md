<!-- markdownlint-disable-file -->

# Observability guide

Canonical source of truth for **how the project records what happened during
a workflow run**: event substrate, schema, file layout, CLI surface,
retention. Companion to [`SDD_WORKFLOW_GUIDE.md`](SDD_WORKFLOW_GUIDE.md) (which
covers the workflow itself) and [`LOGGING_GUIDE.md`](LOGGING_GUIDE.md) (which
covers in-process structured logging via `getLogger`).

If anything here disagrees with code, the code is wrong — open a PR to fix
the code, not the guide.

## Why this guide exists

Workflow runs (orchestrated handoff, agentic orchestrator, security
sub-gates) emit time-stamped events that must be:

- **Queryable** after the fact, not just streamed to stdout.
- **Append-only** at the file level so partial writes never corrupt
  prior entries.
- **Schema-validated** so consumers can rely on field presence.
- **Retentioned** so local disks do not grow without bound.

This guide defines the substrate every workflow component uses.

## Event substrate

### Encoding

Newline-delimited JSON (NDJSON, also called JSONL). Each line is one
`JSON.stringify` of a single event object. No multi-line records.

### File extension

`.ndjson`. Tools that read these files MUST treat both `.ndjson` and
`.jsonl` as equivalent, but writers MUST emit `.ndjson` for consistency.

### File layout (sibling-flat)

```
tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.ndjson         live event tail
tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.state.json     orchestrator snapshot
tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.shared.json    run-shared decisions
tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.memory.<stage>.json   per-stage memory
tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.retro.md       retrospective artifact
```

All artifacts for a run share the `<run_id>` stem inside a daily folder.
The CLI (see [Read-side CLI](#read-side-cli)) locates a run by globbing
`<run_id>.*`.

### Durable archive

On terminal stage success, the event tail is dual-written to:

```
tools/metrics/workflow-runs/<YYYY-MM-DD>/<run_id>.ndjson
```

This is the **DONE/DID** layer (per the `assets/guides` /
`assets/catalog` / `tools/metrics` ontology): durable, long retention,
queryable as a project metric.

### Append-only invariant

- Writes use `O_APPEND` to guarantee atomic per-line appends under
  concurrent invocations.
- Existing lines are never rewritten — corrections are new events, not
  edits.
- Snapshot files (`<run_id>.state.json`) are the exception: written
  atomically via `rename` (`<run_id>.state.json.tmp` → `<run_id>.state.json`).
  Snapshot rewrites do not violate the event-append invariant.

## Event schema

### Base envelope (project-wide)

Every event MUST validate against this base shape:

```ts
import { Type } from '@sinclair/typebox'

export const WorkflowEventBase = Type.Object({
  schema_version: Type.String(),
  ts: Type.String({ format: 'date-time' }),
  run_id: Type.String(),
  source: Type.String({ description: 'process or component emitting the event' }),
  type: Type.String({ description: 'event type identifier' })
})
```

Domain events extend the base with their own required fields (use
`Type.Composite([WorkflowEventBase, …])`). Each event-producing component
owns its extension schema as code in its tool module (for example the
`WorkflowEvent` union in `tools/governance/specs/workflow/workflow_run.script.ts`),
never in an in-flight spec folder. Consumers import the schema from that stable code
path; this guide stays the authority for the base envelope and the
extension contract.

### Versioning

`schema_version` follows the same patch / minor / major rules used across
project schemas: additive optional fields are patch, additive required
fields with documented defaults are minor, breaking changes are major.

### Validation discipline

Producers MUST validate every event via `Value.Check(EventSchema, payload)`
before writing. A failed validation MUST emit a `schema.violation` event
into the same stream with the offending payload's `type` field captured —
silently dropping malformed events is a bug.

## Read-side CLI

Operators inspect runs through:

```bash
mise run spec runs list             # recent runs with phase / duration / result
mise run spec runs show <run_id>    # stream events for a run, chronological
mise run spec runs tail <run_id>    # follow the latest events on EOF
mise run spec runs prune            # delete runs older than retention window
```

The CLI is the single supported read surface. New components MUST NOT add
their own readers — extend the CLI instead.

## Retention

| Layer | Default | Configurable via | Pruner |
| ----- | ------- | ---------------- | ------ |
| `tmp/workflow-runs/` | 30 days | workflow profile `memory.retention.tmp_days` | `mise run spec runs prune`; lazy prune on `runs list` |
| `tools/metrics/workflow-runs/` | 365 days | workflow profile `memory.retention.durable_days` | operator-driven task; never `runs prune` |

`hk.pkl` excludes `tmp/` from hygiene writers so retention pruning is
local-disk-only and never touches committed history.

## Dual-write rule at terminal

When a workflow run reaches a terminal stage:

1. Final events are appended to the live tail (`tmp/workflow-runs/.../<run_id>.ndjson`).
2. The full event file is copied to the durable archive
   (`tools/metrics/workflow-runs/.../<run_id>.ndjson`).
3. Live tail keeps the file for the `tmp_days` retention window so
   downstream consumers can still tail / `runs show` it.
4. Retention pruning removes the live tail after the window; the archive
   persists for `durable_days`.

If live and archive schemas diverge (e.g. base schema bumped without an
archive bump), the orchestrator MUST hold the archive write and emit a
`continuity.violation` event identifying the offending field. Terminal
success is blocked until resolved.

## Performance budgets

Project-wide budgets for emission overhead:

| Operation | Budget |
| --------- | ------ |
| Single event append (`O_APPEND` to `tmp/`) | ≤ 5 ms p95 |
| Snapshot atomic rewrite | ≤ 20 ms p95 |
| Schema validation | ≤ 2 ms p95 per event |
| Terminal dual-write to `tools/metrics/` | ≤ 200 ms p95 |

Baselines live at `tools/metrics/baselines/workflow.json`.

## Agentic orchestrator event extension (009)

The agentic workflow orchestrator (spec `009`) extends the `WorkflowEvent` union
in `tools/governance/specs/workflow/workflow_run.script.ts` with additive members.
These events follow the same NDJSON substrate, retention, and validation
discipline as all other workflow events.

The extension schema is defined as code at:

```
tools/governance/specs/workflow/workflow_run.script.ts  (Awo009Event union members)
```

The canonical event base (`WorkflowEventBase`) remains the authority for the
shared fields. Extension event types include:

| Event type | Purpose |
| ---------- | ------- |
| `stage.entered` / `stage.exited` | Stage lifecycle |
| `stage.retried` / `stage.escalated` | Retry and escalation |
| `transition.auto` / `transition.gated` | State machine transitions |
| `task.invoked` / `task.completed` | Command execution (telemetry) |
| `decision.requested` / `decision.defaulted` / `decision.answered` | Operator decisions |
| `sandbox.violation` | Sandbox enforcement (M4) |
| `continuity.violation` | Schema drift detection |
| `schema.violation` | Payload validation failure |
| `shutdown.requested` / `shutdown.completed` | Graceful shutdown |
| `run.summary` | Terminal outcome summary |

Each type extends `WorkflowEventBase` with stage-scoped or run-scoped fields
per its schema in the implementation home. Consumers import the `WorkflowEvent`
union from the stable code path; this section is notice of the extension
contract.

## What this guide deliberately does not cover

- In-process structured logging (`getLogger`, `withContext`,
  `repositoryStmts`). See [`LOGGING_GUIDE.md`](LOGGING_GUIDE.md).
- Workflow phase order or SDD lifecycle.
  See [`SDD_WORKFLOW_GUIDE.md`](SDD_WORKFLOW_GUIDE.md).
- Repository safety checks (gitleaks, dependency CVEs, Electrobun config
  AST). See [`SECURITY_GUIDE.md`](SECURITY_GUIDE.md).
- OpenTelemetry / distributed tracing. Deferred unconditionally; revisit
  when distributed tracing is actually needed.
- LangChain / LangGraph / LangSmith adoption. Deferred unconditionally.
