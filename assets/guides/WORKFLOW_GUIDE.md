<!-- markdownlint-disable-file -->

# Workflow guide — kb profile authoring

Canonical source for **authoring workflow profiles** in `assets/catalog/workflows/`.
Governs profile shape, `execution_policy` semantics, and the kb profile-authoring
convention (`mise` = verbs / `hk` = events). This is L3 catalog guidance, not an
engine API — see [`SDD_WORKFLOW_GUIDE.md`](SDD_WORKFLOW_GUIDE.md) for the SDD
workflow lifecycle and [`OBSERVABILITY_GUIDE.md`](OBSERVABILITY_GUIDE.md) for the
event substrate.

## Package layout

The workflow engine is split into two Bun workspace packages:

| Package | Path | Layer | Owns |
| --- | --- | --- | --- |
| `@kb/workflow-core` | `packages/workflow-core/` | L1 (pure) | schemas, machine, evidence, intervention, snapshot, sandbox_policy, execution_policy |
| `@kb/workflow-runtime` | `packages/workflow-runtime/` | L2 (runtime) | orchestrator, invokers, persistence, profile_loader, memory, retro, providers |

Governance CLI seams (conformance, crossref, review_handoff, policy plumbing) stay at
`tools/governance/specs/workflow/` and import from the packages.

```typescript
// Import core types and pure functions
import { ProfileSchema, workflowMachine, validateCommandPrefix } from '@kb/workflow-core'

// Import runtime artifacts
import { loadProfile, Orchestrator, WorkflowRunWriter } from '@kb/workflow-runtime'
```

## Profile shape

Profiles are YAML files under `assets/catalog/workflows/<name>.yaml`, validated
at load via TypeBox (`Value.Check(ProfileSchema, …)`). The schema is defined at:

```
packages/workflow-core/src/schemas/profile.schema.ts
```

### Required top-level fields

| Field | Type | Description |
| ----- | ---- | ----------- |
| `schema_version` | string | Must be `009.1.0` |
| `name` | string | Profile name |
| `execution_policy` | object | Command prefix allowlist (see below) |
| `stages` | array[StageDefinition] | Stage graph |
| `transitions` | array[StageTransition] | Allowed state transitions |
| `terminal` | array[string] | Stage ids whose DONE ends the workflow |
| `default_retry` | RetryPolicy | Default retry behavior |
| `memory` | MemoryPolicy | Memory conflict and retention |
| `providers` | ProviderBindings | Provider command bindings |
| `shutdown` | ShutdownPolicy | Graceful shutdown knobs |

### execution_policy

The `execution_policy` block defines which command prefixes are permitted:

```yaml
execution_policy:
  allowed_prefixes:
    - "mise run"
    - "hk check"
    - "bun run"
```

- `allowed_prefixes` is required with at least 1 entry.
- Prefixes are whitespace-normalized; a command is matched if its first tokens
  `startsWith` one of the allowed prefixes at a word boundary.
- The engine (L1) carries **no** default prefixes — values are profile data only.
- The L2 adapter (`command_invoker.script.ts`) enforces this policy before any
  `Bun.spawn` call; a disallowed prefix produces a diagnostic and the stage is
  not dispatched.

### kb authoring convention: `mise = verbs / hk = events`

| Tool | Convention |
| ---- | ---------- |
| `mise run` | SDD lifecycle verbs (`spec`, `lint`, `audit`, `gate`) |
| `hk check` | Quality-gate checking (pre-commit, CI) |
| `bun run` | Scripted tooling (`bun test`, `bun run <script>`) |

## Stage definitions

Each stage entry may declare:

```yaml
stages:
  - id: specify
    worker: primary
    evidence:
      - "mise run spec lint"
    retry:
      max_attempts: 3
```

## Stage graph and stage order

The `default.yaml` profile stage graph **must** match the order produced by
`detectPhase()` in `orchestrated_handoff.script.ts`:

```
specify → plan → analyze-plan → tasks → analyze-tasks → handoff-generate → implement → review
```

The Layer-B conformance test (`conformance.script.spec.ts`) asserts that the
profile's stage-id sequence, filtered to the `detectPhase()` order, is a
subsequence match (no reordering, no omissions; interleaving allowed).

## Memory model and retention

The orchestrator persists two kinds of agent memory for each run, stored as
JSON files in the run's daily directory under `tmp/workflow-runs/`.

### Stage-scoped memory

Created on first access when a stage starts. Isolated per stage; a stage on its
second attempt reads the same file:

```
tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.memory.<stage>.json
```

### Shared (cross-stage) memory

Persists across the full run so downstream stages see prior decisions. Written
alongside every xstate snapshot:

```
tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.shared.json
```

### Conflict policy

The profile's `memory.conflict` field controls how the orchestrator handles
conflicting values between existing and incoming memory:

| Policy | Behaviour |
| ------ | --------- |
| `prefer_latest` | Incoming overwrites existing silently — no pause |
| `prompt_user` | Conflict blocks the merge; operator must resolve |
| `block` | Conflict fails the operation with a diagnostic |

Default (`prompt_user`) is the safest default for human-supervised runs.

### Decision events

Every resolved or defaulted decision emits an NDJSON event of type
`decision.answered` or `decision.defaulted`, carrying `question_id`, `source`,
and `rationale`. These events are part of the `WorkflowEvent` union and are
appended to `<run_id>.ndjson` via `WorkflowRunWriter.emit()`.

### Retention

Profile `memory.retention` controls how long artifacts live:

```yaml
memory:
  retention:
    tmp_days: 30
    durable_days: 365
```

- `tmp_days`: scratch files under `tmp/workflow-runs/` are pruned after this
  many days by `mise run spec workflow prune` (or the automatic best-effort
  prune during `run.summary`).
- `durable_days`: archive copies in `tools/metrics/workflow-runs/` are retained
  for this period; pruning is operator-initiated only.

## Sandbox (optional)

The `sandbox` block is optional on a stage. MVP profiles may omit it; enforcement
lands in M4. See [`SECURITY_GUIDE.md`](SECURITY_GUIDE.md) for sandbox semantics.

## Resume

The canonical resume command is `mise run spec workflow resume`. The bare
`mise run spec resume` is deprecated and redirects to `spec workflow resume`.

### Auto-default

When `--run-id` is omitted and exactly one active `.state.json` exists under
`tmp/workflow-runs/<date>/`, the orchestrator defaults to that run. When
multiple active runs exist, the command exits 2 and prints candidates.

### Answers and approvals

```
mise run spec workflow resume --answer q1=value --approve review
```

Answers are written to run-shared memory (`<run_id>.shared.json`) before the
orchestrator resumes. Approved stages skip the `human_gated` guard.

### Idempotency

Envelopes that carry an `idempotency_key` are checked against the run NDJSON
tail. If the key already appears in a completed task, the stage is skipped
rather than re-dispatched.
