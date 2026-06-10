<!-- markdownlint-disable-file -->

# Tool-Agnostic + MVP Requirements Checklist: Agentic workflow orchestrator (`009`)

**Purpose**: Requirements-quality gate ("unit tests for English") for the L1–L4 tool-agnostic layering invariants and the MVP-slice requirements (AWO-2, 4, 9, 10, 12). Validates that the requirements are complete, clear, consistent, and measurable — **not** that any code works.
**Created**: 2026-06-09
**Feature**: [`spec.md`](../spec.md) · [`plan.md`](../plan.md) · [`tasks.md`](../tasks.md) · [`review/002/tool-agnostic-engine-review.md`](../review/002/tool-agnostic-engine-review.md)
**Audience/Depth**: Reviewer (PR) gate · Standard

> **Resolution pass — 2026-06-09.** All 33 items addressed. Items needing a spec/contract edit are marked **FIXED** with the change; the rest were already satisfied (**OK**).

## Tool-agnostic layering invariants (L1–L4)

- [x] CHK001 - Is the prohibition "L1 engine MUST NOT contain `mise`/`hk`/`bun`/`gh`/`speckit` identifiers…" stated as a verifiable requirement? [Clarity, Spec §Tool-agnostic engine boundary] — **OK**: invariants bullet + AWO-9 AC2 static-check Evidence.
- [x] CHK002 - Is L1 vs L2 defined with an unambiguous boundary? [Clarity, Spec §Glossary] — **OK**: Glossary Engine (L1) / Runtime adapter (L2) rows.
- [x] CHK003 - Are layer responsibilities specified without overlap/gap (who owns prefix enforcement)? [Consistency] — **OK**: layer table (L2 applies policy) + AWO-9 scope note (algorithm may be L1, enforcement L2).
- [x] CHK004 - Measurable AC proving absence of toolchain literals in L1? [Measurability, Spec §AWO-9 AC2] — **OK**: AC2 Evidence = static check / grep guard.
- [x] CHK005 - Where `Bun.spawn` is permitted + violation detection? [Completeness, Spec §AWO-9 AC1] — **OK**: ast-grep rule banning spawn outside adapter.
- [x] CHK006 - `detectPhase()` stays kb-specific, consistent across spec/plan/review? [Consistency] — **OK**: boundary invariant + plan reuse + review §06 agree.

## execution_policy & command binding (AWO-9)

- [x] CHK007 - `allowed_prefixes` required with min cardinality ≥ 1? [Completeness] — **OK**: AWO-10 AC1 + `ExecutionPolicy` minItems 1.
- [x] CHK008 - No engine defaults; "no `DEFAULT_COMMAND_ALLOWLIST`" stated as a requirement? [Clarity] — **OK**: Out-of-scope bullet + OQ-9 + AC2.
- [x] CHK009 - Algorithm-vs-values distinction testable? [Clarity, Spec §AWO-9 scope note] — **OK**: scope note explicit.
- [x] CHK010 - Is the prefix-match rule unambiguous (whitespace, multi-word like `mise run`)? [Ambiguity] — **FIXED**: AC2 reworded from "first significant token" to whitespace-normalized whole-prefix `startsWith` at a word boundary (handles `mise run`).
- [x] CHK011 - Prefix-not-allowed (load) vs target-missing (exec → `BLOCKED`/`COMMAND_TARGET_MISSING`) distinguished? [Consistency] — **OK**: AC2 vs AC3.
- [x] CHK012 - `command:` opaque to engine? [Clarity, Spec §Glossary] — **OK**: Glossary "opaque to the engine."

## Outcome envelope & evidence (AWO-2)

- [x] CHK013 - `EvidenceEntry.kind` toolchain-neutral consistently? [Consistency, Conflict] — **FIXED**: `contracts/envelope.schema.ts` kinds now `command | artifact | marker` (removed `mise_task`/`hk_profile`); MVP-ENGINE-01 updated. Repo grep: no leaks in spec/contracts/data-model.
- [x] CHK014 - Progression authority rule unambiguous, no contradiction? [Consistency, Spec §Clarifications] — **OK**: Clarifications + AWO-2 AC3 aligned.
- [x] CHK015 - Envelope fields enumerated with types, optionals marked? [Completeness, Spec §AWO-2 AC1] — **OK**: AC1 + `envelope.schema.ts`.
- [x] CHK016 - Envelope-file transport + absent/malformed → `BLOCKED`? [Coverage, Edge Case, Spec §AWO-5 AC1] — **OK**.
- [x] CHK017 - `BLOCKED` vs `evidence_pending` predictable? [Clarity, Spec §State model] — **OK**: precedence rules.
- [x] CHK018 - `command` evidence defers to adapter (engine never spawns)? [Consistency, Spec §AWO-2 AC3] — **FIXED**: AC3 now says a `command` entry runs through the L2 Executor adapter; `artifact`/`marker` evaluated by the engine. Removed the "(mise task / hk profile)" leak.

## Profile loading (AWO-10) & persistence (AWO-4)

- [x] CHK019 - Fail-fast on missing/empty `execution_policy` with diagnostics? [Completeness, Spec §AWO-10 AC1] — **OK**.
- [x] CHK020 - `sandbox` optionality consistent (spec/contracts/data-model)? [Consistency, Spec §AWO-11 AC1] — **OK**.
- [x] CHK021 - Persistence layout consistent, no residual `events.jsonl`? [Consistency, Spec §State model] — **OK**: grep clean.
- [x] CHK022 - MVP-persistence vs M1-resume boundary drawn? [Clarity, Spec §AWO-4 banner] — **OK**.
- [x] CHK023 - "Extend the existing union/writer" binding (no second writer)? [Clarity, Spec §AWO-12 AC2] — **OK**.

## Layer-B conformance (AWO-12)

- [x] CHK024 - `default.yaml` stage order pinned to one authoritative order referenced by spec + tasks? [Completeness, Spec §Default profile] — **FIXED**: Default-profile note + AWO-12 AC1 now name the **executable `detectPhase()` order** as the single anchor (spelled out), with the SDD guide as narrative authority; tasks header already uses it.
- [x] CHK025 - AWO-12 AC3 = optional profile lint, "no command inventory in engine"? [Clarity] — **OK**.
- [x] CHK026 - "Superset" testable (extra stages allowed, order-match meaning)? [Measurability, Spec §AWO-12 AC1] — **FIXED**: AC1 now defines superset as filtered-subsequence equality against `detectPhase()` (no reorder/omit; interleaving allowed) with a concrete Measure.

## Measurability of MVP acceptance criteria

- [x] CHK027 - Every MVP AC has Measure + executable Evidence? [Measurability] — **OK**: AWO-2/4/9/10/12 ACs carry both.
- [x] CHK028 - NFR budgets tied to a named baseline artifact? [Measurability, Spec §NFRs] — **OK**: `tools/metrics/baselines/workflow.json`.
- [x] CHK029 - AWO-3 AC1 threshold deferred to a named plan artifact? [Clarity] — **OK**: "threshold set by the baseline task in the plan."

## Dependencies, assumptions & cross-artifact consistency

- [x] CHK030 - `xstate` dep + "no `packages/` move" consistent across spec/plan/research? [Consistency, Assumption] — **OK**.
- [x] CHK031 - "hk/mise names stable" scoped to kb profiles (L3)? [Consistency, Spec §Assumptions] — **OK**.
- [x] CHK032 - Slice→requirement assignments agree across spec banners / plan table / tasks? [Consistency, Conflict] — **OK**: verified all 13 banners (MVP 2,4,9,10,12; M1 1,5,13; M2 3,7; M3 6; M4 8,11) match plan + tasks.
- [x] CHK033 - `spec resume` vs `spec workflow resume` flagged, not asserted inconsistently? [Conflict, Tasks §M1-CLI-01] — **OK**: spec uses `spec workflow resume`; M1-CLI-01 confirms that choice (decision deferred to CLI wiring, not contradictory).

## Notes

- All 33 items resolved on 2026-06-09: **5 FIXED** (CHK010, CHK013, CHK018, CHK024, CHK026 — all toolchain-leak / ambiguity removals), **28 OK** (already satisfied).
- `mise run spec lint` passes on the feature dir after the edits.
- Traceability: every item cites a spec section or a `[Gap]`/`[Conflict]`/`[Assumption]` marker.
