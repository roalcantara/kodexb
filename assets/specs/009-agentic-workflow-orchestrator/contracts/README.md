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

| File | Purpose | Bound to |
| ---- | ------- | -------- |
| [`envelope.schema.ts`](envelope.schema.ts) | Stage-worker outcome envelope | AWO-2 |
| [`profile.schema.ts`](profile.schema.ts) | Workflow profile (unified `command:` keyword, sandbox, retry, memory, providers, shutdown) | AWO-9, AWO-10, AWO-11, AWO-7, AWO-13 |
| [`events.schema.ts`](events.schema.ts) | Orchestrator event-type extension over the canonical event base | AWO-4, AWO-9.4, AWO-11.4, AWO-12.2, AWO-13 |
| [`state.schema.ts`](state.schema.ts) | Persisted xstate snapshot envelope (run-state file) | AWO-1, AWO-4, AWO-13 |

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
