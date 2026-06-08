<!-- markdownlint-disable-file -->

# Plan — `009-agentic-workflow-orchestrator`

**Spec:** [`spec.md`](./spec.md) — requirements AWO-1 … AWO-13.
**Authority:** normative truth lives in [`assets/guides/`](../../guides/) +
[`assets/catalog/`](../../catalog/) + executables per
[`DOC_AUTHORITY.md`](../../guides/DOC_AUTHORITY.md). This plan is pointer-only
per [`SDD_WORKFLOW_GUIDE.md` § Normative quartet](../../guides/SDD_WORKFLOW_GUIDE.md#normative-quartet);
EARS text is not copied here — tasks reference requirement IDs.

**Scope posture:** the original spec was over-scoped. This plan ships **one
spec across five PRs**, substrate-first. The MVP is a contracts-and-storage
walking skeleton; no state-machine behavior until M1. AWO-6 / AWO-8 / AWO-11
are **Post-MVP** and do not block the first PRs.

## Implementation home

All slices **extend the existing workflow tree in place** at
`tools/governance/specs/workflow/` — the `spec` domain of
[`TOOLS_GUIDE.md`](../../guides/TOOLS_GUIDE.md), where the shipped code
already lives. `mise run spec workflow …` stays the stable entry point.
Promotion to Bun workspace packages (`packages/workflow-core`,
`packages/workflow-runtime`) is an **optional, trigger-gated** later step,
not part of this feature — see
[`spec.md` § Implementation home & package boundary](./spec.md#implementation-home--package-boundary).
The `contracts/` schemas are **spikes**; they are copied into the
implementation home and the spec then links to that stable path (no
duplicates).

### Reuse the shipped workflow code — do not fork

[`workflow_run.script.ts`](../../../tools/governance/specs/workflow/workflow_run.script.ts)
already exports the `WorkflowEvent` union, the `WorkflowRunWriter` class
(sibling-flat NDJSON per [`OBSERVABILITY_GUIDE.md`](../../guides/OBSERVABILITY_GUIDE.md)),
and emits `phase_decided` / `handoff_written` / `manifest_emitted` /
`dispatch_invoked`. [`orchestrated_handoff.script.ts`](../../../tools/governance/specs/workflow/orchestrated_handoff.script.ts)
already exports `detectPhase()` (the SDD transition table). Therefore:

- **AWO-12 / AWO-4** — *extend* the existing `WorkflowEvent` union and reuse `WorkflowRunWriter`; do **not** invent a second NDJSON writer or event type set.
- **AWO-1 / AWO-12** — *compose* `detectPhase()` as the Layer-B conformance input and as an M1 progression guard; do **not** re-derive the phase order in a second detector.
- **AWO-9** — the `command:` invoker is new, but the `runs_cli` read surface is reused unchanged.

## Slice → requirements → PR → guide deliverables

| Slice | Requirements | PR | Primary artifacts (under `tools/governance/specs/workflow/`) | Guide / catalog deliverables |
| ----- | ------------ | -- | ------------------------------------------------------------ | ---------------------------- |
| **MVP** | AWO-2, AWO-9, AWO-10, AWO-4, AWO-12 | PR 1 | `schemas/*.schema.ts` (envelope, profile, state); **extend** `workflow_run.script.ts` `WorkflowEvent` union (not a new writer); `profile_loader.script.ts`; `command_invoker.script.ts`; `conformance.script.spec.ts` (Layer B, composes `detectPhase()`) | Promote envelope/event extension into [`OBSERVABILITY_GUIDE.md`](../../guides/OBSERVABILITY_GUIDE.md); add `WORKFLOW_GUIDE.md` stub (or SDD subsection) for profile shape; register `workflows:` in `assets/catalog/catalog.yaml`; commit `assets/catalog/workflows/default.yaml` replaying SDD phase order |
| **M1** | AWO-1, AWO-5, AWO-13 | PR 2 | `machine.ts` (xstate definition + guards); `orchestrator.script.ts` (actor); seam dispatcher; shutdown trap | SDD § auto-progression + seam dispatch; [`SECURITY_GUIDE.md`](../../guides/SECURITY_GUIDE.md) § graceful shutdown |
| **M2** | AWO-3, AWO-7 | PR 3 | intervention/dedup logic; `memory.script.ts` (stage-scoped + shared) | `WORKFLOW_GUIDE.md` § memory model + retention |
| **M3** *(Post-MVP)* | AWO-6 | PR 4 | `providers/*` command bindings; CI-status gate | [`CI_GUIDE.md`](../../guides/CI_GUIDE.md) § orchestrator PR/CI bindings |
| **M4** *(Post-MVP)* | AWO-8, AWO-11 | PR 5+ | retrospective stage; sandbox descriptor + dispatcher enforcement | OBSERVABILITY (metrics archive); SECURITY § worker sandbox |

Each slice **ends with** `mise run spec gate` (or `mise run spec ready
<featureDir> --key <key>` once a catalog key exists) **plus the guide-patch
task** for that slice. Tasks in `tasks.md` are prefixed `MVP-`, `M1-`, … so a
slice is independently shippable and green.

## Test enforcement (per [`spec.md` § Test enforcement layers](./spec.md#test-enforcement-layers-not-a-product-catalog-tag))

- **Layer A** — `bun test --config /dev/null tools/governance/specs/workflow/`; fixtures in `tools/__tests__/fixtures/workflow/` (synthetic feature-dir stubs, never live `assets/specs/NNN-*`).
- **Layer B** — integration test loads `assets/catalog/workflows/default.yaml`, asserts stage order matches the SDD guide phase list (AWO-12).
- **Layer C** — deferred until the operator CLI is shipped product behavior.

## Traceability

| Requirement | Slice | Primary artifact |
| ----------- | ----- | ---------------- |
| AWO-2  | MVP | `schemas/envelope.schema.ts`; `envelope.script.spec.ts` |
| AWO-9  | MVP | `command_invoker.script.ts` (allowlist); ast-grep rule banning inline spawn; `command_invoker.script.spec.ts` |
| AWO-10 | MVP | `profile_loader.script.ts`; `schemas/profile.schema.ts`; `catalog.yaml` `workflows:` |
| AWO-4  | MVP | reuse/extend `workflow_run.script.ts` `WorkflowRunWriter` (NDJSON + snapshot + dual-write); resume AC fully exercised in M1 |
| AWO-12 | MVP | `conformance.script.spec.ts` (Layer B); event extension promoted to OBSERVABILITY guide |
| AWO-1  | M1 | `machine.ts` + guards; progression integration test |
| AWO-5  | M1 | seam dispatcher; no-inline-`speckit.*` static check |
| AWO-13 | M1 | shutdown trap; SIGINT/resume integration test |
| AWO-3  | M2 | intervention minimizer; dedup-vs-memory test |
| AWO-7  | M2 | `memory.script.ts`; cross-stage memory test |
| AWO-6  | M3 | `providers/*`; CI-gate policy test with stubbed status |
| AWO-8  | M4 | retrospective stage; catalog `agent_memory.yaml` append test |
| AWO-11 | M4 | sandbox descriptor + dispatcher enforcement; violation-injection tests |

## Out of this plan

- No `packages/workflow-*` directories created in this pass (forward-looking only).
- No production `src/` edits; renderer MUST NOT import the workflow runtime in v1.
- No Gherkin for orchestrator meta-behavior (Layer C deferred).
- No constitution version bump.
