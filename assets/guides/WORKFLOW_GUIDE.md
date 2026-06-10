<!-- markdownlint-disable-file -->

# Workflow guide — kb profile authoring

Canonical source for **authoring workflow profiles** in `assets/catalog/workflows/`.
Governs profile shape, `execution_policy` semantics, and the kb profile-authoring
convention (`mise` = verbs / `hk` = events). This is L3 catalog guidance, not an
engine API — see [`SDD_WORKFLOW_GUIDE.md`](SDD_WORKFLOW_GUIDE.md) for the SDD
workflow lifecycle and [`OBSERVABILITY_GUIDE.md`](OBSERVABILITY_GUIDE.md) for the
event substrate.

## Profile shape

Profiles are YAML files under `assets/catalog/workflows/<name>.yaml`, validated
at load via TypeBox (`Value.Check(ProfileSchema, …)`). The schema is defined at:

```
tools/governance/specs/workflow/schemas/profile.schema.ts
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

## Sandbox (optional)

The `sandbox` block is optional on a stage. MVP profiles may omit it; enforcement
lands in M4. See [`SECURITY_GUIDE.md`](SECURITY_GUIDE.md) for sandbox semantics.
