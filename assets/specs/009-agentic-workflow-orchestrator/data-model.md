<!-- markdownlint-disable-file -->

# Data model — `009-agentic-workflow-orchestrator`

Companion to [`spec.md`](spec.md). Defines storage layout, file lifecycles,
and the relationship between live and durable run records. Canonical
sources of truth: [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md)
for the event substrate, [`SECURITY_GUIDE.md`](../../guides/SECURITY_GUIDE.md)
for repository safety primitives, [`WORKFLOW_SDD_GUIDE.md`](../../guides/WORKFLOW_SDD_GUIDE.md)
for the SDD phase order.

## Storage layout (sibling-flat)

All artifacts for a run share the `<run_id>` stem inside a daily folder.

| Concern | Layer | Path | Lifecycle | Owner AC |
| ------- | ----- | ---- | --------- | -------- |
| Workflow profile (definition) | catalog (ARE) | `assets/catalog/workflows/<name>.yaml` | versioned in git | AWO-10 |
| Profile index | catalog | `assets/catalog/catalog.yaml` | versioned in git | AWO-10 |
| Profile schema (code) | governance/spec (pure) | `tools/governance/specs/workflow/schemas/profile.schema.ts` | versioned in git | AWO-10.1 |
| Envelope schema (code) | governance/spec (pure) | `tools/governance/specs/workflow/schemas/envelope.schema.ts` | versioned in git | AWO-2.1 |
| Event-extension schema (code) | governance/spec (pure) | extends existing `tools/governance/specs/workflow/workflow_run.script.ts` `WorkflowEvent` union | versioned in git | AWO-12.2 |
| xstate machine (definition) | governance/spec (pure) | `tools/governance/specs/workflow/machine.ts` | versioned in git | AWO-1 |
| Orchestrator actor / runtime | governance/spec (shell) | `tools/governance/specs/workflow/orchestrator.script.ts` | versioned in git | AWO-5 |
| Command-invoker adapter | governance/spec (shell) | `tools/governance/specs/workflow/command_invoker.script.ts` | versioned in git | AWO-9.1 |
| Live snapshot | scratch | `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.state.json` | atomic rewrite on each transition; pruned after retention | AWO-4.1 |
| Live event tail | scratch | `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.ndjson` | O_APPEND; pruned after retention | AWO-4.1, AWO-9.4 |
| Worker outcome envelope | scratch | `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.envelope.<stage>.json` | written by the worker at a seam; read + `Value.Check()`'d by the dispatcher | AWO-5.1, AWO-2.1 |
| Run-shared decisions | scratch | `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.shared.json` | append within run; survives resume | AWO-7.2, AWO-3.3 |
| Per-stage memory | scratch | `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.memory.<stage>.json` | created on stage start; pruned with run | AWO-7.1 |
| Event archive (durable) | metrics (DONE/DID) | `tools/metrics/workflow-runs/<YYYY-MM-DD>/<run_id>.ndjson` | dual-written at terminal stage; long retention | AWO-4.4 |
| Retrospective artifact | metrics | `tools/metrics/workflow-runs/<YYYY-MM-DD>/<run_id>.retro.md` | written at retrospective stage | AWO-8.1 |
| Cross-run pinned guidance | catalog | `assets/catalog/agent_memory.yaml` | created/appended by retrospective; versioned in git | AWO-7.4, AWO-8.3, AWO-8.4 |
| Perf baselines | metrics | `tools/metrics/baselines/workflow.json` | versioned in git | NFRs |

## File lifecycle

```
stage transition
  → snapshot atomic rewrite to <run_id>.state.json (rename from .tmp)
  → event O_APPEND to <run_id>.ndjson

terminal stage
  → dual-write <run_id>.ndjson to tools/metrics/workflow-runs/<date>/
  → retrospective writes <run_id>.retro.md to tools/metrics/workflow-runs/<date>/
  → retrospective appends new insights to assets/catalog/agent_memory.yaml

retention prune (tmp)
  → tmp/.../<run_id>.* removed after memory.retention.tmp_days

durable archive
  → tools/metrics/workflow-runs/ retained for memory.retention.durable_days
  → pruned only by operator task, never by `mise run spec runs prune`
```

## Why sibling-flat

The `runs` CLI defined in [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md#read-side-cli)
locates a run by globbing `<run_id>.*` within the daily folder. Sibling-flat
lets all run artifacts (events, state, shared, memory, retro) share one
discovery path without nested directories. New artifact types added by
future work follow the same pattern: `<run_id>.<facet>.<ext>`.

## Why dual-write at terminal

Live tail at `tmp/` keeps the in-flight reader experience simple — one
canonical stream while the run is active. At terminal stage, the events
file is dual-written to `tools/metrics/` so the run record locks into
the durable layer before retention pruning touches `tmp/`. This
preserves the live tail's tooling (CLI, downstream agents, observers)
and adds a stable path for analytics built on `tools/metrics/`.

## Concurrency rules

- A single workflow run owns a single `<run_id>` stem within a daily folder.
- Snapshot writes are atomic via rename (`<run_id>.state.json.tmp` → `<run_id>.state.json`).
- Event appends are O_APPEND on a single writer; multi-process concurrent appends are out of scope for v1 (sequential stage progression invariant; teardown actors are intra-process per AWO-5 AC5).

## Retention

Inherits the policy table in [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md#retention).
Profile knobs override defaults:

- `memory.retention.tmp_days` (default 30) — scratch layer pruning.
- `memory.retention.durable_days` (default 365) — archive retention.

## Schema version compatibility

| Schema | Owner | Bump policy |
| ------ | ----- | ----------- |
| `EnvelopeSchema` | this spec | Patch / minor / major per [`contracts/README.md`](contracts/README.md) |
| `ProfileSchema` | this spec | Same |
| `Awo009Event` | this spec | Same; must remain a strict extension of the canonical event base |
| `PersistedRunState` | this spec | Same; xstate snapshot opacity preserved |
| `WorkflowEventBase` | [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md) | If bumped without an extension catch-up, AWO-12.4 emits `continuity.violation` and blocks terminal success |

## Engine vs catalog separation (review 002)

Run state (this file's `tmp/` + `tools/metrics/` paths) is **engine/runtime**
concern; it carries no toolchain identifiers. Command prefixes and toolchain
bindings live exclusively in **catalog** profile data
(`assets/catalog/workflows/*.yaml` → `execution_policy.allowed_prefixes`,
`command:` strings). There is no new coupling between the two: the engine
reads opaque command descriptors and writes opaque run records; only the L2
adapter and L3 catalog know kb's `mise`/`hk`/`bun` vocabulary.

## Sandbox descriptor (AWO-11) — optional field

A stage MAY declare an **optional** `sandbox:` block per
[`profile.schema.ts`](contracts/profile.schema.ts) (MVP profiles may omit it;
enforcement lands in M4):

```yaml
sandbox:
  tool_allowlist: ["read_file", "write_file", "mise.run"]
  fs_scope:
    allow_roots: ["${WORKSPACE_ROOT}", "${TMP}/workflow-runs"]
    deny: ["${WORKSPACE_ROOT}/.env", "${WORKSPACE_ROOT}/.git/objects"]
  secret_handling: "redacted"
  network: "offline"
```

`acknowledged_unsafe: true` is required for any descriptor declaring
`secret_handling: passthrough`. Profile load fails fast without it.
