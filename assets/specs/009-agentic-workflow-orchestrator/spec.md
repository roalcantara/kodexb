<!-- markdownlint-disable-file -->

# Agentic workflow orchestrator

**Feature Branch**: `[009-agentic-workflow-orchestrator]`
**Release**: v0.x
**Status**: Draft

**Input**: The current Speckit lifecycle works, but operators still need to manually trigger each stage transition, including stages that require no human judgment. This feature defines an orchestration layer that auto-advances Speckit stages, asks for user input only when real decisions exist, drives the workflow through CI-green PR completion, preserves per-agent memory, runs auditable retrospectives, and wires executable workflow controls behind a clear `mise = verbs` / `hk = events` / `orchestrator = decisions` division of labor.

> **Scope note:** the paragraph above states the **full vision**. This spec ships it across five PRs (see [Delivery slices](#delivery-slices-one-spec-many-prs)); the **MVP (PR 1) ships the substrate only** — schemas, command contract, profile load, persistence, and a guide-conformance test. Auto-progression lands in M1; CI-green PR completion is M3 (Post-MVP). Do not scope PR 1 to the full vision.

## Introduction

Speckit already supports investigate, specify, plan, tasks, and implement flows.
The main friction is operational, not capability: users still act as a manual
scheduler between stages. This feature introduces an agentic orchestrator that
controls stage progression as a deterministic state machine (implemented on
top of [xstate](https://stately.ai/docs/xstate)) and enforces explicit pause
conditions so human interventions happen only when needed.

**Progression model (guides-native).** The orchestrator does not call
`speckit.*` commands programmatically. It advances the workflow exactly the
way the [`WORKFLOW_SDD_GUIDE.md`](../../guides/WORKFLOW_SDD_GUIDE.md)
orchestrated-handoff section already defines:

- **Progression** is driven by repo-verifiable **artifact gates** — filesets and checklist markers (`analyze-plan.md`, `analyze-tasks.md`, `handoff.md`, `implement-done.md`).
- **Verification** runs through declared commands — `mise run spec audit`, `spec lint / trace / gate`, and `hk` profiles.
- **Execution seams** are the documented worker handoff points (`implement-src`, `gherkin-bdd-handoff`, `review-fix`), emitted via profile `command:` bindings and, in v1, optional `mise run spec handoff-generate … --dispatch` to opencode.
- **Speckit skills** (`/speckit-*`) remain the parallel human/agent UI for specify/plan/tasks/analyze when a stage is not automated.

The orchestrator decides *when* to emit a gate or dispatch a seam, not *how*
to run Speckit inside Bun.

This is an **evolution layer** that composes the project's existing
contracts — the SDD phase order in [`WORKFLOW_SDD_GUIDE.md`](../../guides/WORKFLOW_SDD_GUIDE.md),
the event substrate in [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md),
the repository safety primitives in [`SECURITY_GUIDE.md`](../../guides/SECURITY_GUIDE.md) —
into a single orchestration kernel. It does not replace any of them; it
wires them together and adds the runtime sandbox and graceful-shutdown
contracts they do not currently provide.

### Reuse posture

To avoid reinventing well-solved problems, the orchestrator deliberately leans
on existing tools rather than building new runtime infrastructure:

- **xstate** for the state machine kernel (states, transitions, guards, snapshot persistence, async invoked actors, fire-and-forget side-effect actors).
- **mise** ([`mise.toml`](../../../mise.toml)) for executable verbs — gates, linters, transitions, provider calls, retrospectives. See [`MISE_GUIDE.md`](../../guides/MISE_GUIDE.md).
- **hk** ([`hk.pkl`](../../../hk.pkl)) for pre/post-stage event bundles, reusing the existing `commit / pr / ci / full / slow` profiles. See [`SECURITY_GUIDE.md`](../../guides/SECURITY_GUIDE.md#hk-profile-policy).
- **TypeBox** for every schema (envelope, profile, event extensions).
- **NDJSON event substrate** per [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md) — the orchestrator extends the base envelope with its own event types, never forks it.
- **`assets/catalog/` + `tools/metrics/`** as the storage planes for workflow profiles (ARE) and historical run records (DONE/DID), respectively.

The genuinely new build surface is therefore narrow: profile loader,
unified command invoker, worker dispatcher with runtime sandbox, evidence
verifier, retrospective stage, graceful-shutdown trap, and the event-schema
extension.

### Kb profile authoring convention (L3 — not engine API)

`mise = verbs / hk = events / orchestrator = decisions` is a **kb profile
authoring convention**, documented in [`MISE_GUIDE.md`](../../guides/MISE_GUIDE.md)
and the `WORKFLOW_RUNTIME_GUIDE.md` stub — **not** an engine API or a set of
`DEFAULT_*` constants. The engine (L1) is tool-agnostic: the profile schema
expresses every action as a unified `command:` string and never distinguishes
`mise`/`hk`/`bun` at the keyword level. Which prefixes are permitted is
**profile data** (`execution_policy.allowed_prefixes`,
[AWO-9](#requirement-awo-9-declared-command-invocation-contract)); kb supplies
`mise run` / `hk check` / `bun run` **only** in
`assets/catalog/workflows/default.yaml`. A future app (e.g. an Angular web
build) would supply its own prefixes (`pnpm run`, `nx`) without touching the
engine. The orchestrator never inlines shell and never calls provider APIs
(`gh`, CI vendor SDKs) directly.

## Authority & guide promotion

Per [`DOC_AUTHORITY.md`](../../guides/DOC_AUTHORITY.md), normative truth lives
in `assets/guides/` + `assets/catalog/` + executables. **This spec folder is
in-flight and ephemeral.** It carries no authority once shipped:

- Runtime code, tests, and tooling MUST NOT hardcode `assets/specs/009-*` paths. Feature dirs are passed in (`--feature <dir>`) or resolved via `catalog_paths` (`specs_root`); an ast-grep rule already enforces this.
- The schemas under [`contracts/`](contracts/) are **spikes**. They are promoted to a stable code path (see [Implementation home & package boundary](#implementation-home--package-boundary)) and the spec then holds links, not duplicates.
- Durable decisions are lifted into guides on ship. Until then, the spec links out to a guide (one pointer, no copy); guides never link back into this folder.

### Guide promotion checklist

Every normative paragraph that must land in a guide before the owning slice
ships:

| Spec content | Target guide | Owner slice |
| ------------ | ------------ | ----------- |
| Outcome envelope + evidence contract | [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md) (event extension) + new `WORKFLOW_RUNTIME_GUIDE.md` stub (or SDD subsection) | MVP |
| Command-invocation contract + allowlist; `mise=verbs / hk=events` | [`MISE_GUIDE.md`](../../guides/MISE_GUIDE.md) + [`SECURITY_GUIDE.md`](../../guides/SECURITY_GUIDE.md#hk-profile-policy) | MVP |
| Profile shape (ARE) + `catalog.yaml` `workflows:` section | [`assets/catalog/README.md`](../../catalog/README.md) + `WORKFLOW_RUNTIME_GUIDE.md` | MVP |
| Run-state persistence + sibling-flat layout + dual-write | [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md) | MVP |
| Stage-graph replays SDD phase order | [`WORKFLOW_SDD_GUIDE.md`](../../guides/WORKFLOW_SDD_GUIDE.md) | MVP |
| Auto-progression + seam dispatch + graceful shutdown | [`WORKFLOW_SDD_GUIDE.md`](../../guides/WORKFLOW_SDD_GUIDE.md) + [`SECURITY_GUIDE.md`](../../guides/SECURITY_GUIDE.md) | M1 |
| Memory model + retention | `WORKFLOW_RUNTIME_GUIDE.md` | M2 |
| PR/CI provider bindings | [`CI_GUIDE.md`](../../guides/CI_GUIDE.md) | M3 (Post-MVP) |
| Retrospective archive + cross-run guidance; worker sandbox | [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md) (metrics) + [`SECURITY_GUIDE.md`](../../guides/SECURITY_GUIDE.md) | M4 (Post-MVP) |

## Delivery slices (one spec, many PRs)

Per [`DOC_AUTHORITY.md`](../../guides/DOC_AUTHORITY.md), there is **one
in-flight spec** while building; slices are plan phases and a PR sequence,
**not** new spec folders (no `009a` / `009b`). The full slice → requirement
→ PR → guide mapping lives in [`plan.md`](plan.md); the requirement headers
below carry a **Slice:** banner.

| Slice | Requirements | Ships | Demonstrates |
| ----- | ------------ | ----- | ------------ |
| **MVP** | AWO-2, AWO-9, AWO-10, AWO-4, AWO-12 | PR 1 | The **substrate**: validated envelopes, command contract, profile load, persistence + audit, and a guide-conformance test that the default profile replays the SDD phase order. Does not auto-progress yet. |
| **M1** | AWO-1, AWO-5, AWO-13 | PR 2 | First **orchestration**: auto-progression on the proven substrate, seam dispatch, graceful shutdown + resume. |
| **M2** | AWO-3, AWO-7 | PR 3 | Intervention minimization + per-agent / shared memory. |
| **M3** *(Post-MVP)* | AWO-6 | PR 4 | Provider-agnostic PR/CI completion. |
| **M4** *(Post-MVP)* | AWO-8, AWO-11 | PR 5+ | Retrospective self-improvement + worker runtime sandbox. |

**Scope note:** the team flagged the original scope as over-ambitious. The
MVP is deliberately a contracts-and-storage **walking skeleton** — smallest
reviewable PR, no state-machine behavior to debug until M1. AWO-6, AWO-8,
and AWO-11 are explicitly **Post-MVP**; they are the outward-facing,
integration-heavy requirements and are not blocking the first PRs.

**Default profile:** `assets/catalog/workflows/default.yaml` is an **MVP plan
deliverable**, not part of this spec. Its stage ids MUST match the
**executable `detectPhase()` order** — the runtime encoding of the
[`WORKFLOW_SDD_GUIDE.md`](../../guides/WORKFLOW_SDD_GUIDE.md) phase order —
namely `specify → plan → analyze-plan → tasks → analyze-tasks →
handoff-generate → implement → review`. `detectPhase()` (not the guide prose)
is the Layer-B anchor because it is the deterministic source of truth; the
guide remains the narrative authority. Registration in the `catalog.yaml`
`workflows:` section ships in the same PR.

## Implementation home & package boundary

The orchestrator **extends the existing workflow tree in place** at
`tools/governance/specs/workflow/` — the `spec` domain of
[`TOOLS_GUIDE.md`](../../guides/TOOLS_GUIDE.md), where the shipped workflow
code already lives ([`workflow_run.script.ts`](../../../tools/governance/specs/workflow/workflow_run.script.ts),
`orchestrated_handoff.script.ts`, `handoff_generate.script.ts`,
`runs_cli.script.ts`). MVP–M4 land here; `mise run spec workflow …` stays
the stable entry point. **No new parallel tree, no `packages/` move in this
feature.**

| Concern | Home (this feature) | Rule |
| ------- | ------------------- | ---- |
| Pure machine + guards + TypeBox schemas + profile parse | `tools/governance/specs/workflow/` (pure modules) | No `Bun.spawn`, no filesystem — pure functions + types ([`FCIS.guide.md`](../../guides/FCIS.guide.md)) |
| Actor, command invoker, persistence, dispatch | `tools/governance/specs/workflow/` (`*.script.ts`) | Implements all I/O; reuses the existing `WorkflowRunWriter` |
| CLI entry | `tools/governance/specs/` → `tools/bin/spec.script.ts` | Thin `mise run spec workflow …` dispatch |
| Renderer | — | `src/shell/renderer/` MUST NOT import the workflow runtime in v1 |

**Optional later extraction (not this feature).** If — and only if — a
promotion trigger fires, the pure modules may be `git mv`'d into a Bun
workspace package (`packages/workflow-core` + `packages/workflow-runtime`),
with `mise run spec workflow …` unchanged. Triggers (any one): the engine is
reused by another repo; the desktop build would otherwise pull xstate into
the Electrobun bundle (keep it CLI-only in `tools/`); or the team splits
“platform workflow” from “kb app”. Until then, extraction is **deferred** —
do not create `packages/workflow-*` speculatively.

### Tool-agnostic engine boundary

Extractability is a **prerequisite**, not a follow-up: the engine is layered
so it can be driven by different catalogs (kb desktop, a future web app)
without change. Four layers:

| Layer | Role | May reference toolchain? |
| ----- | ---- | ------------------------ |
| **L1 — Engine** | Stage graph, xstate machine, guards, envelope validation, evidence/artifact-gate evaluation; calls `Executor.run(spec)` with an opaque command descriptor | **No** — MUST NOT import or default to `mise`, `hk`, `bun`, `gh`, or `speckit`; no toolchain identifiers in constants, defaults, or type names |
| **L2 — Runtime adapter** | Subprocess (`Bun.spawn` lives here only), cwd/env/timeout, applies the profile's `execution_policy`, emits telemetry | kb-specific impl, but driven by profile data |
| **L3 — Profile / catalog (ARE)** | `assets/catalog/workflows/*.yaml`: `command:` strings + `execution_policy.allowed_prefixes` | **Yes** — kb `default.yaml` carries `mise run` / `hk check` / `bun run`; other apps carry their own |
| **L4 — CLI / operator entry** | `mise run spec workflow …`, `spec.script.ts` routing | kb-specific; not part of `workflow-core` |

Invariants:

- L1 pure-engine modules MUST NOT contain toolchain identifiers (`mise`, `hk`, `bun`, `gh`, `speckit`) in constants, defaults, or type names.
- Runnable profiles MUST declare `execution_policy.allowed_prefixes` (≥ 1 entry).
- Kb ships those prefix values **only** in `assets/catalog/workflows/default.yaml` (and test fixtures) — never as engine `DEFAULT_*` constants.
- `detectPhase()` and the SDD phase order remain **kb-specific** composition (kb workflow helpers + Layer-B test), not a reusable engine export.

## Out of scope

- Replacing Speckit command semantics or file formats
- Rewriting existing feature specs outside the orchestrator flow
- Changing project governance gates or quality policy thresholds
- Building a cloud service; this scope is local workflow orchestration
- Replacing the canonical event substrate, schema, or `runs` CLI defined in [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md); the orchestrator extends, never forks
- Replacing the repository safety primitives defined in [`SECURITY_GUIDE.md`](../../guides/SECURITY_GUIDE.md); the orchestrator consumes them through declared commands
- Replacing `hk` or `mise` with a custom runner **in kb's default profile**; their roles are load-bearing for kb (L3), though the engine itself is runner-agnostic
- **Engine embedding kb toolchain defaults or command catalogs** — the L1 engine carries no `mise`/`hk`/`bun`/`gh` defaults, no `DEFAULT_*` prefix constants, and no command inventory; all such values are profile (L3) data
- Multi-repo orchestration; v1 is single-repo
- Parallel stage execution; reserved for v2 (profile validation rejects `parallel: true` in v1). Note: this restricts **stage progression** only — async side-effect actors per [AWO-5](#requirement-awo-5-safe-delegation-to-stage-specific-subagents) are allowed
- LangGraph / LangChain / LangSmith adoption (deferred unconditionally)
- OpenTelemetry / distributed tracing (deferred unconditionally; revisit when distributed tracing is actually needed)
- Replacing the default CI provider implementation at the orchestrator code level; the provider is a profile binding ([AWO-6](#requirement-awo-6-pr-and-ci-green-completion-contract-provider-agnostic) invariant)
- Loosening a profile's `execution_policy.allowed_prefixes` at runtime; the allowlist is fixed at profile load, and kb's default profile holds it tight (revisit per-profile if pain emerges)

## Glossary

| Term                     | Meaning                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orchestrator             | Controller agent that runs and advances the workflow                                                                                                                  |
| Stage worker             | Specialized subagent executing one workflow stage                                                                                                                     |
| Stage outcome            | Normalized completion envelope returned by a stage worker (see [`contracts/envelope.schema.ts`](contracts/envelope.schema.ts))                                        |
| Auto-advance             | Transition to the next stage without user action                                                                                                                      |
| Input gate               | Explicit pause that requests human input                                                                                                                              |
| Evidence                 | Verifiable output proving stage completion; an `EvidenceEntry` of kind `command` (run via the Executor adapter), `artifact`, or `marker` — toolchain-neutral                |
| Workflow profile         | TypeBox-validated YAML in `assets/catalog/workflows/<name>.yaml` defining stage graph, policies, command bindings, retry, memory, providers                           |
| Stage graph              | Directed graph of stages embedded in the workflow profile; superset of the canonical SDD phase order in [`WORKFLOW_SDD_GUIDE.md`](../../guides/WORKFLOW_SDD_GUIDE.md) |
| Command binding          | Per-action `command:` string declared on a stage / trigger / evidence entry in the profile; opaque to the engine                                                      |
| Executor                 | Port invoked by the engine: `run(opaque command descriptor)` → exit code + streams. Implemented by the L2 runtime adapter; the engine knows only the interface         |
| execution_policy         | Profile field carrying `allowed_prefixes: string[]` (≥ 1) and optional future knobs; the **only** place permitted command prefixes are defined — never an engine default |
| Engine (L1)              | Reusable, mostly-pure layer: stage graph, xstate machine, guards, envelope validation, evidence evaluation; no `spawn`, no toolchain identifiers                       |
| Runtime adapter (L2)     | kb-specific shell implementing `Executor`: subprocess, policy enforcement, telemetry emit; the only place `Bun.spawn` is allowed                                       |
| Side-effect actor        | xstate-spawned fire-and-forget actor for teardown work (logging promotion, tracking, memory pinning) that does not gate stage progression                             |
| Terminal stage           | A stage whose `DONE` outcome ends the workflow (default: post-CI-green review); profile-configurable                                                                  |
| Profile precedence       | Resolution order: `--profile <name>` flag → `.specify/profile.yaml` → `assets/catalog/workflows/default.yaml` → built-in                                              |
| Agent memory             | Stage-scoped (run-local) + shared run memory + cross-run pinned guidance                                                                                              |
| R2R                      | Red-to-green retry and remediation loop for failed quality checks                                                                                                     |
| xstate machine           | The pure state-machine definition in the workflow implementation home (`tools/governance/specs/workflow/`) whose snapshot is the run-state of record |

## Clarifications

### Session 2026-06-08

- Q: Should this feature automate only stage execution or also stage transition policy? → A: Both; transition policy is part of the orchestrator contract.
- Q: Should non-interactive stages always auto-advance? → A: Yes, unless a policy guard or missing required input blocks progression.
- Q: Which status model should subagents return? → A: A strict normalized outcome envelope with `DONE`, `NEED_INPUT`, `BLOCKED`, or `RETRYABLE_FAILURE`.
- Q: Should completion stop at implementation, or include pull request and CI outcomes? → A: Include PR open and green CI as first-class terminal conditions.
- Q: Should workflow customization use JSON or YAML profiles? → A: YAML profiles for readability and simpler repository maintenance.
- Q: Should gate and runner commands be invoked directly by code? → A: No; every executable invocation goes through a `command:` string declared in the workflow profile, routed through a single `Executor` adapter and validated against the profile's `execution_policy.allowed_prefixes` (see Session 2026-06-09 tool-agnostic clarification).
- Q: Should the spec keep separate keywords for verbs (mise) and events (hk)? → A: No; one `command:` keyword for both. The mise/hk distinction is **kb profile-authoring** convention documented in [`MISE_GUIDE.md`](../../guides/MISE_GUIDE.md) — not an engine API or default.
- Q: Should the orchestrator build its own state machine or adopt an existing one? → A: Adopt **xstate**; the orchestrator owns transition policy + guards + persistence + side-effect-actor lifetimes, not transition mechanics.
- Q: Where do workflow profiles live? → A: `assets/catalog/workflows/<name>.yaml`, indexed in `assets/catalog/catalog.yaml`; profiles are project characteristics (ARE).
- Q: Where do run records live? → A: Dual-write per [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md#durable-archive). Live tail at `tmp/workflow-runs/<date>/<run_id>.ndjson`; durable archive at `tools/metrics/workflow-runs/<date>/<run_id>.ndjson` (DONE/DID).
- Q: How should teardown side-effects relate to stage progression? → A: Spawned as fire-and-forget xstate actors; they do not block transitions; their lifecycle is captured as `task.*` events.

### Session 2026-06-09

- Q: Should stage workers have an explicit execution timeout, and what should the dispatch acknowledgment contract be? → A: Profile-overridable timeout per stage (`worker.timeout_ms`, default 300s) plus a `dispatch_ack_ms` (default 10s) for worker start confirmation. Timeout exhaustion counts toward the profile's retry policy as a `RETRYABLE_FAILURE`; escalation to operator occurs only after retry budget is exhausted.
- Q: When a stage worker reports `DONE`, what is authoritative for allowing the xstate transition? → A: Envelope + evidence. The worker's `DONE` is a claim; AWO-2 evidence verification runs the artifact-gate / checklist-marker check (the shipped `detectPhase()` / marker presence) as the evidence command. A stage advances only when envelope `status == DONE` **and** all declared evidence verifies; this unifies the artifact-gated progression model with the envelope contract and reuses `detectPhase()`.
- Q: How does the orchestrator capture a dispatched worker's outcome envelope? → A: File convention. The worker writes its envelope to `tmp/workflow-runs/<date>/<run_id>.envelope.<stage>.json`; the dispatcher reads and `Value.Check()`s it (no stdout parsing). Matches the sibling-flat run layout and the existing handoff-file pattern.
- Q: How does the operator answer `NEED_INPUT` and approve `human_gated` stages? → A: CLI subcommand `mise run spec workflow resume [<run_id>] --answer <qid>=<value>` / `--approve <stage>`. `<run_id>` is optional and defaults to the current active (non-terminal) run; if multiple active runs exist, the command requires an explicit `<run_id>` and lists candidates. The orchestrator hydrates the snapshot, applies the input to shared memory, and auto-resumes.
- Q: Should the workflow engine be tool-agnostic (no `mise`/`hk`/`bun`/`gh` defaults in core)? → A: Yes. Four layers — L1 engine (pure, no toolchain identifiers) → L2 runtime adapter (subprocess + policy + telemetry) → L3 profile/catalog (ARE; `command:` + `execution_policy`) → L4 kb CLI. Permitted prefixes are profile data (`execution_policy.allowed_prefixes`), supplied by kb only in `assets/catalog/workflows/default.yaml`. The prefix-validation algorithm may be pure; prefix values are never hardcoded in engine modules. `detectPhase()` / SDD order stay kb-specific.
- Q: How should the profile `sandbox` field be scoped for MVP? → A: Optional. `sandbox` is an optional `StageDefinition` field (minimal/absent when dispatch is disabled); the descriptor **shape** lives in the schema, **enforcement** lands in M4 (AWO-11). No MVP coupling.
- Q: Where should kb command-prefix values live after removing the engine default? → A: Remove `DEFAULT_COMMAND_ALLOWLIST` from the schema spike entirely. `allowed_prefixes` is required profile data; kb's actual values live only in `assets/catalog/workflows/default.yaml` and test fixtures under `tools/__tests__/fixtures/workflow/`. Pure modules carry zero toolchain strings.

---

## State model

The orchestrator is an xstate machine whose pure definition and imperative
actor both live in the workflow implementation home
(`tools/governance/specs/workflow/` — see
[Implementation home & package boundary](#implementation-home--package-boundary));
the kernel is never owned by the desktop `src/`. The snapshot returned by
xstate's `getPersistedSnapshot()` is the canonical run-state of record;
restart behavior (AWO-4) hydrates an actor via
`createActor(machine, { snapshot })`.

### Stage-level state enum

```
pending → running → evidence_pending
                     ↓
                     ├── done            (transition allowed)
                     ├── need_input      (paused on input gate)
                     ├── blocked         (operator escalation)
                     ├── retrying        (within retry budget)
                     └── escalated       (retry budget exhausted)

terminal: { terminal_success | terminal_failure }
```

### Transition precedence

When more than one rule could fire on a stage outcome, the orchestrator resolves
in this fixed order (highest first):

1. **Profile policy gate** — a stage marked `human_gated: true` always pauses, even on `DONE`.
2. **Human approval pending** — an unresolved input gate blocks transition.
3. **Evidence verification** — `DONE` without verifiable evidence is downgraded to `evidence_pending`.
4. **Auto-advance** — `DONE` with verified evidence transitions to the next stage in the stage graph.

These precedence rules are encoded as xstate guards; the profile cannot
reorder them.

### Concurrency

Sequential-by-default is an invariant for v1 — applied to **stage
progression**. The profile schema reserves a `parallel: true` key per
stage for v2; v1 validation rejects it.

### Side-effect actors

Stage workers may emit their envelope before all teardown work
completes. Teardown work (event archive promotion, retrospective
emission, memory pinning, tracking) is **spawned** as fire-and-forget
xstate actors with a bounded timeout (default 30s, profile-overridable
via `default_retry.cap_ms`). Side-effect actors:

- Do not gate the next stage's transition.
- Emit `task.invoked` / `task.completed` events with their own
  durations so they remain auditable.
- Are torn down on graceful shutdown (see [AWO-13](#requirement-awo-13-graceful-shutdown-and-cooperative-cancellation)).

This preserves the sequential-stage invariant while allowing
genuinely-parallel teardown — exactly what xstate's invoked-actor model
is designed for.

### Persistence (sibling-flat layout)

All artifacts for a run share the `<run_id>` stem inside a daily folder,
per [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md#file-layout-sibling-flat):

- Live snapshot: `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.state.json` (xstate snapshot; atomic rewrite via rename)
- Live event tail: `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.ndjson` (append-only, O_APPEND)
- Run-shared decisions: `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.shared.json`
- Per-stage memory: `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.memory.<stage>.json`
- Durable archive on terminal: dual-write the event file to `tools/metrics/workflow-runs/<YYYY-MM-DD>/<run_id>.ndjson`

Schemas, event-type extensions, and the profile shape live in
[`contracts/`](contracts/) and the full storage layout table is in
[`data-model.md`](data-model.md).

---

## REQUIREMENT AWO-1: Automated stage progression with explicit pause gates

**Slice:** M1

**User story:** As an operator, I want Speckit stages to progress automatically so that I only intervene when meaningful human input is required.

### Acceptance criteria

1. WHEN a stage completes with status `DONE`, THEN the xstate machine SHALL evaluate the transition precedence rules (policy gate → human approval → evidence verify → auto-advance) and auto-transition to the next valid stage without manual trigger.
   - **Measure:** 100% of `DONE` outcomes in non-terminal stages with verified evidence and no human-gate result in automatic transition within the transition-overhead NFR budget.
   - **Evidence:** Integration tests asserting stage progression order across the full default profile run.

2. WHEN a stage completes with status `NEED_INPUT`, THEN the orchestrator SHALL hold the actor in `need_input`, persist the snapshot, and emit a single consolidated question set for the operator.
   - **Measure:** 100% of `NEED_INPUT` outcomes produce exactly one grouped prompt event per pause cycle; question deduplication removes any item already answered in run-shared memory.
   - **Evidence:** Integration tests for pause, question aggregation, and dedup against prior answers.

3. WHEN a stage completes with status `BLOCKED`, THEN the orchestrator SHALL stop auto-progression, persist the actor in `blocked`, and emit a machine-readable blocker summary with remediation guidance pulled from the envelope's `diagnostics[]`.
   - **Measure:** 100% of `BLOCKED` outcomes include blocker reason, diagnostic code, and remediation fields.
   - **Evidence:** Unit tests for blocker serialization and transition prevention; xstate guard test asserting no transition fires from `blocked`.

4. WHEN a stage completes with status `RETRYABLE_FAILURE`, THEN the orchestrator SHALL retry according to the profile's bounded retry policy (default: max 3 attempts, exponential backoff with jitter) before escalating to operator input.
   - **Measure:** Retries never exceed configured `max_attempts`; escalation to `escalated` always occurs after the limit; same-cause failures count against the budget, distinct causes reset it per the profile's `retry.reset_on_new_cause` flag.
   - **Evidence:** Unit and integration tests covering retry loop, backoff timing, and escalation path. NFR thresholds defined in the NFRs section.

---

## REQUIREMENT AWO-2: Strict stage outcome contract and evidence validation

**Slice:** MVP (AC1–2: envelope schema + evidence invoker validated in isolation); AC3–4 transition/`evidence_pending` paths fully exercised in M1 when AWO-1 lands. `tasks.md` carries `MVP-` tasks that test the validator as a component, not via a running machine.

**User story:** As a maintainer, I want every stage to return a normalized contract so that transitions are deterministic and auditable.

### Acceptance criteria

1. WHEN a stage worker finishes, THEN it SHALL return an envelope validated by the TypeBox schema in [`contracts/envelope.schema.ts`](contracts/envelope.schema.ts). Required fields: `schema_version`, `stage`, `status`, `artifacts_created[]`, `evidence[]`, `diagnostics[]`, `retry_count`, `elapsed_ms`. Optional: `questions[]`, `idempotency_key`. The schema is adapted from speckit-companion's agent-teams-lite shape, trimmed to this contract.
   - **Measure:** 100% of stage worker responses validate via `Value.Check(EnvelopeSchema, payload)` before any transition is evaluated.
   - **Evidence:** Contract tests per stage worker; schema round-trip tests against fixture envelopes.

2. WHEN an outcome payload is malformed or missing required fields, THEN the orchestrator SHALL reject the outcome, transition the actor to `blocked`, and record the TypeBox validation errors in `diagnostics[]`.
   - **Measure:** 100% of malformed outcomes are rejected before transition; zero malformed payloads produce a successful auto-advance.
   - **Evidence:** Negative-path tests for schema validation and rejection behavior, covering every required field.

3. WHEN a stage reports `DONE`, THEN the orchestrator SHALL treat the status as a **claim** and verify each declared evidence entry before allowing transition. An evidence entry is one of the toolchain-neutral kinds (`command` | `artifact` | `marker`): a `command` entry is run through the L2 `Executor` adapter and checked by exit status (the engine never spawns); `artifact`/`marker` entries are path checks the engine evaluates directly — e.g. the shipped `detectPhase()` / checklist-marker presence (`analyze-tasks.md`, `implement-done.md`). The transition fires only when `status == DONE` **and** every evidence entry passes.
   - **Measure:** Zero transitions from `DONE` proceed without all evidence verifications passing; a `DONE` envelope with a missing required marker stays in `evidence_pending`.
   - **Evidence:** Integration tests asserting evidence-gate enforcement, including a `DONE` claim with an absent checklist marker (must not transition) and a passing marker+command case (must transition).

4. WHEN evidence cannot be verified, THEN the actor SHALL hold in `evidence_pending` and SHALL NOT auto-advance.
   - **Measure:** Zero false-positive transitions on unverifiable evidence; the run-state snapshot reflects `evidence_pending` until resolution.
   - **Evidence:** Failure-injection tests for missing, stale, or non-deterministic evidence.

---

## REQUIREMENT AWO-3: Human-intervention minimization policy

**Slice:** M2

**User story:** As a user, I want fewer workflow interruptions so that I can supervise by exception instead of manually driving every stage.

### Acceptance criteria

1. WHEN required stage inputs can be inferred from repository context, prior decisions in run-shared memory, or pinned cross-run guidance, THEN the orchestrator SHALL auto-fill those inputs and continue.
   - **Measure:** Against the benchmark suite declared in `tools/metrics/baselines/workflow.json`, the auto-fill rate meets or exceeds the recorded baseline threshold (the concrete threshold is set by the baseline task in the implementation plan, not fixed in this spec).
   - **Evidence:** Replay tests against the baseline corpus comparing prompts emitted vs prompts auto-filled.

2. WHEN operator input is required, THEN the orchestrator SHALL ask only unresolved, high-value questions and SHALL batch them in one interaction per pause cycle.
   - **Measure:** No duplicate questions per stage; at most one prompt event per pause cycle.
   - **Evidence:** Tests for question deduplication (against run-shared memory) and batching.

3. WHEN defaults are applied for non-critical decisions, THEN the orchestrator SHALL record the applied default, source, and rationale in run-shared memory and emit a `decision.defaulted` event.
   - **Measure:** 100% of defaulted decisions are present in persisted decision log and replayed in the retrospective.
   - **Evidence:** State persistence tests, event-log assertions, and retrospective fixture replay.

4. WHEN a user answers a previously requested question via `mise run spec workflow resume [<run_id>] --answer <qid>=<value>`, THEN the orchestrator SHALL hydrate the snapshot, record the answer in shared memory, and transition the actor out of `need_input` automatically without an explicit next-stage command. When `<run_id>` is omitted it defaults to the current active (non-terminal) run; if more than one active run exists, the command SHALL require an explicit `<run_id>` and list the candidates.
   - **Measure:** 100% of resolved input gates resume workflow automatically; resume latency stays within the NFR budget; omitted-`run_id` resolves to the single active run or errors with candidate list when ambiguous.
   - **Evidence:** End-to-end pause/resume tests with snapshot reload between pause and answer; tests for default-`run_id` resolution (single active) and the ambiguous-multiple-active error path.

---

## REQUIREMENT AWO-4: Resumable execution and audit trail

**Slice:** MVP (persistence + audit + archive); AC2 resume fully exercised in M1 when AWO-1 lands

**User story:** As an operator, I want resilient and resumable workflow execution so that interruptions or transient errors do not require restarting from scratch.

### Acceptance criteria

1. WHEN workflow state changes, THEN the orchestrator SHALL persist the xstate snapshot to `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.state.json` and append an event to `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.ndjson` that validates against the canonical event base in [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md#event-schema).
   - **Measure:** 100% of transitions produce a durable snapshot rewrite AND an event append; both writes complete within the budgets in [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md#performance-budgets) and the [NFRs](#non-functional-requirements-nfrs).
   - **Evidence:** Persistence tests across all transition types; schema-compat test against the canonical event base schema.

2. WHEN orchestration restarts after interruption, THEN it SHALL rehydrate the actor via `createActor(machine, { snapshot: <persisted> })` and resume from the latest consistent state.
   - **Measure:** Resume tests recover the exact prior stage, status, retry count, and pending action; idempotency keys prevent duplicate worker dispatch.
   - **Evidence:** Crash/restart integration tests including mid-`evidence_pending` and mid-`retrying` interruption scenarios.

3. WHEN a stage retries or escalates, THEN the orchestrator SHALL append an audit event (`stage.retried`, `stage.escalated`) with timestamp, cause, action taken, attempt number, and elapsed runtime.
   - **Measure:** 100% of retry and escalation events are logged with the required fields, validated against the event-extension schema in [`contracts/events.schema.ts`](contracts/events.schema.ts).
   - **Evidence:** Event-log assertions in integration tests + schema-validation tests.

4. WHEN the workflow reaches a terminal stage, THEN the orchestrator SHALL (a) dual-write the event file to `tools/metrics/workflow-runs/<YYYY-MM-DD>/<run_id>.ndjson` per the [dual-write rule](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md#dual-write-rule-at-terminal), and (b) emit a final summary event including stage timeline, interventions requested, validation outcomes, and performance metrics (lead time, per-stage duration, retry counts).
   - **Measure:** 100% of terminal runs produce both the durable archive copy and the summary event with all required metric fields populated; archive write completes within the dual-write budget from [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md#performance-budgets).
   - **Evidence:** End-to-end terminal-run assertions; archive-promotion tests verifying file existence and content equivalence with the live tail.

---

## REQUIREMENT AWO-5: Safe delegation to stage-specific subagents

**Slice:** M1

**User story:** As a maintainer, I want clear delegation boundaries so that each stage is executed by the right subagent with predictable behavior.

### Acceptance criteria

1. WHEN executing a stage, THEN the orchestrator SHALL dispatch the mapped stage worker **at a documented seam** (e.g. `implement-src`, `gherkin-bdd-handoff`, `review-fix`) via the profile's `command:` binding — not by invoking `speckit.*` directly — passing explicit input context and the expected output schema. The worker returns its outcome by writing the envelope to `tmp/workflow-runs/<date>/<run_id>.envelope.<stage>.json`; the dispatcher reads and validates that file (it does not parse stdout). Where AWO-11 (Post-MVP) is adopted, dispatch is additionally subject to the runtime sandbox.
   - **Measure:** 100% of stage executions resolve through the declared stage-to-seam mapping and a profile `command:` binding; zero dispatches construct `speckit.*` calls inline; the envelope is read from the declared file path.
   - **Evidence:** Dispatcher tests and mapping contract checks; static check asserting no inline `speckit.*` invocation in the dispatcher; test that a missing envelope file surfaces a `BLOCKED` outcome rather than a crash.

2. WHEN a stage worker returns `DONE`, THEN the orchestrator SHALL treat the result as authoritative only after the schema and evidence checks defined in [AWO-2](#requirement-awo-2-strict-stage-outcome-contract-and-evidence-validation) pass.
   - **Measure:** Zero unchecked authoritative transitions.
   - **Evidence:** Integration tests for the post-worker validation path.

3. WHEN a worker exceeds `worker.timeout_ms` or returns repeated retryable failures, THEN the orchestrator SHALL count the timeout as a `RETRYABLE_FAILURE` subject to the profile's retry policy and, only after the retry budget is exhausted, escalate with a single actionable intervention request.
   - **Measure:** No infinite retry loops; escalation always occurs at retry threshold per the active profile's `retry.max_attempts`.
   - **Evidence:** Retry-threshold tests over the default profile and a profile with custom retry knobs.

4. WHEN a stage is marked `human_gated: true` by profile policy, THEN the orchestrator SHALL pause even if worker status is `DONE` until approval is provided via `mise run spec workflow resume [<run_id>] --approve <stage>` (same `run_id` default-resolution as AWO-3 AC4).
   - **Measure:** 100% enforcement of human-gated stage policy; xstate guard asserts no transition fires from human-gated `DONE` without approval.
   - **Evidence:** Policy-gate tests for approval-required transitions.

5. WHEN a stage worker emits its envelope, THEN any post-stage teardown work (event-archive promotion, retrospective emission, memory pinning, tracking) SHALL be spawned as fire-and-forget xstate actors with a bounded timeout (default 30s, profile-overridable), and the actor's lifecycle SHALL emit `task.invoked` / `task.completed` events. Teardown actors MUST NOT block the next stage's transition.
   - **Measure:** 100% of teardown actions resolve to spawned actors with declared timeouts; zero teardown actions are inlined in the worker dispatch path; transition latency from worker envelope to next-stage entry is unaffected by teardown duration.
   - **Evidence:** Actor-lifecycle tests; latency tests comparing transition time with fast vs slow teardown actors; timeout-injection tests.

---

## REQUIREMENT AWO-6: PR and CI-green completion contract (provider-agnostic)

**Slice:** M3 (Post-MVP) — not blocking the first PRs

**User story:** As a maintainer, I want workflow completion to include pull request readiness and CI success so that implementation output is shippable, not only locally complete.

**Invariant:** The orchestrator MUST NOT invoke provider APIs (`gh`, `git push`, GitHub Actions, or any CI vendor SDK) directly. PR open/update, branch validation, and CI status observation SHALL all resolve through `command:` bindings in the workflow profile per [AWO-9](#requirement-awo-9-declared-command-invocation-contract). Replacing the provider implementation MUST be a profile change, not a code change.

**Default v1 binding:** the default profile binds `providers.pr_open: "gh pr create …"` (or a `mise run` wrapper), `providers.pr_update: "gh pr edit …"`, `providers.ci_status: "gh pr checks …"`. The orchestrator does not depend on any of these by name — the bindings are the contract surface.

### Acceptance criteria

1. WHEN implementation and local gates pass, THEN the orchestrator SHALL transition to a PR preparation stage that runs the profile's `triggers.post` command (default: `hk check --profile pr`) and the profile's `providers.pr_open` command for branch validation and review-context generation.
   - **Measure:** 100% of successful implement stages transition to PR preparation; PR-prep invocations resolve exclusively through profile-declared `command:` strings.
   - **Evidence:** Integration tests covering implement-to-PR transition + static-analysis tests (ast-grep rule) asserting no direct provider-API calls in `src/`.

2. WHEN PR automation is enabled in the profile, THEN the orchestrator SHALL invoke the profile's `providers.pr_open` command and persist the returned PR reference in run-shared memory.
   - **Measure:** 100% of enabled runs produce a PR reference in run output; runs with PR automation disabled stop at the PR-prep artifact without invoking `pr_open`.
   - **Evidence:** Integration tests with a stubbed `pr_open` binding verifying contract surface; profile-toggle tests.

3. WHEN CI checks are required by the profile, THEN terminal success SHALL require the profile's `providers.ci_status` command to report success (exit code 0).
   - **Measure:** Zero terminal-success outcomes while the bound `ci_status` check is pending or failing.
   - **Evidence:** Policy tests for CI gate enforcement with stubbed status-providers covering green / pending / failing cases.

4. WHEN CI fails, THEN the orchestrator SHALL route into the R2R remediation loop using the profile's retry policy and escalate only if the policy threshold is exceeded.
   - **Measure:** 100% of CI failures enter the remediation path; no infinite retry loops; escalation events emitted at the threshold.
   - **Evidence:** Integration tests for CI-failure remediation and escalation against a deterministic failing-then-passing CI stub.

---

## REQUIREMENT AWO-7: Per-agent memory and shared decision memory

**Slice:** M2

**User story:** As an operator, I want each stage worker to keep relevant memory so that context remains focused while still preserving cross-stage decisions.

### Acceptance criteria

1. WHEN a stage worker starts, THEN the orchestrator SHALL load stage-scoped memory from `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.memory.<stage>.json` (creating it on first use) and pass it to the worker.
   - **Measure:** 100% of stage executions resolve stage memory before worker dispatch; per-stage files are created on first use and reused on subsequent attempts within the same run.
   - **Evidence:** Worker bootstrap tests; file-lifecycle tests across retry attempts.

2. WHEN cross-stage decisions are made, THEN the orchestrator SHALL persist them to `tmp/workflow-runs/<YYYY-MM-DD>/<run_id>.shared.json` and emit a `decision.*` event per [`contracts/events.schema.ts`](contracts/events.schema.ts) so downstream stages can resolve them.
   - **Measure:** 100% of decision events are persisted and retrievable by downstream stages within the same run.
   - **Evidence:** Cross-stage memory integration tests; event-schema validation tests for `decision.*` events.

3. WHEN stale or conflicting memory is detected, THEN the orchestrator SHALL apply the profile's `memory.conflict` policy (`prefer_latest | prompt_user | block`).
   - **Measure:** 100% deterministic handling of memory conflict scenarios; policy enum is exhaustive.
   - **Evidence:** Conflict-policy tests under each enum value.

4. WHEN the workflow ends, THEN memory artifacts SHALL be retained or pruned per the profile's `memory.retention.{tmp_days,durable_days}` knobs and the [retention rules](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md#retention) in `WORKFLOW_OBSERVABILITY_GUIDE.md`.
   - **Measure:** 100% of completed runs apply configured retention policy; pruning honors the live/durable layer split.
   - **Evidence:** Retention-policy tests across both layers.

---

## REQUIREMENT AWO-8: Built-in retrospective and self-improvement loop

**Slice:** M4 (Post-MVP) — not blocking the first PRs

**User story:** As a maintainer, I want automatic retrospectives so that workflow gotchas, recipes, and improvement opportunities are captured without manual postmortems.

### Acceptance criteria

1. WHEN a workflow run reaches a terminal stage, THEN the orchestrator SHALL execute a retrospective stage that writes `tools/metrics/workflow-runs/<YYYY-MM-DD>/<run_id>.retro.md` summarizing blockers, retries, manual interventions, and successful patterns.
   - **Measure:** 100% of terminal runs produce a retrospective artifact at the declared path; file contains all four required sections.
   - **Evidence:** End-to-end tests asserting retrospective generation and file shape.

2. WHEN recurring failures or bottlenecks are detected, THEN the retrospective SHALL emit prioritized improvement recommendations linked to specific event ids from the run's NDJSON tail.
   - **Measure:** Repeated-failure benchmark runs always include ranked recommendations; each recommendation references at least one `event.id` from the source run.
   - **Evidence:** Comparative scenario tests against fixture runs with seeded failure patterns.

3. WHEN new gotchas or recipes are identified, THEN the orchestrator SHALL append them to `assets/catalog/agent_memory.yaml` (creating the file on first use) with timestamps, source `run_id`, and a stable `insight_id`.
   - **Measure:** 100% of tagged insights are persisted to the catalog file with required metadata.
   - **Evidence:** Catalog-append tests with schema validation against the agent_memory entry schema.

4. WHEN recommendations are present in `assets/catalog/agent_memory.yaml`, THEN subsequent runs SHALL load them at orchestrator startup and surface them to stage workers via stage-scoped memory.
   - **Measure:** 100% of subsequent runs load applicable insights and pass them to the relevant stage workers.
   - **Evidence:** Multi-run integration tests with seeded `agent_memory.yaml` entries and assertions that downstream workers receive them.

---

## REQUIREMENT AWO-9: Declared command invocation contract

**Slice:** MVP

**User story:** As a maintainer, I want every executable invocation declared as a `command:` string in the workflow profile so that the surface is uniform, configurable in one place, and impossible to bypass with inline shell.

**Scope:** AWO-9 governs **all executable invocations** — pre-stage gates, post-stage gates, evidence checks, provider calls, retrospective tasks, R2R steps. The schema-level rule is the unified `command:` keyword routed through a single `Executor` adapter; **which** prefixes are permitted is profile data (`execution_policy.allowed_prefixes`), never an engine default. The `mise = verbs / hk = events` split is kb profile-authoring guidance (see [Kb profile authoring convention](#kb-profile-authoring-convention-l3--not-engine-api)), not part of the engine API. **Scope note:** the prefix-validation *algorithm* may be pure engine code; the prefix *values* MUST NOT be hardcoded in engine modules.

### Acceptance criteria

1. WHEN the orchestrator runs any executable invocation, THEN it SHALL resolve a `command:` string from the active workflow profile and execute it; the orchestrator SHALL NOT construct shell strings inline.
   - **Measure:** 100% of orchestrator-initiated invocations come from profile-declared `command:` strings; zero raw shell strings in the workflow implementation modules (`tools/governance/specs/workflow/`) outside the single command-invoker adapter.
   - **Evidence:** Static analysis (ast-grep rule banning `Bun.$\`…\``, `child_process.spawn`, `Bun.spawn` outside the adapter) + integration tests validating the invocation path.

2. WHEN a `command:` string is loaded from a profile, THEN, after collapsing leading/internal whitespace, the command SHALL begin with one of the **active profile's** `execution_policy.allowed_prefixes` entries (a prefix may be multi-word, e.g. `mise run`; matching is whole-prefix `startsWith` on the normalized string at a word boundary, not a single-token compare). `allowed_prefixes` is profile-supplied (≥ 1 entry — the engine embeds **no** default prefixes); commands failing the check SHALL be rejected at profile load with actionable diagnostics. Kb's default profile supplies kb prefixes (`mise run` / `hk check` / `bun run`) in `assets/catalog/workflows/default.yaml`.
   - **Measure:** 100% of accepted commands match the loaded profile's `allowed_prefixes`; 100% of disallowed commands are rejected before any worker dispatch; zero toolchain prefix literals appear in engine (L1) modules.
   - **Evidence:** Policy-enforcement tests using fixture profiles (e.g. `bun run` / `echo` prefixes) covering matched, mismatched, and whitespace cases; static check that engine modules contain no `mise`/`hk`/`gh` prefix constants.

3. WHEN a referenced command target is missing or invalid (resolved by exec-time invocation rather than profile load), THEN the adapter SHALL report a non-zero outcome and the engine SHALL fail the affected stage with status `BLOCKED` and a diagnostic identifying the missing target.
   - **Measure:** 100% of missing-target failures surface as `BLOCKED` with a `diagnostic.code: COMMAND_TARGET_MISSING`.
   - **Evidence:** Negative-path tests with intentionally missing command targets (tool-agnostic fixtures, e.g. a nonexistent `bun run` script).

4. WHEN any `command:` invocation runs, THEN the orchestrator SHALL capture command string, start/end timestamps, exit code, and duration, and emit `task.invoked` / `task.completed` events validated against [`contracts/events.schema.ts`](contracts/events.schema.ts).
   - **Measure:** 100% of invocations emit normalized telemetry; event payloads carry the full command string for audit.
   - **Evidence:** Telemetry-capture tests; event-schema validation tests.

---

## REQUIREMENT AWO-10: YAML workflow profiles for customizable orchestration

**Slice:** MVP

**User story:** As an operator, I want customizable workflow profiles so that different teams can tune stage order, gates, and intervention policy without changing orchestrator code.

### Acceptance criteria

1. WHEN a workflow starts, THEN the orchestrator SHALL load a YAML workflow profile defining stages, transitions, retry policy, memory policy, command bindings, and `execution_policy` (with ≥ 1 `allowed_prefixes`); profile load SHALL validate `execution_policy` and fail fast if it is missing or empty for a runnable profile.
   - **Measure:** 100% of runs bind to a schema-validated profile (including non-empty `execution_policy.allowed_prefixes`) before stage execution.
   - **Evidence:** Profile-load and schema-validation tests, including a profile with missing/empty `execution_policy` (must be rejected).

2. WHEN profile schema validation fails, THEN the orchestrator SHALL block execution and report profile diagnostics.
   - **Measure:** Zero runs proceed with invalid profiles.
   - **Evidence:** Invalid-profile tests.

3. WHEN multiple profiles exist, THEN operators SHALL be able to select a profile per run with deterministic precedence rules.
   - **Measure:** Profile-selection tests pass for default, explicit, and fallback modes.
   - **Evidence:** Profile-resolution integration tests.

4. WHEN profile policy marks a stage as optional, THEN the orchestrator SHALL skip it while preserving audit trace and downstream consistency checks.
   - **Measure:** Optional-stage runs preserve valid transitions and auditable skip records.
   - **Evidence:** Optional-stage scenario tests.

---

## REQUIREMENT AWO-11: Worker runtime sandbox

**Slice:** M4 (Post-MVP) — not blocking the first PRs; see [OQ-8](#open-questions-optional) for process-isolation depth

**User story:** As a maintainer, I want every dispatched stage worker to run within a declared sandbox so that worker actions cannot exceed their declared tool allowlist or filesystem scope.

**Context:** [`SECURITY_GUIDE.md`](../../guides/SECURITY_GUIDE.md) covers **build-time and commit-time** repository safety (gitleaks, dependency CVEs, Electrobun config AST). Runtime worker sandboxing — what tools a dispatched worker can call, which files it can read or write, how it handles secrets — is not currently a project-wide primitive. AWO-11 introduces it as part of the orchestrator.

### Acceptance criteria

1. WHEN a stage defines an **optional** `sandbox` descriptor in the profile, THEN dispatch SHALL honor it, declaring (a) the worker's tool allowlist, (b) the filesystem scope (allowed roots, deny list), (c) the secret-handling mode (`none | passthrough | redacted`), and (d) the network policy (`offline | localhost | declared_hosts`). The field is **optional** — MVP/pre-M4 profiles may omit it (or supply a minimal stub when dispatch is disabled); enforcement semantics land in M4. The descriptor **shape** lives in the profile schema; **enforcement** is an adapter/M4 concern.
   - **Measure:** When present, 100% of worker dispatches honor the descriptor; profile validation accepts profiles that omit `sandbox`; a present descriptor missing a declared sub-field is rejected.
   - **Evidence:** Profile-validation tests (present, absent, partial); dispatcher-binding tests (M4).

2. WHEN a worker attempts an action outside its sandbox descriptor (unlisted tool, out-of-scope path, denied network), THEN the dispatcher SHALL block the action and surface a `BLOCKED` outcome with `diagnostic.code: SANDBOX_VIOLATION`.
   - **Measure:** Zero out-of-scope actions reach execution; 100% of violations are logged with the offending descriptor field.
   - **Evidence:** Violation-injection tests covering each of the four sandbox dimensions.

3. WHEN a sandbox descriptor declares `secret-handling: passthrough`, THEN profile validation SHALL warn and require explicit operator acknowledgment (`acknowledged_unsafe: true`); profile load SHALL fail without acknowledgment.
   - **Measure:** Zero `passthrough` profiles load silently; 100% require the explicit flag.
   - **Evidence:** Profile-load tests; acknowledgment-required tests.

4. WHEN the sandbox blocks an action, THEN the orchestrator SHALL emit a `sandbox.violation` event including the descriptor field, the attempted action (redacted), and the stage in flight.
   - **Measure:** 100% of blocked actions emit `sandbox.violation` events validated against [`contracts/events.schema.ts`](contracts/events.schema.ts).
   - **Evidence:** Event-emission tests under each violation class.

---

## REQUIREMENT AWO-12: Continuity with project guides

**Slice:** MVP

**User story:** As a maintainer, I want the orchestrator to extend the project's canonical contracts so that no parallel lane is introduced and the guides remain the single source of truth.

### Acceptance criteria

1. WHEN the default workflow profile is loaded, THEN its stage-id sequence SHALL be a **superset of the executable `detectPhase()` order** (`specify → plan → analyze-plan → tasks → analyze-tasks → handoff-generate → implement → review`) — the runtime encoding of the [`WORKFLOW_SDD_GUIDE.md`](../../guides/WORKFLOW_SDD_GUIDE.md) phase order. **Superset** means: every `detectPhase()` phase id appears, in the same relative order; the profile MAY interleave additional orchestrator-only stages between them but MUST NOT reorder or omit a `detectPhase()` phase.
   - **Measure:** the Layer-B test extracts the profile's stage ids, filters to the `detectPhase()` set, and asserts that filtered sequence equals `detectPhase()`'s order exactly.
   - **Evidence:** `conformance.script.spec.ts` loads `default.yaml`, composes `detectPhase()` (does not re-derive the order), and asserts the filtered-subsequence equality.

2. WHEN run events are persisted, THEN they SHALL conform to the canonical event base in [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md#event-schema), extended (not forked) with the orchestrator event types in [`contracts/events.schema.ts`](contracts/events.schema.ts). The `mise run spec runs {list|show|tail|prune}` CLI SHALL operate over orchestrator-extended event streams without modification.
   - **Measure:** Every orchestrator event validates against the union of (canonical base) and (extension); `mise run spec runs show <run_id>` succeeds on an orchestrator-produced run.
   - **Evidence:** Schema-compat tests; CLI integration test against a fixture run.

3. WHEN the kb default profile references repository safety primitives from [`SECURITY_GUIDE.md`](../../guides/SECURITY_GUIDE.md) (gitleaks, dependency CVE checks, Electrobun config AST), THEN those SHALL be expressible as ordinary `command:` bindings, and an **optional profile lint** (`profile_guide_crossref.script.ts`) MAY assert each such command is documented in the guide. Maintaining a command inventory is **not** an engine responsibility.
   - **Measure:** When the optional lint runs, 100% of safety commands in `default.yaml` resolve to documented `SECURITY_GUIDE.md` entries; the engine/runtime carries no command catalog.
   - **Evidence:** `profile_guide_crossref` test (kb-only) **or** a manual checklist — not `orchestrator.script.ts` logic.

4. WHEN the canonical event base in [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md) bumps without a corresponding extension bump, OR the live tail and durable archive write different schema versions, THEN the orchestrator SHALL hold archive writes and emit a `continuity.violation` event identifying the offending field. Terminal success SHALL be blocked until resolved.
   - **Measure:** Zero terminal-success outcomes with a `continuity.violation` event in the run log.
   - **Evidence:** Failure-injection tests with the canonical base bumped without an extension catch-up.

---

## REQUIREMENT AWO-13: Graceful shutdown and cooperative cancellation

**Slice:** M1

**User story:** As an operator, I want to abort the orchestrator without leaving the workspace in a half-written state so that resume is always safe.

### Acceptance criteria

1. WHEN the orchestrator receives `SIGINT` or `SIGTERM`, THEN it SHALL trap the signal, transition any in-flight stage to `blocked` with `diagnostic.code: SHUTDOWN_REQUESTED`, and signal the in-flight worker actor to cancel with a bounded grace period (default 10s, profile-overridable).
   - **Measure:** 100% of trapped signals result in a graceful transition to `blocked`; zero force-kills during the grace period; force-kill only after the grace period elapses.
   - **Evidence:** Signal-injection tests over fast and slow workers; grace-period boundary tests.

2. WHEN the orchestrator shuts down, THEN the xstate snapshot SHALL be rewritten atomically (`<run_id>.state.json.tmp` → `<run_id>.state.json`) before process exit, capturing the cancellation diagnostic.
   - **Measure:** 100% of graceful shutdowns produce a consistent snapshot; zero orphaned `.tmp` files post-exit.
   - **Evidence:** Crash-and-restart tests asserting snapshot integrity; orphan-file sweep tests.

3. WHEN orchestration resumes after a graceful shutdown, THEN the actor SHALL rehydrate from the persisted snapshot and use the worker's `idempotency_key` to avoid re-dispatching the cancelled attempt; if the previous worker completed before the cancel signal arrived, the captured envelope SHALL be honored without re-running the worker.
   - **Measure:** Zero double-dispatches across shutdown / resume cycles; envelopes captured pre-shutdown are honored on resume.
   - **Evidence:** Resume-after-shutdown tests covering (a) worker mid-flight, (b) worker completed but envelope not yet processed, (c) worker dispatched but not started.

4. WHEN side-effect actors (per [AWO-5](#requirement-awo-5-safe-delegation-to-stage-specific-subagents) AC5) are in flight at shutdown, THEN they SHALL be sent a cancel signal with the same grace period; their lifecycle SHALL emit `task.completed` with status `cancelled` and a `cancellation_reason` field.
   - **Measure:** 100% of in-flight side-effect actors emit a terminal `task.completed` event during graceful shutdown; zero actors leak past the grace period.
   - **Evidence:** Actor-lifecycle tests with mid-flight teardown actors and signal injection.

---

## Non-functional requirements (NFRs)

NFRs live alongside acceptance criteria to keep performance and operational
budgets explicit. Baselines and current measurements are tracked in
`tools/metrics/baselines/workflow.json`.

### Performance budgets

| Concern                                                       | Budget       | Source AC         |
| ------------------------------------------------------------- | ------------ | ----------------- |
| Orchestrator overhead per transition (excluding worker time)  | ≤ 50 ms p95  | AWO-1.1, AWO-4.1  |
| Profile load + TypeBox validation                             | ≤ 100 ms p95 | AWO-10.1, AWO-9.3 |
| Snapshot write to `tmp/workflow-runs/<date>/<id>.state.json`  | ≤ 20 ms p95  | AWO-4.1           |
| Event append to `tmp/workflow-runs/<date>/<id>.ndjson`        | ≤ 5 ms p95   | AWO-4.1, AWO-9.4  |
| Resume from persisted snapshot (cold)                         | ≤ 250 ms p95 | AWO-4.2, AWO-3.4  |
| Terminal archive dual-write to `tools/metrics/workflow-runs/` | ≤ 200 ms p95 | AWO-4.4           |

### Retry knob defaults (overridable in profile)

| Knob                       | Default           | Notes                                       |
| -------------------------- | ----------------- | ------------------------------------------- |
| `retry.max_attempts`       | 3                 | Per stage, not per workflow                 |
| `retry.backoff`            | `exponential`     | `linear` and `constant` also supported      |
| `retry.base_ms`            | 500               | Initial wait                                |
| `retry.cap_ms`             | 30000             | Max single wait                             |
| `retry.jitter`             | `full`            | `full`, `equal`, or `none`                  |
| `retry.reset_on_new_cause` | `true`            | Distinct diagnostic codes reset the counter |
| `retry.escalation_event`   | `stage.escalated` | Event type emitted when budget exhausted    |

### Worker timeout knobs (overridable per stage in profile)

| Knob                  | Default | Notes                                                                 |
| --------------------- | ------- | --------------------------------------------------------------------- |
| `worker.timeout_ms`   | 300000  | Max wall-clock time for a stage worker's primary execution (5 min)   |
| `worker.dispatch_ack_ms` | 10000 | Max wait for worker to emit first progress signal after dispatch (10s) |

Timeout counts as a `RETRYABLE_FAILURE` and is subject to the profile's retry policy (max 3 attempts, backoff). When the retry budget is exhausted, the orchestrator escalates per the normal escalation path (same as any exhausted retry budget).

### Concurrency

Sequential-by-default. v1 rejects `parallel: true` in profile validation;
reserved for v2.

---

## Test enforcement layers (not a product catalog tag)

Per [`DOC_AUTHORITY.md`](../../guides/DOC_AUTHORITY.md), a **catalog key**
`@<key>` belongs to a shipped *product* feature, a **workflow profile** is a
*process* artifact, and an **AC slice** `@ac:` belongs to a feature handoff.
The orchestrator is **infrastructure**, so it does not claim
`@agentic_workflow_orchestrator` as a product catalog tag. Every requirement
still maps to an executable owner (`test` | `type` | `astgrep`) before its
slice ships — via the layers below, not a Gherkin product tag.

| Layer | What it enforces | Where | Run |
| ----- | ---------------- | ----- | --- |
| **A — Runtime** | Envelopes, snapshots, command invocation, sandbox, shutdown (most AWO) | `tools/governance/specs/workflow/**/*.spec.ts` | `bun test --config /dev/null tools/governance/specs/workflow/` |
| **B — Guide conformance** | AWO-12: default profile's stage order matches [`WORKFLOW_SDD_GUIDE.md`](../../guides/WORKFLOW_SDD_GUIDE.md) phase list | integration test loading `assets/catalog/workflows/default.yaml` | same Layer-A runner |
| **C — Product / release** | Only if/when the operator CLI becomes shipped product behavior | `assets/features/<domain>.feature` with `@<catalog_key>` | catalog runner — **deferred** until operator-facing |

**Fixtures:** orchestrator tests use synthetic feature-dir stubs under
`tools/__tests__/fixtures/workflow/` — never the live state of any
`assets/specs/NNN-*` folder (which would flake as that spec evolves).
Handoff AC slices (`@ac:`) stay on feature handoff tables, not on
orchestrator meta-tests.

## Assumptions (optional)

- Workflow progression is observable from **repo artifacts** (filesets + checklist markers) and verifiable through **declared commands** (`mise run spec audit / lint / trace / gate`, `hk` profiles) — the orchestrator does **not** call `speckit.*` programmatically. See [`WORKFLOW_SDD_GUIDE.md`](../../guides/WORKFLOW_SDD_GUIDE.md) § orchestrated-handoff.
- Worker execution happens at documented seams (`implement-src`, `gherkin-bdd-handoff`, `review-fix`); v1 dispatch is opencode via `mise run spec handoff-generate … --dispatch`. Speckit `/speckit-*` skills stay the parallel human/agent path.
- Stage workers can be constrained to emit envelopes validated by the [AWO-2](#requirement-awo-2-strict-stage-outcome-contract-and-evidence-validation) TypeBox schema.
- Local workspace contains enough context to infer common defaults per [AWO-3](#requirement-awo-3-human-intervention-minimization-policy) AC1.
- Existing quality gates remain unchanged and are invoked as evidence checks through declared `command:` bindings.
- PR and CI integrations are available through profile-bound commands; the default profile binds `gh` for PR ops and `gh pr checks` for CI status, but the orchestrator does not depend on either by name.
- `xstate` is an acceptable runtime dependency; the machine definition lives in the pure workflow modules under `tools/governance/specs/workflow/` and is testable without an actor.
- `hk.pkl` profile names (`commit / pr / ci / full / slow`) are stable enough to be referenced from **kb** workflow profiles per [`SECURITY_GUIDE.md`](../../guides/SECURITY_GUIDE.md#hk-profile-policy). This is a kb-profile (L3) assumption only — the engine is toolchain-agnostic and references no hk/mise names.
- LogTape adoption ([OQ-6](#open-questions-optional)) is conditional: if a thin wrapper over NDJSON emission lands cheaply, it is adopted; otherwise the orchestrator stays on direct NDJSON.

## Open questions (optional)

| #    | Question                                                                                                                                                                                                | Status                 | Notes                                                                                                                                                                                                                                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-1 | Should orchestration state live under `tmp/` or a dedicated persisted runtime path?                                                                                                                     | Resolved               | Dual-write, sibling-flat per [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md#file-layout-sibling-flat). Live state at `tmp/workflow-runs/<date>/<id>.ndjson`; terminal events promoted to `tools/metrics/workflow-runs/<date>/<id>.ndjson`. See State model + data-model.md.                                            |
| OQ-2 | Should quality gate run only at terminal stage or as stage-level evidence for implement and review transitions?                                                                                         | Resolved               | Stage-level evidence for implement and terminal full run by default profile.                                                                                                                                                                                                                                                          |
| OQ-3 | Which profile file path should be canonical for workflow YAML definitions?                                                                                                                              | Resolved               | `assets/catalog/workflows/<name>.yaml`, indexed in `assets/catalog/catalog.yaml`. Precedence: `--profile <name>` → `.specify/profile.yaml` → `assets/catalog/workflows/default.yaml` → built-in.                                                                                                                                      |
| OQ-4 | Which provider does the default profile bind for `pr_open` / `pr_update` / `ci_status` in v1?                                                                                                           | Resolved               | `gh pr create`, `gh pr edit`, `gh pr checks`. The orchestrator does not depend on these by name; swapping the provider is a profile change ([AWO-6](#requirement-awo-6-pr-and-ci-green-completion-contract-provider-agnostic) invariant).                                                                                             |
| OQ-5 | Does the retrospective stage write only to `tools/metrics/workflow-runs/`, or also append cross-run guidance to `assets/catalog/agent_memory.yaml`?                                                     | Resolved               | Both. Per-run artifact lands at `tools/metrics/workflow-runs/<date>/<run_id>.retro.md`; cross-run guidance is appended to `assets/catalog/agent_memory.yaml` (creating the catalog entry on first use) so [AWO-8](#requirement-awo-8-built-in-retrospective-and-self-improvement-loop) AC4 is trivially satisfied on subsequent runs. |
| OQ-6 | Adopt LogTape in `tools/`, or stay on direct NDJSON emission?                                                                                                                                           | Resolved (conditional) | Adopt LogTape **only if** it lands as a thin wrapper over `O_APPEND` NDJSON emission and preserves the [`WORKFLOW_OBSERVABILITY_GUIDE.md`](../../guides/WORKFLOW_OBSERVABILITY_GUIDE.md) contract verbatim. Otherwise defer. Decision belongs in the implementation plan after a small spike.                                                           |
| OQ-7 | Should `hk.pkl` declare a new `workflow` profile dedicated to orchestrator-driven gate bundles, or only reuse `commit / pr / ci / full / slow`?                                                         | Resolved               | Reuse the existing profiles. Adding a new profile bloats the hk surface for no operational gain.                                                                                                                                                                                                                                      |
| OQ-8 | Should AWO-11 introduce a `process-isolation` mode (subprocess sandbox via `bun spawn` with deny-by-default capabilities) in v1, or stay declarative (descriptor + enforcement at dispatcher boundary)? | Open                   | Declarative in v1 keeps the surface small; process isolation is a clear v2 follow-up if descriptor-based enforcement proves insufficient.                                                                                                                                                                                             |
| OQ-9 | Should command-prefix allowlist defaults live in the engine or the catalog? | Resolved | Catalog + adapter only. The L1 engine carries **no** toolchain defaults; `execution_policy.allowed_prefixes` is required profile data, supplied by kb only in `assets/catalog/workflows/default.yaml`. |
