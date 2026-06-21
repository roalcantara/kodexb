<!-- markdownlint-disable-file -->

# Plan — `009-agentic-workflow-orchestrator`

**Spec:** [`spec.md`](./spec.md) — requirements AWO-1 … AWO-13.
**Authority:** normative truth lives in [`assets/guides/`](../../guides/) +
[`assets/catalog/`](../../catalog/) + executables per
[`DOC_AUTHORITY.md`](../../guides/DOC_AUTHORITY.md). This plan is pointer-only
per [`WORKFLOW_SDD_GUIDE.md` § Normative quartet](../../guides/WORKFLOW_SDD_GUIDE.md#normative-quartet);
EARS text is not copied here — tasks reference requirement IDs.

**Scope posture:** the original spec was over-scoped. This plan ships **one
spec across five PRs**, substrate-first. The MVP is a contracts-and-storage
walking skeleton; no state-machine behavior until M1. AWO-6 / AWO-8 / AWO-11
are **Post-MVP** and do not block the first PRs.

## Summary

Add an agentic orchestrator that advances the SDD workflow as a deterministic
xstate machine, pausing only for real decisions and driving (eventually) to
CI-green PR completion. It **extends the shipped workflow tooling** at
`tools/governance/specs/workflow/` — reusing `WorkflowRunWriter`,
the `WorkflowEvent` union, and `detectPhase()` — rather than building a parallel
engine. Progression authority (per [Clarifications](./spec.md#clarifications)):
a worker reports a `DONE` **claim**; the transition fires only when status is
`DONE` **and** declared evidence (artifact-gate / `detectPhase()` / checklist
markers, or a bound `command:`) verifies. The MVP (PR 1) ships only the
substrate: TypeBox schemas, the `Executor` adapter (profile-driven prefix
policy), the profile loader, persistence (extending the existing NDJSON
writer), and a Layer-B guide-conformance test.

The engine is **tool-agnostic** (review 002): it carries no `mise`/`hk`/`bun`/`gh`
defaults. Permitted command prefixes are profile data
(`execution_policy.allowed_prefixes`); kb supplies them only in
`assets/catalog/workflows/default.yaml`.

## Architecture layers

| Layer | Owns | Toolchain-aware? | Home (this feature) |
| ----- | ---- | ---------------- | ------------------- |
| **L1 — Engine** | stage graph, xstate machine, guards, envelope validation, evidence eval; calls `Executor.run(spec)` | **No** — no `mise`/`hk`/`bun`/`gh`/`speckit` identifiers, defaults, or type names | pure modules in `tools/governance/specs/workflow/` (promotable to `packages/workflow-core`) |
| **L2 — Runtime adapter** | `Executor` impl: subprocess (`Bun.spawn` only here), cwd/env/timeout, applies `execution_policy`, emits telemetry | kb impl, profile-driven | `command_invoker.script.ts`, `orchestrator.script.ts` |
| **L3 — Profile / catalog** | `command:` strings, `execution_policy.allowed_prefixes`, stage graph | **Yes** (data) | `assets/catalog/workflows/*.yaml`, `profile_loader.script.ts` |
| **L4 — CLI** | operator entry, resume naming | kb | `tools/bin/spec.script.ts`, `mise.toml` |

## Feature deltas

| Topic | Delta |
| ----- | ----- |
| RPC | None — no `src/shell` or renderer surface in v1 (renderer MUST NOT import the runtime) |
| DB | None — no `bun:sqlite` tables; run state is NDJSON + snapshot files per WORKFLOW_OBSERVABILITY_GUIDE |
| Catalog | New `workflows:` section in `assets/catalog/catalog.yaml`; new `assets/catalog/workflows/default.yaml` (MVP) |
| AWO-9 | Executor port (L1) + profile-owned `execution_policy` (L3); single L2 adapter enforces prefixes — **not** a `mise`/`hk`/`bun` allowlist baked into core |
| Tooling | Extend `tools/governance/specs/workflow/`: `schemas/*.schema.ts`, `profile_loader.script.ts`, `command_invoker.script.ts` (Executor impl), `machine.ts` (M1), `orchestrator.script.ts` (M1); extend the `WorkflowEvent` union |
| Dependency | Add `xstate` (runtime) |
| E2e | None — orchestrator is infrastructure; enforced by Layer A/B (tools specs + profile replay), Gherkin/Layer C deferred |
| Guides | Promote schema/profile/persistence prose into OBSERVABILITY/SDD + new `WORKFLOW_RUNTIME_GUIDE.md` stub, per the spec's guide-promotion checklist |

## Technical Context

**Language/Version**: TypeScript on Bun (current repo toolchain).
**Primary Dependencies**: `xstate` (new), TypeBox (existing), existing `tools/governance/specs/workflow/` modules.
**Storage**: NDJSON event tail + JSON snapshot under `tmp/workflow-runs/<date>/`; durable archive under `tools/metrics/workflow-runs/`; profiles in `assets/catalog/workflows/`. No SQLite.
**Testing**: `bun test --config /dev/null tools/governance/specs/workflow/` (Layer A); profile-replay integration test (Layer B).
**Target Platform**: local CLI tooling via `mise run spec workflow …` (macOS + Linux); no desktop bundle.
**Project Type**: repo governance/orchestration tooling (not `src/` product code).
**Performance Goals**: per spec NFRs — transition overhead ≤ 50 ms p95; profile load ≤ 100 ms p95; event append ≤ 5 ms p95; cold resume ≤ 250 ms p95.
**Constraints**: layered engine (L1 pure, no toolchain identifiers; `Bun.spawn` only in the L2 adapter); prefixes from profile `execution_policy` (no engine defaults); offline-capable (opencode dispatch optional).
**Scale/Scope**: single-repo, sequential stage progression (v1); one active run per `run_id`.

No unresolved `NEEDS CLARIFICATION` — the three open design questions were resolved in `/speckit-clarify` (progression authority, envelope transport, input mechanism). Remaining tech choices are captured in [`research.md`](./research.md).

## Constitution Check

*GATE: re-checked after Phase 1 design — PASS (no violations; Complexity Tracking empty).*

| Principle | Status | Note |
| --------- | ------ | ---- |
| I. Keyboard-first / local-first | **PASS** | CLI tooling; offline-capable; opencode dispatch optional, never required |
| II. FCIS (NON-NEGOTIABLE) | **PASS** | Code lives in `tools/`, outside the `src/` dependency-cruiser scope, but voluntarily keeps the pure-machine / shell-actor split; renderer never imports the runtime |
| III. Source-of-truth honesty (NON-NEGOTIABLE) | **PASS** | Envelope `DONE` is a claim; transition requires evidence — no success reported without verification. Profiles = ARE (catalog); runs = DONE/DID (metrics) |
| IV. TypeBox-only | **PASS** | Envelope/profile/event/state schemas are TypeBox; no Zod |
| V. Test-first & evidence (NON-NEGOTIABLE) | **PASS** | Co-located `*.script.spec.ts` (Layer A); every AC carries Measure + Evidence; no mocking (synthetic fixture feature-dirs, real file I/O) |
| VI. Conventions / naming | **PASS** | `snake_case.script.ts`; one artifact per file; no magic strings (allowlist + retry knobs are named) |
| VII. Renderer & design system | **PASS (N/A)** | No renderer in v1 |
| VIII. Observability | **PASS** | Reuses the NDJSON event substrate + `WorkflowRunWriter`; `console.*` not used in `src/` (code is in `tools/`) |
| IX. Electrobun security & handoff-scrub | **PASS (preserve)** | Orchestrator has no Electrobun surface, but seam dispatch reuses `handoff-generate`, which MUST keep its `spec handoff-scrub` binding (Principle IX.3); M1 dispatcher must not bypass it |

## Project Structure

### Documentation (this feature)

```text
assets/specs/009-agentic-workflow-orchestrator/
├── spec.md          # Normative — AWO-1..AWO-13
├── plan.md          # This file
├── tasks.md         # /speckit-tasks (next)
├── handoff.md       # /speckit-tasks (next)
├── research.md      # Phase 0 — tech-choice decisions
├── data-model.md    # Phase 1 — storage layout + schemas (complete)
├── contracts/       # Phase 1 — TypeBox spikes (envelope/profile/events/state)
└── review/001/      # guides-first rework artifacts (historical)
```

### Source Code (repository)

```text
tools/governance/specs/workflow/        # EXISTING tree — extend in place
├── workflow_run.script.ts              # extend WorkflowEvent union + reuse WorkflowRunWriter
├── orchestrated_handoff.script.ts      # reuse detectPhase()
├── handoff_generate.script.ts          # reuse for seam dispatch (keeps handoff-scrub)
├── runs_cli.script.ts                  # reuse read surface unchanged
├── schemas/                            # NEW — promoted from contracts/ spikes
│   ├── envelope.schema.ts
│   ├── profile.schema.ts
│   └── state.schema.ts
├── profile_loader.script.ts            # NEW (MVP)
├── command_invoker.script.ts           # NEW (MVP)
├── machine.ts                          # NEW (M1) — pure xstate definition + guards
└── orchestrator.script.ts              # NEW (M1) — actor, dispatch, shutdown

assets/catalog/
├── catalog.yaml                        # add workflows: section (MVP)
└── workflows/default.yaml              # NEW (MVP) — replays SDD phase order

tools/__tests__/fixtures/workflow/      # NEW — synthetic feature-dir stubs
tools/metrics/{workflow-runs,baselines/workflow.json}   # durable archive + perf baselines
```

**Structure Decision**: extend the existing `spec`-domain workflow tree in
place (TOOLS_GUIDE governance/spec); no `packages/` move, no `src/` changes.

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
(sibling-flat NDJSON per [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md)),
and emits `phase_decided` / `handoff_written` / `manifest_emitted` /
`dispatch_invoked`. [`orchestrated_handoff.script.ts`](../../../tools/governance/specs/workflow/orchestrated_handoff.script.ts)
already exports `detectPhase()` (the SDD transition table). Therefore:

- **AWO-12 / AWO-4** — *extend* the existing `WorkflowEvent` union and reuse `WorkflowRunWriter`; do **not** invent a second NDJSON writer or event type set.
- **AWO-1 / AWO-12** — *compose* `detectPhase()` as the Layer-B conformance input and as an M1 progression guard; do **not** re-derive the phase order in a second detector.
- **AWO-9** — the `Executor` adapter (L2) is new and owns the profile prefix policy; the engine (L1) embeds no toolchain defaults. The `runs_cli` read surface is reused unchanged.

## Slice → requirements → PR → guide deliverables

| Slice | Requirements | PR | Task families | Primary artifacts (under `tools/governance/specs/workflow/`) | Guide / catalog deliverables |
| ----- | ------------ | -- | ------------- | ------------------------------------------------------------ | ---------------------------- |
| **MVP** | AWO-2, AWO-9, AWO-10, AWO-4, AWO-12 | PR 1 | ENGINE, ADAPTER, PROFILE, CONFORMANCE | `schemas/*.schema.ts` (envelope, profile **with `execution_policy`, no `DEFAULT_COMMAND_ALLOWLIST`**, state); **extend** `workflow_run.script.ts` `WorkflowEvent` union (not a new writer); `profile_loader.script.ts` (validates `execution_policy`); `command_invoker.script.ts` (Executor impl, profile-driven prefixes); `conformance.script.spec.ts` (Layer B, composes `detectPhase()`) | Promote envelope/event extension into [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md); add `WORKFLOW_RUNTIME_GUIDE.md` stub for profile shape + kb prefix convention; register `workflows:` in `assets/catalog/catalog.yaml`; commit `assets/catalog/workflows/default.yaml` (includes `execution_policy` + minimal stage graph; `command:` values may be stubs until PROFILE-SDD) |
| **M1** | AWO-1, AWO-5, AWO-13 | PR 2 | ENGINE, ADAPTER, CLI | `machine.ts` (xstate definition + guards); `orchestrator.script.ts` (actor); seam dispatcher; shutdown trap; `mise run spec workflow` routing + resume | SDD § auto-progression + seam dispatch; [`SECURITY_GUIDE.md`](../../guides/SECURITY_GUIDE.md) § graceful shutdown |
| **M2** | AWO-3, AWO-7 | PR 3 | ENGINE, PROFILE | intervention/dedup logic; `memory.script.ts` (stage-scoped + shared) | `WORKFLOW_RUNTIME_GUIDE.md` § memory model + retention |
| **M3** *(Post-MVP)* | AWO-6 | PR 4 | PROFILE, ADAPTER | `providers/*` command bindings; CI-status gate | [`CI_GUIDE.md`](../../guides/CI_GUIDE.md) § orchestrator PR/CI bindings |
| **M4** *(Post-MVP)* | AWO-8, AWO-11 | PR 5+ | ENGINE, ADAPTER, PROFILE | retrospective stage; sandbox descriptor enforcement | OBSERVABILITY (metrics archive); SECURITY § worker sandbox |
| **Optional** | — | nightly/CI | PROFILE-SDD, SMOKE | full `default.yaml` `command:` bindings; dogfood `mise run spec gate` integration | — |

Each slice **ends with** `mise run spec gate` (or `mise run spec ready
<featureDir> --key <key>` once a catalog key exists) **plus the guide-patch
task** for that slice. Slices are independently shippable and green.

## Tasks authoring note (for `/speckit-tasks`)

Prefix tasks by slice **and** layer family so engine work never blocks on kb
toolchain wiring (review 002 §04):

- `MVP-ENGINE-*` — L1 pure: machine, guards, envelope/state schemas (no toolchain strings).
- `MVP-ADAPTER-*` — L2: `command_invoker` Executor, `Bun.spawn` ban (ast-grep), `execution_policy` enforcement.
- `MVP-PROFILE-*` — L3: `profile_loader`, `ProfileSchema` (`ExecutionPolicy`, no `DEFAULT_COMMAND_ALLOWLIST`), `catalog.yaml` `workflows:`, `default.yaml` (execution_policy + minimal graph).
- `MVP-CONFORMANCE-*` — kb Layer B: stage **order** vs SDD / `detectPhase()`.
- `M1-CLI-*` — `mise run spec workflow` routing, resume naming, `ALLOWED_WORKFLOW_NAMES`.
- `PROFILE-SDD-*` *(optional)* — fill `default.yaml` with real kb `command:` bindings.
- `SMOKE-*` *(optional)* — real `mise`+`hk` dogfood; **never blocks MVP engine merge**; nightly/CI only.

Engine unit tests use **fixture profiles + stub commands** (`bun run fixtures/…`
or fake task names), never the kb toolchain. Do **not** add a task to
"maintain a central command inventory in the engine."

Each slice ends with:

```sh
bun test --config /dev/null tools/governance/specs/workflow/
mise run spec lint assets/specs/009-agentic-workflow-orchestrator
```

## Test enforcement (per [`spec.md` § Test enforcement layers](./spec.md#test-enforcement-layers-not-a-product-catalog-tag))

- **Layer A** — `bun test --config /dev/null tools/governance/specs/workflow/`; fixtures in `tools/__tests__/fixtures/workflow/` (synthetic feature-dir stubs, never live `assets/specs/NNN-*`).
- **Layer B** — integration test loads `assets/catalog/workflows/default.yaml`, asserts stage order matches the SDD guide phase list (AWO-12).
- **Layer C** — deferred until the operator CLI is shipped product behavior.

## Traceability

| Requirement | Slice | Primary artifact |
| ----------- | ----- | ---------------- |
| AWO-2  | MVP | `schemas/envelope.schema.ts`; `envelope.script.spec.ts` |
| AWO-9  | MVP | `command_invoker.script.ts` (Executor impl; enforces profile `execution_policy`, no engine prefix defaults); ast-grep rule banning `Bun.spawn` outside the adapter; `command_invoker.script.spec.ts` (fixture-profile prefixes) |
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

## E2e traceability

The orchestrator is **infrastructure**, not a shipped product feature, so it
declares **no** `@<catalog_key>` Gherkin in this feature (per
[`spec.md` § Test enforcement layers](./spec.md#test-enforcement-layers-not-a-product-catalog-tag)).
Requirement→executable mapping is satisfied by Layer A/B instead:

| Requirement | Enforcement | Path |
| ----------- | ----------- | ---- |
| AWO-1,2,4,5,9,13 | Layer A — tools specs | `tools/governance/specs/workflow/**/*.spec.ts` |
| AWO-12 | Layer B — profile replay vs SDD guide | integration test + `assets/catalog/workflows/default.yaml` |
| AWO-3,6,7,8,11 | Layer A (per slice M2–M4) | same tools-spec runner |
| (product CLI) | Layer C — deferred | `assets/features/e2e/*.feature` only when operator CLI becomes product-facing |

Normative Gherkin (if Layer C is ever opened) lives in the feature file only.

## Complexity Tracking

> No Constitution Check violations — this table is intentionally empty. The
> single new dependency (`xstate`) is justified in [`research.md`](./research.md)
> and is not a constitutional deviation.

## Out of this plan

- No `packages/workflow-*` directories created in this pass (forward-looking only).
- No production `src/` edits; renderer MUST NOT import the workflow runtime in v1.
- No Gherkin for orchestrator meta-behavior (Layer C deferred).
- No constitution version bump.
