# Architecture consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `subagent-driven-development`
> (recommended) or `executing-plans`. Steps use checkbox (`- [ ]`) syntax. This
> plan is the authority for *how*; [`spec.md`](./spec.md) is the authority for
> *what*/*why*. Every task ends with an **Acceptance gate** (spec criterion +
> command + expected). Do not exceed a task's gate. Phases are independently
> gated; run them in order **0 → F → A → C → B → D → E → closeout**.

**Goal:** Pay down `src/shell` structural debt (God files, the list-page `p` bag,
tangled `client.ts`, scattered overlays, catch-all dirs) and move misplaced
domain logic into `core` — behaviour-frozen — while extending the
`role-conformance` harness into a standing architecture-health guard.

**Architecture:** Phase 0 adds three metrics to the existing harness (real TDD).
Phases F–E are behaviour-preserving refactors: each baselines the affected specs
green, applies extract-method / extract-module / `git mv`, re-verifies green, and
checks a grep/metric gate. **No new `// biome-ignore`; biome caps only tighten.**

**Tech Stack:** Bun (`bun test`, `Bun.Glob`), TypeBox, Elysia + Eden, React 19,
`bun:sqlite`, ls-lint, Biome, dependency-cruiser, jscpd.

**Conventions (every task):**
- Run packages tests with a `./` path prefix (test root is `src/`).
- Commits: Conventional Commits, capitalized subject ≤ 50 chars, body ≥ 20 non-ws
  chars with **every line ≤ 72 chars**, no trailing period, end with
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Dry-run:
  `bun packages/ops/src/governance/policies/hooks/commit_message.script.ts <file>`.
- Behaviour-frozen: baseline the affected `bun test <dir>` green BEFORE editing;
  re-run green AFTER with no assertion changes.
- After each phase: `mise run audit roles compare` must stay PASS (no metric
  regression). Tighten the relevant `biome.jsonc` file cap when a God file shrinks.

---

## File Structure (high level)

- **Phase 0** — extend `packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.ts` (+ `.spec.ts`) and `…/role_conformance.script.ts` (+ `.spec.ts`); regenerate `tools/metrics/baselines/role-conformance/baseline.json`; update `assets/guides/TOOLS_GUIDE.md`.
- **Phase F** — move types/policy into `src/core/**`; `@shared/rpc/payload_schemas.ts`, `desktop_rpc_schema.ts`; shell consumers updated.
- **Phase A** — split `src/shell/app/app.ts` into `src/shell/app/services/*.service.ts`; relocate `src/shell/app/lib/app_*` into `lib/<domain>/`; `.ls-lint.yml` additive.
- **Phase C** — split `src/shell/renderer/rpc/client.ts` (transport vs facade).
- **Phase B** — `src/shell/renderer/hooks/list/*`, `components/list/list_main.component.tsx` (named contracts).
- **Phase D** — new overlay coordinator + shared overlay primitive under `src/shell/renderer/components/shared/`; types out of `.component.tsx`.
- **Phase E** — `git mv` prefix drops in `components/list`, `actions`; split `components/shared`; decompose `shell_hooks.util.ts`.
- **Closeout** — ratchet baseline, `closeout-metrics.txt`, catalog key, fix duplicate `P3-7`, mark `TODO.md`.

---

## Phase 0 — Extend the architecture-health metric (ARCH-0)

### Task 1: Architecture metrics in the harness core

**Files:**
- Modify: `packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.ts`
- Modify: `…/role_conformance_core.script.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `role_conformance_core.script.spec.ts`:

```ts
import { computeArchMetrics, countStructuralSuppressions } from './role_conformance_core.script'

describe('arch metrics', () => {
  it('counts complexity + file-size suppressions', () => {
    const src = '// biome-ignore lint/complexity/noExcessiveLinesPerFunction: x\n// biome-ignore lint/style/noExcessiveLinesPerFile: y\nconst a=1'
    expect(countStructuralSuppressions(src)).toBe(2)
  })
  it('ignores non-structural suppressions', () => {
    expect(countStructuralSuppressions('// biome-ignore lint/suspicious/noExplicitAny: x')).toBe(0)
  })
  it('computes maxFileLoc + oversizedFileCount over the 250 threshold', () => {
    const files = [
      { path: 'src/a.ts', loc: 300, source: '' },
      { path: 'src/b.ts', loc: 100, source: '// biome-ignore lint/complexity/noExcessiveLinesPerFunction: x' }
    ]
    expect(computeArchMetrics(files)).toEqual({
      structuralSuppressionCount: 1,
      maxFileLoc: 300,
      oversizedFileCount: 1
    })
  })
})
```

- [ ] **Step 2: Run, verify fail**

Run: `bun test ./packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.spec.ts`
Expected: FAIL — `countStructuralSuppressions`/`computeArchMetrics` not exported.

- [ ] **Step 3: Implement**

In `role_conformance_core.script.ts`, extend `RoleMetrics` and add the functions:

```ts
export type RoleMetrics = {
  totalUtil: number
  mislabeledUtilCount: number
  utilPurityRatio: number
  enforcedDirRatio: number
  suffixViolations: number
  structuralSuppressionCount: number
  maxFileLoc: number
  oversizedFileCount: number
}

const STRUCTURAL_SUPPRESSION_RE =
  /biome-ignore\s+lint\/(?:complexity\/|style\/noExcessiveLinesPerFile)/g

export function countStructuralSuppressions(source: string): number {
  return (source.match(STRUCTURAL_SUPPRESSION_RE) ?? []).length
}

const OVERSIZED_LOC = 250

export function computeArchMetrics(
  files: Array<{ path: string; loc: number; source: string }>
): { structuralSuppressionCount: number; maxFileLoc: number; oversizedFileCount: number } {
  let structuralSuppressionCount = 0
  let maxFileLoc = 0
  let oversizedFileCount = 0
  for (const f of files) {
    structuralSuppressionCount += countStructuralSuppressions(f.source)
    if (f.loc > maxFileLoc) maxFileLoc = f.loc
    if (f.loc > OVERSIZED_LOC) oversizedFileCount++
  }
  return { structuralSuppressionCount, maxFileLoc, oversizedFileCount }
}
```

Update `computeMetrics(...)` to accept the arch metrics and spread them into the
returned `RoleMetrics` (add a third parameter `arch: ReturnType<typeof computeArchMetrics>`
and `...arch` in the return). Update its existing unit test to pass a zeroed arch
object (`{ structuralSuppressionCount: 0, maxFileLoc: 0, oversizedFileCount: 0 }`).

- [ ] **Step 4: Run, verify pass**

Run: `bun test ./packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.ts packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.spec.ts
git commit -F <msg>   # chore(ops): Add architecture-health metrics
```

**Acceptance gate (ARCH-0 AC1):** core spec green; `RoleMetrics` has the three new keys.

---

### Task 2: Wire arch metrics into the runner + regression check

**Files:**
- Modify: `…/role_conformance.script.ts`, `…/role_conformance.script.spec.ts`

- [ ] **Step 1: Failing test for the regression path**

Append to `role_conformance.script.spec.ts`:

```ts
it('flags a rise in structuralSuppressionCount / maxFileLoc / oversizedFileCount', () => {
  const files = [{ path: 'src/a.util.ts', source: 'export const a=1' }]
  const baseline = {
    totalUtil: 1, mislabeledUtilCount: 0, utilPurityRatio: 1, enforcedDirRatio: 1,
    suffixViolations: 0, structuralSuppressionCount: 0, maxFileLoc: 100, oversizedFileCount: 0
  }
  const report = buildReport(files, { lockedDirs: 1, roleDirs: 1 }, baseline, 'sha',
    { structuralSuppressionCount: 1, maxFileLoc: 300, oversizedFileCount: 1 })
  expect(report.violations.map(v => v.metric).sort()).toEqual(
    ['maxFileLoc', 'oversizedFileCount', 'structuralSuppressionCount'])
  expect(report.summary).toBe('FAIL')
})
```

- [ ] **Step 2: Run, verify fail**

Run: `bun test ./packages/ops/src/metrics/harnesses/role-conformance/role_conformance.script.spec.ts`
Expected: FAIL — `buildReport` arity / missing checks.

- [ ] **Step 3: Implement**

Give `buildReport` an optional 5th param `arch` (default zeros); pass `arch` into
`computeMetrics`. After the existing `enforcedDirRatio` check, add three "increase
is a regression" checks mirroring `mislabeledUtilCount`:

```ts
for (const k of ['structuralSuppressionCount', 'maxFileLoc', 'oversizedFileCount'] as const) {
  if (baseline && results[k] > baseline[k])
    violations.push({ metric: k, value: results[k], baseline: baseline[k] })
}
```

In the IO `main` path, scan all non-spec `src/**/*.{ts,tsx}` files for `{ path,
loc, source }` (reuse the glob; `loc = source.split('\n').length`, excluding
`src/__tests__/`), call `computeArchMetrics`, and pass it to `buildReport`.
Add the three keys to `renderReportMd`'s metrics table.

- [ ] **Step 4: Run + regenerate baseline**

Run: `bun test ./packages/ops/src/metrics/harnesses/role-conformance/role_conformance.script.spec.ts`
Expected: PASS.
Run: `GIT_SHA=$(git rev-parse --short HEAD) mise run audit roles baseline`
Expected: `baseline.json` `results` now has `structuralSuppressionCount: 13`, `maxFileLoc: 322`, `oversizedFileCount: 6`.

- [ ] **Step 5: Document + commit**

Add the three metrics to the `role-conformance` row/section in `assets/guides/TOOLS_GUIDE.md`.

```bash
git add packages/ops/... tools/metrics/baselines/role-conformance/baseline.json assets/guides/TOOLS_GUIDE.md
git commit -F <msg>   # chore(ops): Track suppressions and file size
```

**Acceptance gate (ARCH-0 AC2/AC3):** regression test green; baseline committed with the three metrics at 13/322/6; `mise run audit roles compare` PASS; `TOOLS_GUIDE` updated.

---

## Phase F — FCIS domain moves (ARCH-1)

> Each task: baseline the affected specs green → move → update consumers → green
> → `bun run lint:depcruise` (0 FCIS violations / cycles / `shared→core` edges).

### Task 3: TaskView → core (ARCH-1 AC1)
- [ ] Baseline: `bun test src/core/domain/models/knowledges/task_views`.
- [ ] Define `TaskView` in core (e.g. `src/core/domain/models/knowledges/task_views/task_view.types.ts`); make `desktop_rpc_schema.ts` re-export it (deprecated). Update `task_view_order.const.ts`, `count_by_view.util.ts`, `filter_by_view.util.ts` to import from core.
- [ ] Verify: `rg "@shared/rpc" src/core | rg TaskView` → **0**; `bun test src/core src/shell/renderer && bun run lint:depcruise`.
- [ ] Commit. **Gate (AC1):** 0 core→`@shared/rpc` TaskView imports; specs + depcruise green.

### Task 4: BindingRef one definition in `@shared/rpc` (ARCH-1 AC2/AC6 — FCIS clause)
- [ ] Baseline: `bun test src/shell/app/db`.
- [ ] Per the spec FCIS clause: keep the single `BindingRef` definition in `@shared/rpc` as a TypeBox schema with `Static<>` type; delete the duplicate in `binding.repository.ts`; both core and shell import from `@shared/rpc`. (Do **not** put it in core — `shared` can't import core.)
- [ ] Verify: `rg 'type BindingRef|interface BindingRef' src` → **1**; `bun run lint:depcruise` shows 0 `shared→core` edges; `bun test src/shell/app/db`.
- [ ] Commit. **Gate (AC2/AC6):** one `BindingRef`; 0 `shared→core`; specs green.

### Task 5: Task policy → core (ARCH-1 AC3)
- [ ] Baseline: `bun test src/shell/app/db/task.repository.spec.ts`.
- [ ] Move `wouldCreateCycle()` to pure core policy (e.g. `src/core/domain/models/knowledges/task_views/` or a `task` policy module); move create-task tag normalization to core alongside `normalizeKnowledgeTag()`. Shell calls core before writes (`app_task_source.service.ts`, `task.repository.ts`).
- [ ] Verify: `wouldCreateCycle` defined under `src/core`; `task.repository.spec.ts` cycle cases pass unchanged; `bun run lint:depcruise`.
- [ ] Commit. **Gate (AC3):** policy in core; cycle specs unchanged-green.

### Task 6: Overdue/blocked rules → core (ARCH-1 AC4)
- [ ] Baseline the renderer task-state specs.
- [ ] Align/merge `taskIsOverdue`/`taskIsBlocked` (renderer `task_state.util.ts`) into core `task_views` predicates (`is_overdue.util.ts`, actionable rules); renderer imports core.
- [ ] Verify: `rg taskIsOverdue src/shell/renderer` resolves to a core import; no duplicate date/dependency policy in renderer; specs green.
- [ ] Commit. **Gate (AC4):** renderer consumes core predicates only.

### Task 7: literalUnion derivation (ARCH-1 AC5)
- [ ] In `payload_schemas.ts`, replace hand-maintained `taskViewValues`/`priorityUnionSchema`/`entryTypeSchema` `as const` arrays with `literalUnion()` over core constants (`TASK_VIEW_ORDER`, priority/status tuples, `ENTRY_TYPE_VALUES`).
- [ ] Verify: 0 duplicate `as const` for these domains; `bun test src/shared/rpc src/shell/main/rpc && bun run typecheck`.
- [ ] Commit. **Gate (AC5):** 0 duplicate tuples; routes typecheck green.

### Task 8: Response-type schemas + ListStats `byType` (ARCH-1 AC6/AC7)
- [ ] Baseline: `bun test src/shell/app src/shell/renderer`.
- [ ] Give `ListStats`, `RpcDbStats`, sync/import shapes TypeBox schemas in `@shared/rpc`; derive via `Static<>` in `desktop_rpc_schema.ts` (or document the exception). Restructure `ListStats`: drop top-level per-type keys, add `byType` derived from `ENTRY_TYPE_VALUES`. Update the **producer** (`app/lib` list-stats builder) and **consumers** (`appendTypeFacetRows`, `settings.page.tsx`, filter fixtures) in lockstep.
- [ ] Verify: `rg 'stats\.(bookmark|command|cheat|task|shortcut)\b' src/shell/renderer` → 0; facet rows identical; `bun test src/shell/app src/shell/renderer && bun run typecheck && bun run lint:depcruise`.
- [ ] Commit. **Gate (AC6/AC7):** response types schema-derived; `ListStats` `byType`; 0 `shared→core`; output byte-identical.

---

## Phase A — App-layer decomposition (ARCH-2)

### Task 9: Split `App` into services (ARCH-2 AC1 + P2-7)

**Files:** Create `src/shell/app/services/{lifecycle,query,task_mutation,sync,config}.service.ts` (+ specs); Modify `src/shell/app/app.ts`.

- [ ] Baseline: `bun test src/shell/app && bun test src/shell/main/rpc/routes`.
- [ ] Extract method-groups from `App` into co-located services, keeping the same logic:
  - **query**: `list`, `listMatchCount`, `getEntry`, `recordEntryVisit`, `listBindings`, `listBindingsByChord`, `recordBindingVisit`, `getListStats`, `getStats`.
  - **task_mutation**: `createTask`, `updateTask`, `deleteTask`, `cycleStatus`, `cyclePriority`, `reorderTask`.
  - **sync**: `sync`, `getSyncInfo`.
  - **config**: `getConfig`, `applyConfigPatch`, shell delegates (`openExternal`/`pasteInTerminal`/`runInTerminal`/`pasteDoc`/`openInEditor`/`showOpenDialog`/`fetchPreviewImage`/`resizeWindow`/`hideWindow`/`getWindowPosition`/`setWindowPosition`/`quit`).
  - **lifecycle**: db open/close, `invalidateListCache`, `getDbForTaskMutation`, `getRawDbForTesting`, `suggestTags`, the sync gate.
  `App` becomes a thin facade delegating to these (preserve every public method name/signature so routes are unchanged).
- [ ] Collapse the ~11 `return Promise.resolve(...)` shell-delegate wrappers into one helper (or make the delegate methods async-native) — public surface unchanged.
- [ ] Verify: `wc -l src/shell/app/app.ts` ≤ **160**; lower the `app.ts` cap in `biome.jsonc` to match (tighten only); `bun test src/shell/app src/shell/main/rpc && bun run lint:depcruise`; `mise run audit roles compare` (maxFileLoc/suppressions not increased).
- [ ] Commit. **Gate (AC1/P2-7):** `app.ts` ≤160, thin facade; route/RPC tests unchanged; cap tightened.

### Task 10: Relocate `app/lib` into domain subfolders (ARCH-2 AC2)
- [ ] `git mv` the 15 `app/lib` files into `lib/{list,sync,task,preview,shell}/` and drop the `app_` prefix (e.g. `app_list_query.util.ts` → `lib/list/query.util.ts`; `app_sync.service.ts` → `lib/sync/sync.service.ts`; `frecency_snapshot.repository.ts` → `lib/sync/frecency_snapshot.repository.ts`; `app_task_*` → `lib/task/*`; `app_preview_fetch.client.ts`/`app_entry_preview.util.ts` → `lib/preview/*`; `app_shell_*` → `lib/shell/*`). Update all importers; add `.ls-lint.yml` rules for the new subdirs.
- [ ] Verify: `find src/shell/app/lib -maxdepth 1 -name 'app_*'` → **0**; `rg 'app_(list|sync|task|preview|shell|entry)' src` → 0 stale; `bun run lint:ls && bun test src/shell/app`.
- [ ] Commit. **Gate (AC2):** no `app_*` at lib root; ls-lint green; 0 stale imports.

---

## Phase C — RPC client split (ARCH-3)

### Task 11: Split `client.ts` transport vs facade (ARCH-3 AC1)
- [ ] Baseline: `bun test src/shell/renderer/rpc`.
- [ ] Move the Eden transport (`bridgeFetch`, `unwrap`, `call`, the `rpc` instance, `setSyncMessageHandlers`) into one module and the per-endpoint helpers into the facade, within the ls-lint-permitted `renderer/rpc` filenames (`client.ts` stays the facade barrel; transport in `rpc_app.types`-adjacent or a permitted name — confirm the `.ls-lint.yml` rule for `renderer/rpc` first and extend it additively if a new basename is needed).
- [ ] Verify: `wc -l src/shell/renderer/rpc/client.ts` below cap; `bun run lint:ls`; `bun test src/shell/renderer/rpc` (client.spec.tsx covers both); renderer callers unchanged.
- [ ] Commit. **Gate (AC1):** transport/facade split; client below cap; specs green.

---

## Phase B — List-page contract (ARCH-4)

### Task 12: Replace the `p` bag with named contracts (ARCH-4 AC1/AC2)
- [ ] Baseline: `bun test src/shell/renderer/components/list src/shell/renderer/hooks/list`.
- [ ] Read `use_list_page_shell.hook.ts`'s return type (`ListPageShell`). Decompose it into named sub-contracts (e.g. `ListData`, `ListFilter`, `ListSelection`, `ListOverlays`) and have `ListMain`/`list_results_body`/`list_overlay_hosts` accept those explicit props instead of one `p`. Break `ListMain` (315 LOC) into smaller components; one orchestrator owns wiring.
- [ ] Remove the biome complexity suppressions on `list_main.component.tsx` and the list hooks — **no** new `// biome-ignore`.
- [ ] Verify: `wc -l …/list_main.component.tsx` below cap; `rg 'biome-ignore' src/shell/renderer/components/list src/shell/renderer/hooks/list` strictly lower; `bun run lint:biome`; `bun test …/components/list …/hooks/list`; `mise run audit roles compare` (suppressions decreased).
- [ ] Commit. **Gate (AC1/AC2):** named contracts replace `p`; list suppressions removed; specs green.

### Task 13: List page consumes `ListStats.byType` (ARCH-4 AC3)
- [ ] Update `appendTypeFacetRows` + any list-page stat reads to iterate `ENTRY_TYPE_VALUES` over `stats.byType[t]` (the type change landed in Task 8).
- [ ] Verify: `rg 'stats\.(bookmark|command|cheat|task|shortcut)\b' src/shell/renderer/{components,hooks,utils}/list` → 0; `bun test src/shell/renderer`; facet rows identical.
- [ ] Commit. **Gate (AC3):** 0 hardcoded per-type stat reads.

---

## Phase D — Renderer overlay architecture (ARCH-5)

### Task 14: Overlay coordinator (ARCH-5 AC1)
- [ ] Baseline the overlay/renderer specs.
- [ ] Create one coordinator module owning open/close + stacking for command palette, filter overlay, task sheet, sync modal, shortcuts; overlay components consume it instead of scattered booleans.
- [ ] Verify: one coordinator owns overlay state; `rg` shows components consume it; specs green; behaviour unchanged.
- [ ] Commit. **Gate (AC1):** single coordinator; no sole-mechanism scattered booleans.

### Task 15: Shared overlay primitive (ARCH-5 AC2)
- [ ] Extract a shared primitive (backdrop/header/focus-trap/dismiss) backing sync modal, task-sheet chrome, filter overlay.
- [ ] Verify: jscpd duplication % in `src/shell/renderer` decreases (`bun run lint` jscpd stage); specs green.
- [ ] Commit. **Gate (AC2):** shared primitive in use; duplication ↓.

### Task 16: Types out of `.component.tsx` (ARCH-5 AC3)
- [ ] Move `SyncModalModel` and similar types from `.component.tsx` into `.types.ts`/`.model.ts`; update importers.
- [ ] Verify: `rg "from '\\./.*\\.component'" src/shell/renderer --glob '!*.spec.*'` shows no type-only imports; `bun run typecheck`; specs green.
- [ ] Commit. **Gate (AC3):** no type imports from components.

---

## Phase E — Component & action organization (ARCH-6 — relocations last)

### Task 17: Drop redundant folder-prefixes (ARCH-6 AC1)
- [ ] `git mv` `components/list/list_*` → `list/*` and `renderer/actions/entry_action_*` → `actions/*` (folder is the noun); update importers; add/extend `.ls-lint.yml` rules per dir.
- [ ] Verify: `find …/components/list -name 'list_*'` and `find …/actions -name 'entry_action_*'` → **0**; `bun run lint:ls`; 0 stale imports; specs green.
- [ ] Commit. **Gate (AC1):** no redundant prefixes; ls-lint green.

### Task 18: Split `components/shared` (ARCH-6 AC2)
- [ ] `git mv` primitives (chips, badges, markdown) vs sync-feature components (`sync_modal*`, preview helpers) into distinct subtrees; document the boundary in `STYLING_GUIDE`/`CODESTYLE_GUIDE`.
- [ ] Verify: `components/shared` no longer mixes primitives with `sync_modal*`; guide note added; specs green.
- [ ] Commit. **Gate (AC2):** primitives vs feature separated + documented.

### Task 19: Reorganize `actions` + single-source keymap (ARCH-6 AC3)
- [ ] Give `renderer/actions` files true role suffixes (builder/resolver/executor over `.util`) in a cohesive layout (e.g. `panel/` subfolder); make the shortcut keymap derive from one source feeding overlay/keymap/chord flows (remove the duplicate derivation in `shortcut_keymap.component.tsx` + hook).
- [ ] Verify: no `entry_action_*` prefix; keymap built once; `bun run lint:ls`; `mise run audit roles compare` (mislabeled stays 0); specs green.
- [ ] Commit. **Gate (AC3):** role suffixes; single keymap source.

### Task 20: Decompose `shell_hooks.util.ts` (ARCH-6 AC4)
- [ ] Split by concern into vocabulary-valid single-word modules placed **by domain**: window-frame compute → fold into `window/` placement geometry (no `placement.adapter`); window/launcher consts → `window/window.const.ts`; deferred-sync-emit factory → `app/lib/sync/`; shell-hook contracts → a `.types.ts`. Use only `CODESTYLE_GUIDE` suffixes (not `.options`; `.factory` reserved for Fishery).
- [ ] Verify: `src/shell/main/utils/shell_hooks.util.ts` deleted; no `.options` suffix; `rg shell_hooks src` → 0; `bun run lint:ls && bun test src/shell/main src/shell/app`.
- [ ] Commit. **Gate (AC4):** shell_hooks decomposed by domain; ls-lint green.

---

## Closeout

### Task 21: Ratchet, record, gate (DoD)
- [ ] `GIT_SHA=$(git rev-parse --short HEAD) mise run audit roles baseline`; `mise run audit roles compare` PASS — `structuralSuppressionCount = 0`, `maxFileLoc`/`oversizedFileCount` lowered.
- [ ] Write `closeout-metrics.txt` before/after table (suppressions 13→0, maxFileLoc 322→N, oversizedFileCount 6→N, jscpd %, duplicate defs, new casts = 0).
- [ ] Fix the duplicate `P3-7` in `TODO.md`; mark P1.1 promoted items as appropriate.
- [ ] Register catalog key `architecture_consolidation` in `assets/catalog/catalog.yaml`.
- [ ] Run: `mise run spec ready assets/specs/020-architecture-consolidation --key architecture_consolidation` — green.
- [ ] Confirm: `git diff biome.jsonc` shows only **tightened** caps; `.dependency-cruiser.cjs`/`knip.jsonc` unchanged.
- [ ] Commit. **Gate (DoD 1–7):** north-star `structuralSuppressionCount = 0`; full gate green; no behavioural diff.

---

## Self-review checklist (run before handoff)

- [ ] Every ARCH-0/1/2/3/4/5/6 criterion maps to a task gate (0→T1-2, F→T3-8, A→T9-10, C→T11, B→T12-13, D→T14-16, E→T17-20, DoD→T21).
- [ ] No placeholders in Phase 0 code; refactor tasks specify exact files + verification commands.
- [ ] Names consistent: `computeArchMetrics`, `structuralSuppressionCount`, `app/lib/{domain}/`, `*.service.ts`, `ListStats.byType`.
- [ ] Behaviour-frozen: every refactor task baselines green then re-verifies green; `compare` never regresses.
- [ ] Only `biome.jsonc` caps tighten + `.ls-lint.yml` additive; depcruise/knip untouched; no new `// biome-ignore`.
