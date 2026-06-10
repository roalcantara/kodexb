<!-- markdownlint-disable-file -->

# Research — `009-agentic-workflow-orchestrator`

Phase 0 tech-choice decisions. The three high-impact **design** unknowns
(progression authority, envelope transport, operator input mechanism) were
resolved in [`/speckit-clarify`](./spec.md#clarifications) and are not
re-litigated here. This file records the remaining **technology** choices.

## Decision: xstate as the state-machine kernel

- **Decision:** Use `xstate` for states, transitions, guards, and snapshot persistence. The pure machine definition lives in `tools/governance/specs/workflow/machine.ts` (no I/O); the actor lives in `orchestrator.script.ts`.
- **Pinned version:** `5.32.0` (via `bun add xstate` on 2026-06-09).
- **Rationale:** First-class persisted snapshots (`actor.getPersistedSnapshot()` / `createActor(machine, { snapshot })`) give AWO-4 resume for free; invoked/spawned actors give AWO-5 AC5 fire-and-forget teardown; guards encode the AWO transition precedence declaratively. Building a bespoke machine would re-implement exactly these, slower and less testable.
- **Alternatives considered:** hand-rolled switch/reducer (rejected — reinvents persistence + guard composition); Temporal/Restate/Inngest (rejected — require a server/cloud, violate local-first scope); LangGraph (rejected — Python-first, deferred unconditionally by the observability guide).

## Decision: persist xstate snapshot opaquely

- **Decision:** Store `getPersistedSnapshot()` output as an opaque field inside the TypeBox `PersistedRunState` wrapper (`<run_id>.state.json`), validated only at the wrapper level; xstate validates the snapshot on rehydrate.
- **Rationale:** The snapshot shape is xstate's contract, not ours; wrapping it keeps our schema stable across xstate minor versions while still versioning the wrapper.
- **Alternatives considered:** modelling every state field in TypeBox (rejected — duplicates xstate internals, brittle on upgrade).

## Decision: extend the existing `WorkflowEvent` union — do not fork

- **Decision:** Add the orchestrator event types as **additive members** of the `WorkflowEvent` union already exported by `tools/governance/specs/workflow/workflow_run.script.ts`, and reuse `WorkflowRunWriter` for all NDJSON appends.
- **Rationale:** AWO-12 requires extension, not a parallel lane; the `runs_cli` reader and retention already operate over that union, so reuse keeps the read surface and OBSERVABILITY_GUIDE contract intact. A second writer would risk the dual-writer race the project already guards against.
- **Alternatives considered:** a separate `orchestrator_run.script.ts` writer (rejected — duplicate NDJSON path, divergent schema versioning, breaks `runs show`).

## Decision: profile = YAML in catalog, validated by TypeBox at load

- **Decision:** Workflow profiles are YAML under `assets/catalog/workflows/`, parsed with Bun's YAML and validated via `Value.Check(ProfileSchema, …)` at load; `mise run catalog validate` imports the same schema. Profile load fail-fasts with diagnostics (AWO-10.2, AWO-9.3).
- **Rationale:** Matches the catalog "ARE" plane and existing `catalog validate` plumbing; one schema, two consumers (loader + catalog validation).
- **Alternatives considered:** JSON profiles (rejected in spec Clarifications — YAML readability); JSON Schema instead of TypeBox (rejected — TypeBox is the repo-wide validator).

## Decision: Executor port + profile-owned execution policy (tool-agnostic)

- **Decision:** The engine (L1) defines an `Executor` port — `run(opaque command descriptor) → exit code + streams` — and never spawns. A single L2 adapter (`command_invoker.script.ts` / kb executor) implements it: `Bun.spawn` lives only there, and it enforces the **active profile's** `execution_policy.allowed_prefixes`. The engine embeds **no** default prefixes and no `mise`/`hk`/`bun`/`gh` constants; prefix values are catalog data (kb supplies them in `default.yaml`). An ast-grep rule bans `Bun.spawn` / `child_process` outside the adapter. The prefix-validation **algorithm** may be pure; the prefix **values** are never hardcoded in engine modules.
- **Rationale:** Makes the engine reusable across catalogs (kb desktop, a future web app with `pnpm`/`nx`) — extractability is a prerequisite, not a follow-up. Still satisfies AWO-9's uniform, bypass-proof surface. The mise=verbs / hk=events split moves to kb profile-authoring guidance (MISE_GUIDE / WORKFLOW_GUIDE), not engine code.
- **Alternatives considered:** baked-in `DEFAULT_COMMAND_ALLOWLIST = ['mise run','hk check','bun run']` in the schema module (rejected, review 002 — couples the engine to kb's toolchain, blocks reuse); per-call spawn scattered across modules (rejected — unauditable, policy unenforceable).

## Decision: capture worker envelope via file convention

- **Decision (from Clarifications):** Workers write `<run_id>.envelope.<stage>.json`; the dispatcher reads + `Value.Check()`s it. A missing/invalid file surfaces `BLOCKED`, never a crash.
- **Rationale:** Deterministic and test-friendly; matches the sibling-flat run layout and the existing handoff-file pattern; avoids stdout-interleaving fragility.
- **Alternatives considered:** stdout parsing (rejected — fragile); per-profile mode switch (rejected — doubles dispatcher surface for v1).

## Open (deferred to implementation, not blocking design)

- **LogTape adoption** (OQ-6): adopt only if it is a thin wrapper over the existing `O_APPEND` NDJSON path; otherwise stay on the current writer. Spike during MVP.
- **Sandbox process-isolation depth** (OQ-8, AWO-11 / M4): declarative descriptor first; subprocess capability isolation is a v2 follow-up.
