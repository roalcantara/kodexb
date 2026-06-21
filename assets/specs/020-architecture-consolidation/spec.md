<!-- markdownlint-disable-file -->

# Architecture consolidation (final increment)

**Feature Branch**: `020-architecture-consolidation`
**Release**: v0.x
**Status**: Draft

**Input**: The last planned architectural increment. Pay down the structural debt
in `src/shell/` — God files (`App` 322 LOC), bad abstractions (the list-page `p`
prop-bag), tangled transport (`client.ts` 311 LOC), scattered overlay state,
catch-all dirs — and move misplaced domain logic into `core` (FCIS). Promote the
P1.1 + selected P2/P3 items into one **phased, behaviour-frozen** spec, and
**extend the `role-conformance` harness** into an architecture-health guard so the
debt classes that slipped past existing gates (suppressions hiding God methods)
are tracked and ratcheted forever. Built for an implementer (GLM 5.2) with zero
drift.

## Introduction

016–019 made the codebase naming/role/cohesion-clean. What remains is **structure**:
the gate (biome complexity rules, file-size caps) did not *prevent* the God files
because `// biome-ignore` lets a God method slip through silently. 020 (a) extends
the standing metric so suppressions and oversized files are tracked like
`mislabeledUtilCount`, then (b) executes six behaviour-frozen phases that dissolve
the debt, ratcheting the metric to a new floor.

Phases run **0 → F → A → C → B → D → E**: extend the guard first (capture the
"before"), move domain logic to core (thins the shell files A then reorganizes),
decompose the backend, then the renderer, with **relocations last** so structural
refactors don't get re-moved (the 017 lesson).

## Clarifications

### Session 2026-06-21
- Q: Package shape? → A: **One 020 spec, ordered phases**, each behaviour-frozen + independently gated.
- Q: Include FCIS domain moves (TaskView/BindingRef/task policy/overdue rules → core)? → A: **Yes**, as Phase F — completes the architectural sweep.
- Q: Success metric? → A: **Extend the `role-conformance` harness** into a standing architecture-health guard (`structuralSuppressionCount`, `maxFileLoc`, `oversizedFileCount`), north-star `structuralSuppressionCount → 0`, ratcheted — because the existing gate let God files slip through.
- Q: Sequencing? → A: **0 → F → A → C → B → D → E** (relocations last).
- Q: Decompose `shell_hooks.util.ts`? → A: **Yes** — split by concern into single-word, vocabulary-valid modules placed **by domain** (frame-compute → `window/` placement geometry; launcher/window consts → `window/window.const.ts`; deferred-sync-emit → `app/lib/sync/`; contracts → `.types.ts`). (Not `.options`/`.factory`, and no `placement.adapter` collision — see ARCH-6 AC4; exact leaves in the plan.)
- Q: TypeBox Schema-Driven Literal Unions (P2-2)? → A: **Yes**, derive literal unions in `payload_schemas.ts` from core constants via `literalUnion()`.
- Q: TypeBox Static Schema Derivation for Response Types (P2-8)? → A: **Yes**, define TypeBox schemas for response types (e.g. `ListStats`, `BindingRef`, etc.) and derive types in `desktop_rpc_schema.ts`.
- Q: DRY stats compilation (P2-6)? → A: **Yes**, derive ListStats counts via `byType` from `ENTRY_TYPE_VALUES` and remove redundant top-level fields.

## Authority

| Topic | Authority |
| ----- | --------- |
| Role/architecture metric harness + baseline | `packages/ops/src/metrics/harnesses/role-conformance/`; `tools/metrics/baselines/role-conformance/baseline.json`; `mise run audit roles baseline\|compare` |
| FCIS layer + forbidden imports | [`FCIS.guide.md`](../../guides/FCIS.guide.md), [`CLAUDE.md`](../../../CLAUDE.md), `.dependency-cruiser.cjs` |
| Naming + role suffixes + single-word doctrine | [`CODESTYLE_GUIDE.md`](../../guides/CODESTYLE_GUIDE.md), [`adr/0001-role-suffix-taxonomy.md`](../../guides/adr/0001-role-suffix-taxonomy.md) |
| ls-lint enforcement | `.ls-lint.yml`; 017 COH-3 spike |
| Backlog promoted | [`TODO.md`](../../../TODO.md) § P1.1 (+ promoted P2-2/3/4/5/6/7/8, P3-1/2/4/6/7/8) |
| Completion gate | `mise run spec ready ${featureDir} --key ${catalogKey}` |

## Out of scope

- The full `features/` tree migration (P3-10) — explicitly fenced off as a big-bang; remains a separate future effort.
- New product behaviour, or changes to the renderer↔main **wire format** / observable output — frozen. Phase F MAY refactor internal **type definitions** (give response types TypeBox schemas; restructure `ListStats` to `byType`) **only when** every consumer is updated in lockstep and the rendered result is byte-identical.
- Splitting files **not** named in a phase (e.g. `entry.repository.ts`, `task.routes.ts`) — `oversizedFileCount` need not reach 0; only the targeted God files must drop.
- Relaxing any biome/depcruise/knip rule, or adding any `// biome-ignore` (the metric forbids new ones).

## Glossary

| Term | Meaning |
| ---- | ------- |
| **structuralSuppressionCount** | Count of `// biome-ignore lint/complexity/*` and `lint/style/noExcessiveLinesPerFile` in `src/**` non-spec — the team's own admissions of structural debt. |
| **God file** | A non-spec `src/` file > 250 LOC, typically carrying a complexity suppression. |
| **behaviour-frozen** | Refactor/relocate only; observable behaviour, public exports' signatures, and route/RPC contracts unchanged; pre-existing specs pass with only mechanical (import/filename) edits. |
| **named contract** | An explicit, typed prop/parameter object with a single responsibility — the replacement for the opaque `p` (`ListPageShell`) bag. |

---

## REQUIREMENT ARCH-0: Extend the architecture-health metric (Phase 0)

**User story:** As a maintainer, I want suppressions and oversized files tracked
and ratcheted like `mislabeledUtilCount`, so God files cannot silently reappear.

### Acceptance criteria
1. WHEN the harness classifies `src/`, THEN `role_conformance_core` SHALL also compute `structuralSuppressionCount` (occurrences of `biome-ignore lint/complexity/` or `lint/style/noExcessiveLinesPerFile` in non-spec sources), `maxFileLoc`, and `oversizedFileCount` (non-spec files > 250 LOC, excluding `src/__tests__/`).
   - **Measure:** `baseline.json` `results` gains the three keys; unit tests cover suppression-counting and the 250-LOC threshold.
   - **Evidence:** `bun test ./packages/ops/src/metrics/harnesses/role-conformance/…` green.
2. WHEN `compare` runs, THEN it SHALL flag a violation when any of `structuralSuppressionCount`, `maxFileLoc`, or `oversizedFileCount` **increases** versus the baseline (mirroring the existing `mislabeledUtilCount` drop check).
   - **Measure:** A synthetic increase produces a `violations` entry and `summary: FAIL`.
   - **Evidence:** `bun test ./packages/ops/src/metrics/harnesses/role-conformance/role_conformance.script.spec.ts` (regression case) green; then `mise run audit roles compare` exits 0 (PASS) at baseline.
3. WHEN Phase 0 lands, THEN the "before" baseline SHALL be committed: `structuralSuppressionCount = 13`, `maxFileLoc = 322`, `oversizedFileCount = 6` (excluding the test factory), recorded in `closeout-metrics.txt` as the start row.
   - **Measure:** Committed `baseline.json` + closeout start row.
   - **Evidence:** `TOOLS_GUIDE` `role-conformance` row updated to list the new metrics.

---

## REQUIREMENT ARCH-1: FCIS domain moves to core (Phase F)

**User story:** As a maintainer, I want domain types/policy in `core`, so the shell
only orchestrates and stops duplicating models.

### Acceptance criteria
1. WHEN `TaskView` is relocated (P2-3), THEN it SHALL be defined in `core`; `task_view_order.const.ts`, `count_by_view.util.ts`, `filter_by_view.util.ts` SHALL import it from core (not `@shared/rpc`); `desktop_rpc_schema.ts` MAY keep a deprecated re-export.
   - **Measure:** `rg "@shared/rpc" src/core | rg TaskView` → **0**.
   - **Evidence:** core + renderer specs green; depcruise green.
2. WHEN `BindingRef` is consolidated (P2-4), THEN it SHALL have **one** core definition; the duplicate in `binding.repository.ts` and the hand-written shape in `desktop_rpc_schema.ts` SHALL re-export/derive from core.
   - **Measure:** `rg 'type BindingRef|interface BindingRef' src` → **1** owning definition.
   - **Evidence:** `bun test src/shell/app/db` green; RPC contract unchanged.
3. WHEN task policy moves (P2-5), THEN `wouldCreateCycle()` (cycle detection) and the create-task tag normalization SHALL live in pure core policy; shell calls core before writes.
   - **Measure:** `wouldCreateCycle` defined in `src/core`; `task.repository.spec.ts` cycle cases pass unchanged.
   - **Evidence:** Specs green; no duplicate policy in shell.
4. WHEN overdue/blocked rules move (P3-4), THEN `taskIsOverdue`/`taskIsBlocked` SHALL align with or merge into core `task_views` predicates; the renderer SHALL consume core predicates only.
   - **Measure:** No duplicate date/dependency policy in `shell/renderer`; `rg taskIsOverdue src/shell/renderer` resolves to a core import.
   - **Evidence:** Renderer + core specs green.
5. WHEN literal unions are derived (P2-2), THEN `taskViewValues`, `priorityUnionSchema`, and `entryTypeSchema` SHALL import from core constants (`TASK_VIEW_ORDER`, task priority/status tuples, `ENTRY_TYPE_VALUES`); `payload_schemas.ts` and Elysia route schemas/Eden client types SHALL stay aligned without duplicate `as const` arrays.
   - **Measure:** Zero duplicate `as const` arrays for these domains in `payload_schemas.ts`.
   - **Evidence:** `bun test src/shared/rpc` green; routes typecheck green.
6. WHEN response-only types are schema-derived (P2-8), THEN `ListStats`, `BindingRef`, `RpcDbStats`, and sync/import shapes SHALL gain TypeBox schemas and be derived via `Static<>` (replacing hand-written types), or carry a documented exception.
   - **FCIS constraint (must resolve, don't ignore):** `shared/` **cannot import `core/`** (direction is core→shared). So a type cannot live in `core` (P2-4 `BindingRef`) **and** be schema-derived in `@shared/rpc` (P2-8) at once. The single definition + schema SHALL live in **`@shared/rpc`**, imported by both `core` and `shell` (core→shared is legal) — OR the value tuples relocate to `shared` (016 SRC-2 pattern). The plan SHALL pin one and a dependency-cruiser check SHALL prove **0** `shared→core` edges.
   - **Measure:** `rg 'type BindingRef|interface BindingRef' src` → **1** (in `@shared/rpc`); `bun run lint:depcruise` shows 0 `shared→core` edges.
   - **Evidence:** `desktop_rpc_schema.ts` derives via `Static<>`; the schemas↔type drift test (016) stays green or is retired as structurally impossible.
7. WHEN `ListStats` is restructured (P2-6, coordinated with AC6), THEN its top-level per-type fields (`bookmark`/`command`/`cheat`/`task`/`shortcut`) SHALL be dropped in favour of a `byType` map derived from `ENTRY_TYPE_VALUES`; the **producer** (`app/lib` list-stats builder, Phase A) and **consumers** (renderer `appendTypeFacetRows`, Phase B) SHALL be updated in lockstep so rendered facet counts are identical.
   - **Measure:** `ListStats` schema/type has no hardcoded per-type fields; `rg 'stats\.(bookmark|command|cheat|task|shortcut)\b' src/shell/renderer` → 0.
   - **Evidence:** `bun test src/shell/app src/shell/renderer` green; facet output unchanged.

---

## REQUIREMENT ARCH-2: App-layer decomposition (Phase A)

**User story:** As a maintainer, I want a thin `App` facade delegating to focused
services in a domain-organized `app/lib`.

### Acceptance criteria
1. WHEN `App` (322 LOC) is decomposed (P1.1-1), THEN its concerns SHALL split into ~5 services (lifecycle, list/query, task-mutation, sync/import, config-surface); `app.ts` SHALL become a thin facade delegating to them, each with co-located specs.
   - **Measure:** `wc -l src/shell/app/app.ts` ≤ **160**; its `app.ts` biome cap ratcheted to match; no new suppression.
   - **Evidence:** Full `src/shell/app` suite green; route/RPC tests unchanged.
2. WHEN `app/lib` is reorganized (P3-7a), THEN its 15 files SHALL move into domain subfolders (`lib/list/`, `lib/sync/`, `lib/task/`, `lib/preview/`, `lib/shell/`) and drop the redundant `app_` prefix; `.ls-lint.yml` SHALL gain rules for the new subdirs.
   - **Measure:** `find src/shell/app/lib -maxdepth 1 -name 'app_*'` → **0**; `bun run lint:ls` green; `rg 'app_(list|sync|task|preview|shell|entry|preview)_' src` → 0 stale imports.
   - **Evidence:** `bun test src/shell/app` green; depcruise green.
3. WHEN the shell delegate boilerplate is collapsed (P2-7), THEN the ~11 `return Promise.resolve(...)` wrappers in `app.ts` SHALL reduce to one helper or async-native methods, with the public `App` RPC surface unchanged.
   - **Measure:** `rg -c 'return Promise\.resolve' src/shell/app/app.ts` materially reduced; route tests unchanged.
   - **Evidence:** Route specs green.

---

## REQUIREMENT ARCH-3: RPC client split (Phase C)

**User story:** As a maintainer, I want Eden transport separated from the
per-endpoint facade so `client.ts` stops being a 311-LOC mixed module.

### Acceptance criteria
1. WHEN `client.ts` (P1.1-3) is split, THEN the Eden Treaty transport wiring (`bridgeFetch`, `unwrap`, `call`, the `rpc` instance) SHALL live apart from the per-endpoint helper functions, within the ls-lint-permitted `renderer/rpc` filenames.
   - **Measure:** `wc -l src/shell/renderer/rpc/client.ts` drops below cap; transport vs facade are distinct modules; `bun run lint:ls` green.
   - **Evidence:** `client.spec.tsx` covers both layers; `bun test src/shell/renderer/rpc` green; renderer callers unchanged.

---

## REQUIREMENT ARCH-4: List-page contract (Phase B)

**User story:** As a maintainer, I want the list page driven by explicit named
contracts, not an opaque `p` bag threaded through a God component.

### Acceptance criteria
1. WHEN the list page is refactored (P1.1-2), THEN the `ListPageShell` `p` bag SHALL be replaced by explicit named contracts and `ListMain` (315 LOC) SHALL be broken up; one orchestrator SHALL own list-page wiring.
   - **Measure:** `wc -l …/list_main.component.tsx` below cap; `ListMain` props are named contracts, not a single `p`; `rg ': ListPageShell' src/shell/renderer` reflects the new contract, not a bag passed verbatim.
   - **Evidence:** `bun test src/shell/renderer/components/list src/shell/renderer/hooks/list` green.
2. WHEN Phase B lands, THEN the biome complexity suppressions on `list_main.component.tsx` and the list hooks SHALL be removed with **no** new `// biome-ignore`.
   - **Measure:** `rg 'biome-ignore' src/shell/renderer/components/list src/shell/renderer/hooks/list` count strictly decreases toward 0.
   - **Evidence:** `bun run lint:biome` green; suppression metric drops.
3. WHEN the list page consumes the restructured `ListStats` (P2-6 consumer side; the type/producer change is **ARCH-1 AC7**), THEN `appendTypeFacetRows` and any list-page stat reads SHALL use `stats.byType[t]` (iterating `ENTRY_TYPE_VALUES`) instead of the removed top-level per-type keys.
   - **Measure:** `rg 'stats\.(bookmark|command|cheat|task|shortcut)\b' src/shell/renderer/{components,hooks,utils}/list` → 0.
   - **Evidence:** `bun test src/shell/renderer` green; facet rows identical.

---

## REQUIREMENT ARCH-5: Renderer overlay architecture (Phase D)

**User story:** As a maintainer, I want one overlay coordinator and shared modal
chrome instead of scattered booleans and duplicated layout.

### Acceptance criteria
1. WHEN overlays are coordinated (P3-1), THEN open/close and stacking order for command palette, filter overlay, task sheet, sync modal, and shortcuts SHALL flow through one coordinator module; no scattered mutually-exclusive booleans SHALL remain as the sole mechanism.
   - **Measure:** One coordinator owns overlay state; `rg` shows overlay components consume it, not ad-hoc booleans.
   - **Evidence:** Renderer specs green; behaviour unchanged.
2. WHEN shared overlay chrome is extracted (P3-8), THEN at least one shared primitive (backdrop/header/focus-trap/dismiss) SHALL back the sync modal, task-sheet chrome, and filter overlay; duplicate modal layout SHALL shrink measurably (jscpd).
   - **Measure:** jscpd duplication % in `src/shell/renderer` decreases.
   - **Evidence:** jscpd report; specs green.
3. WHEN types leak from components (P3-7b), THEN types imported from `.component.tsx` (e.g. `SyncModalModel`) SHALL move to `.types.ts`/`.model.ts`; `rg "from '\./.*\.component'"` in non-spec renderer code SHALL not import types from components.
   - **Measure:** `rg "from '\\./.*\\.component'" src/shell/renderer --glob '!*.spec.*'` shows no type-only imports.
   - **Evidence:** typecheck + specs green.

---

## REQUIREMENT ARCH-6: Component & action organization (Phase E — relocations last)

**User story:** As a maintainer, I want renderer folders to read Rails-style
(folder = noun, file = single word, subfolder for qualifiers) with no catch-alls.

### Acceptance criteria
1. WHEN redundant folder-prefixes are dropped, THEN files SHALL lose the prefix their folder already implies (`components/list/list_*` → `list/*`, `renderer/actions/entry_action_*` → `actions/*`), with importers updated and ls-lint rules added per dir.
   - **Measure:** `find src/shell/renderer/components/list -name 'list_*'` and `find src/shell/renderer/actions -name 'entry_action_*'` → **0**; `bun run lint:ls` green; 0 stale imports.
   - **Evidence:** Renderer specs green.
2. WHEN `components/shared` is split (P3-2), THEN primitives (chips, badges, markdown) SHALL be separated from sync-feature components (`sync_modal*`, preview helpers), and the boundary documented in `STYLING_GUIDE`/`CODESTYLE_GUIDE`.
   - **Measure:** `components/shared` no longer mixes primitives with `sync_modal*`; guide note added.
   - **Evidence:** Specs green; guide diff.
3. WHEN `renderer/actions` is reorganized, THEN its files SHALL carry true role suffixes (builder/resolver/executor over `.util`) in a cohesive layout (e.g. a `panel/` subfolder), and the shortcut keymap (P3-6) SHALL derive from one source feeding overlay/keymap/chord flows.
   - **Measure:** No `entry_action_*` prefix remains; keymap built in one place (not both `shortcut_keymap.component.tsx` and a hook).
   - **Evidence:** Specs green; `role-conformance` mislabeled stays 0.
4. WHEN the multi-responsibility `shell_hooks.util.ts` (235 LOC) is decomposed, THEN it SHALL split **by concern into vocabulary-valid, single-word modules placed by domain** (not all under `window/`): window-frame compute → fold into the existing `window/` placement geometry (no `placement.adapter` — it would collide with `placement.util.ts`); window/launcher config consts → `window/window.const.ts`; the deferred-sync-emit factory → the `app/lib/sync/` domain (Phase A); shell-hook contracts/types → a `.types.ts`. Exact leaf names finalized in the plan using only `CODESTYLE_GUIDE` suffixes (`.const`/`.types`/`.util`/`.adapter`/`.service` — **not** `.options`; `.factory` is reserved for Fishery test factories).
   - **Measure:** `src/shell/main/utils/shell_hooks.util.ts` deleted; no module uses a `.options` suffix; `bun run lint:ls` green; `rg shell_hooks src` → 0 stale imports.
   - **Evidence:** `bun test src/shell/main src/shell/app` green; role-conformance `mislabeledUtilCount` stays 0.

---

## Cross-requirement rules

- **Behaviour frozen.** Refactor/relocate only — no change to observable behaviour, rendered output, or the renderer↔main **wire format**. Phase F may change internal TS **type definitions** (response schemas, `ListStats.byType`) with all consumers updated in lockstep. Pre-existing specs pass with only mechanical edits.
- **No new suppressions / no rule weakening.** Zero new `// biome-ignore`; `git diff` of `biome.jsonc` limited to **tightening** file caps; `.dependency-cruiser.cjs`/`knip.jsonc` unchanged; `.ls-lint.yml` additive.
- **Relocations via `git mv`** + import updates; structural splits via extract-method/extract-module, behaviour-preserving.
- **Type safety preserved.** Zero new `any`, `as`, or `@ts-expect-error` in touched files.
- **Verify against live data** after each phase (re-run the harness; never act on stale numbers).
- **Commit policy.** Conventional Commits, capitalized subject ≤ 50 chars, body ≥ 20 non-ws chars with **every line ≤ 72 chars**, no trailing period, end with `Co-Authored-By: …`.

---

## Success Criteria (measurable, ratcheted)

| Metric | Baseline | Target |
| ------ | -------: | -----: |
| `structuralSuppressionCount` (src non-spec) | 13 | **0** (north-star) |
| `maxFileLoc` (non-spec) | 322 | ↓ (App/list_main/client all below cap) |
| `oversizedFileCount` (>250, non-test) | 6 | ↓ by ≥ 3 (the three God files) |
| jscpd duplication % (`src/shell/renderer`) | record | ↓ |
| new `any`/`as`/`@ts-expect-error` in touched files | — | 0 |
| duplicate `BindingRef`/`TaskView` defs | 2 / 3 | 1 / 0 |
| duplicate `as const` tuples in `payload_schemas.ts` (P2-2) | record | 0 |
| `ListStats` hardcoded per-type fields (P2-6) | 5 | 0 (`byType`) |
| response types schema-derived (P2-8) | hand-written | `Static<>` (or documented exception) |
| `shared→core` dependency-cruiser edges | 0 | 0 (FCIS preserved through F) |
| `mislabeledUtilCount` | 0 | 0 (no regression) |
| dependency-cruiser FCIS violations / cycles | 0 | 0 |
| pre-existing specs | green | green (no assertion edits) |

## Definition of Done (gate)

1. All ARCH-0/1/2/3/4/5/6 acceptance criteria met with evidence.
2. Harness extended + baseline ratcheted to the final floor (real `git_sha`); `mise run audit roles compare` PASS; `closeout-metrics.txt` before/after table committed.
3. `structuralSuppressionCount` = 0; the three God files below cap; biome caps tightened (not loosened); no new `// biome-ignore`.
4. Phase F: `BindingRef` one core def, `TaskView` core-owned (0 `@shared/rpc` imports in core), task policy + overdue rules in core; literal unions in `payload_schemas.ts` derived from core constants.
5. Renderer relocations complete; `bun run lint:ls` green with additive per-dir rules; no stale imports; `shell_hooks.util.ts` decomposed to single-word names under `src/shell/main/window/`.
6. Duplicate `P3-7` fixed; promoted items marked in `TODO.md`; `STYLING_GUIDE`/`CODESTYLE_GUIDE` boundary note added.
7. Catalog key `architecture_consolidation` registered; `mise run spec ready assets/specs/020-architecture-consolidation --key architecture_consolidation` green; no behavioural diff anywhere.

## Assumptions

- `app/lib` domain subfolders map cleanly to the App services (list/sync/task/preview/shell); `/speckit-plan` confirms the exact file→subfolder map.
- The list-page "named contracts" replace the `p` bag without changing rendered output; the contract shape is finalized in the plan from `useListPageShell`'s current return type.
- `oversizedFileCount` excludes `src/__tests__/` (test factories are infra, not product structure).

## Dependencies

- 019 merged: the `role-conformance` harness + baseline must be present to extend.
- Catalog key `architecture_consolidation` registered in `assets/catalog/catalog.yaml`.
