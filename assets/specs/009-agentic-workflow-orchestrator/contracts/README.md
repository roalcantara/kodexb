<!-- markdownlint-disable-file -->

# Contracts — `009-agentic-workflow-orchestrator`

> **Status: ephemeral spike.** These files are specification fixtures that
> pin the field shape, required-vs-optional, and inter-schema relationships
> while the spec is in flight. They carry **no authority** and must not be
> imported by runtime code from this path. Per
> [`DOC_AUTHORITY.md`](../../../guides/DOC_AUTHORITY.md), `assets/specs/NNN-*`
> is not a stable API.
>
> **Promotion rule:** on the MVP slice, these schemas are copied into the
> existing implementation home `tools/governance/specs/workflow/schemas/`
> (the event extension instead extends the `WorkflowEvent` union already in
> `tools/governance/specs/workflow/workflow_run.script.ts`); `mise run
> catalog validate` and the runtime import them from that stable path. This
> folder then holds **links**, not duplicates, and may be deleted once
> promotion lands. See [`../plan.md`](../plan.md) and
> [`../spec.md` § Implementation home & package boundary](../spec.md#implementation-home--package-boundary).

The stubs below describe the intended shape so the spec, the eventual
runtime, and the tests share one reference while building.

| File | Purpose | Bound to | Promoted to |
| ---- | ------- | -------- | ----------- |
| [`envelope.schema.ts`](envelope.schema.ts) | Stage-worker outcome envelope | AWO-2 | — |
| [`profile.schema.ts`](profile.schema.ts) | Workflow profile (unified `command:`, `execution_policy`, optional sandbox, retry, memory, providers, shutdown) | AWO-9, AWO-10, AWO-11, AWO-7, AWO-13 | — |
| [`events.schema.ts`](events.schema.ts) | Orchestrator event-type extension over the canonical event base | AWO-4, AWO-9.4, AWO-11.4, AWO-12.2, AWO-13 | — |
| [`state.schema.ts`](state.schema.ts) | Persisted xstate snapshot envelope (run-state file) | AWO-1, AWO-4, AWO-13 | [`tools/governance/specs/workflow/schemas/state.schema.ts`](../../../tools/governance/specs/workflow/schemas/state.schema.ts) ✓ |

## Storage layout

See [`../data-model.md`](../data-model.md) for the full storage layout, file
locations, and lifecycle (live tail vs durable archive).

## Versioning

Every schema carries a top-level `schema_version` field. Bumps follow:

- **Patch** — additive optional fields. No runtime change required.
- **Minor** — additive required fields with a documented default. Migration script lives next to the schema.
- **Major** — breaking field rename, removal, or type change. Requires a profile + run-state migration path.

The canonical event base owned by [`OBSERVABILITY_GUIDE.md`](../../../guides/OBSERVABILITY_GUIDE.md)
is the parent schema for `events.schema.ts`. Bumping the base without
bumping the orchestrator extension triggers the `continuity.violation`
event defined in AWO-12.4.

## Tool-agnostic engine (review 002)

`execution_policy.allowed_prefixes` is **profile-owned data**. The schema
module carries **no** `DEFAULT_COMMAND_ALLOWLIST` and no `mise`/`hk`/`bun`/`gh`
prefix constants — the L1 engine is toolchain-agnostic. Kb's actual prefix
values live only in the `assets/catalog/workflows/default.yaml` example
(documented in the `WORKFLOW_GUIDE.md` stub) and in test fixtures under
`tools/__tests__/fixtures/workflow/`. The `sandbox` descriptor shape stays in
the schema but is an **optional** stage field; enforcement is an
adapter/M4 concern.
