# src cohesion consolidation — Tasks

Dependency-ordered index. Full steps, code, and acceptance gates in
[`plan.md`](./plan.md); requirements in [`spec.md`](./spec.md). Check a box only
when that task's **Acceptance gate** passes.

## Phase A — COH-1 logging regroup (`src/shared/logging`, 10→7 non-spec)
- [ ] **T101** Merge 3 RPC plugins → `rpc.plugin.ts` (+ merge 3 specs) — *gate:* COH-1 AC1
- [ ] **T102** Fold `renderer_build_env.ts` → `renderer.config.ts` — *gate:* COH-1 AC2
- [ ] **T103** De-dup `index.ts` (re-export logtape from `./logger`) — *gate:* COH-1 AC3, AC4, AC5

## Phase B — COH-2 abstraction merges (8 non-spec deletions)
- [ ] **T104** Cohesion inventory with merge-bar verdicts + importer evidence — *gate:* COH-2 AC1
- [ ] **T105** `doc.parser.ts` dispatch family — move `buildPreamble`, privatize 5 builders — *gate:* COH-2 AC2
- [ ] **T106** Encapsulate `extract_keywords` + `cooccurrence` into `rank_suggested_tags` — *gate:* COH-2 AC3
- [ ] **T107** Encapsulate `is_actionable` + `is_overdue` into `filter_by_view` — *gate:* COH-2 AC4, AC5, AC6

## Phase C — COH-3 ls-lint strengthening (gated spike)
- [ ] **T108** Spike: expressibility + per-suffix blast radius → PROCEED/DEFER verdict — *gate:* COH-3 AC1, AC2
- [ ] **T109** Conditional: PROCEED → additive `.ls-lint.yml` + ≤10 renames; DEFER → no change — *gate:* COH-3 AC3 or AC4

## Phase D — Closeout
- [ ] **T110** Closeout metrics, register `src_cohesion` catalog key, full `mise run spec ready` — *gate:* DoD 1–6

**Hard invariants (every task):** behaviour frozen (baseline spec green → green);
merges move existing code verbatim (drop `export` to privatize); no edits to
`biome.jsonc`, `.dependency-cruiser.cjs`, `knip.jsonc`; `.ls-lint.yml` only in
T109 and only if the spike says PROCEED; commit after each green task.
