# Architecture consolidation — Tasks

Dependency-ordered. Full steps/code/gates in [`plan.md`](./plan.md); requirements
in [`spec.md`](./spec.md). Check a box only when the task's **Acceptance gate**
passes. Phase order: **0 → F → A → C → B → D → E → closeout**.

## Phase 0 — architecture-health metric
- [x] **T101** Arch metrics in harness core (`structuralSuppressionCount`/`maxFileLoc`/`oversizedFileCount`) — *gate:* ARCH-0 AC1
- [x] **T102** Wire into runner + regression check; regenerate baseline (13/322/6); TOOLS_GUIDE — *gate:* ARCH-0 AC2/AC3

## Phase F — FCIS domain moves
- [x] **T103** `TaskView` → core (0 core→`@shared/rpc`) — *gate:* ARCH-1 AC1
- [x] **T104** `BindingRef` one def in `@shared/rpc`; 0 `shared→core` — *gate:* ARCH-1 AC2/AC6
- [x] **T105** Task policy (`wouldCreateCycle`, tag norm) → core — *gate:* ARCH-1 AC3
- [x] **T106** Overdue/blocked rules → core predicates — *gate:* ARCH-1 AC4
- [x] **T107** `literalUnion()` derivation in `payload_schemas.ts` — *gate:* ARCH-1 AC5
- [x] **T108** Response-type schemas + `ListStats.byType` (producer+consumers lockstep) — *gate:* ARCH-1 AC6/AC7

## Phase A — App-layer decomposition
- [x] **T109** Split `App` into ~5 services (`app.ts` ≤160, cap tightened) + P2-7 — *gate:* ARCH-2 AC1
- [x] **T110** Relocate `app/lib` → domain subfolders, drop `app_` prefix — *gate:* ARCH-2 AC2

## Phase C — RPC client split
- [x] **T111** `client.ts` transport vs endpoint facade — *gate:* ARCH-3 AC1

## Phase B — list-page contract
- [x] **T112** Replace `p` bag with named contracts; break up `ListMain`; remove list suppressions — *gate:* ARCH-4 AC1/AC2
- [x] **T113** List page consumes `ListStats.byType` — *gate:* ARCH-4 AC3

## Phase D — renderer overlay architecture
- [x] **T114** Overlay coordinator — *gate:* ARCH-5 AC1
- [x] **T115** Shared overlay primitive (jscpd ↓) — *gate:* ARCH-5 AC2
- [x] **T116** Types out of `.component.tsx` — *gate:* ARCH-5 AC3

## Phase E — component & action organization (relocations last)
- [x] **T117** Drop redundant folder-prefixes (`list_*`, `entry_action_*`) — *gate:* ARCH-6 AC1
- [x] **T118** Split `components/shared` (primitives vs sync) + doc — *gate:* ARCH-6 AC2
- [x] **T119** Reorganize `actions` + single-source keymap — *gate:* ARCH-6 AC3
- [x] **T120** Decompose `shell_hooks.util.ts` by domain — *gate:* ARCH-6 AC4

## Commit plan

Incremental: `mise run spec ready --phase C1 --commit`
Closeout flush: `mise run spec ready --commit` or `mise run spec closeout /Users/roalcantara/Work/bun/kb/assets/specs/020-architecture-consolidation --commit`

One commit per logical chunk; each is behaviour-frozen and gate-green before the
next. Subjects ≤ 50 chars; body lines ≤ 72; end with the Co-Authored-By trailer.

### C1 — Phase 0 harness metrics
- **Phase:** 0 · **Tasks:** T101, T102
- **Paths:** `packages/ops/src/metrics/harnesses/role-conformance/*`, `tools/metrics/baselines/role-conformance/baseline.json`, `assets/guides/TOOLS_GUIDE.md`
- **Subject:** `chore(ops): Add architecture-health metrics`
- **Body:**
  Track structuralSuppressionCount, maxFileLoc, oversizedFileCount;
  flag any rise; seed baseline at 13/322/6.

### C2 — TaskView to core
- **Phase:** F · **Tasks:** T103
- **Paths:** `src/core/domain/models/knowledges/task_views/*`, `src/shared/rpc/desktop_rpc_schema.ts`
- **Subject:** `ref(core): Own TaskView type in core`
- **Body:**
  Define TaskView in core; core modules import from core, not
  @shared/rpc; shared keeps a deprecated re-export.

### C3 — BindingRef single definition
- **Phase:** F · **Tasks:** T104
- **Paths:** `src/shared/rpc/*`, `src/shell/app/db/binding.repository.ts`
- **Subject:** `ref(rpc): Consolidate BindingRef in shared`
- **Body:**
  One BindingRef definition + schema in @shared/rpc, imported by core
  and shell; drop the repository duplicate; 0 shared→core edges.

### C4 — Task policy to core
- **Phase:** F · **Tasks:** T105
- **Paths:** `src/core/**`, `src/shell/app/db/task.repository.ts`, `src/shell/app/lib/task/*`
- **Subject:** `ref(core): Move task policy to core`
- **Body:**
  wouldCreateCycle + create-task tag normalization become pure core
  policy; shell calls core before writes; cycle specs unchanged.

### C5 — Overdue rules to core
- **Phase:** F · **Tasks:** T106
- **Paths:** `src/core/domain/models/knowledges/task_views/*`, `src/shell/renderer/**`
- **Subject:** `ref(core): Move overdue rules to core`
- **Body:**
  taskIsOverdue/taskIsBlocked merge into core task_views predicates;
  renderer consumes core only.

### C6 — Literal unions from core
- **Phase:** F · **Tasks:** T107
- **Paths:** `src/shared/rpc/payload_schemas.ts`
- **Subject:** `ref(rpc): Derive literal unions from core`
- **Body:**
  taskView/priority/entryType unions derive from core tuples via
  literalUnion(); remove duplicate as const arrays.

### C7 — Schema-derive response types
- **Phase:** F · **Tasks:** T108
- **Paths:** `src/shared/rpc/*`, `src/shell/app/lib/list/*`, `src/shell/renderer/**`
- **Subject:** `ref(rpc): Schema-derive response types`
- **Body:**
  ListStats/RpcDbStats/sync shapes gain TypeBox schemas (Static<>);
  ListStats switches to byType; producer + consumers updated in lockstep.

### C8 — Split App into services
- **Phase:** A · **Tasks:** T109
- **Paths:** `src/shell/app/app.ts`, `src/shell/app/services/*`, `biome.jsonc`
- **Subject:** `ref(app): Split App into services`
- **Body:**
  Extract query/task/sync/config/lifecycle services; App becomes a
  thin facade (≤160 LOC); collapse Promise.resolve wrappers; tighten cap.

### C9 — Group app/lib by domain
- **Phase:** A · **Tasks:** T110
- **Paths:** `src/shell/app/lib/**`, `.ls-lint.yml`
- **Subject:** `ref(app): Group app/lib by domain`
- **Body:**
  git mv app_* into lib/{list,sync,task,preview,shell}/ dropping the
  app_ prefix; add ls-lint rules; update importers.

### C10 — Split RPC client
- **Phase:** C · **Tasks:** T111
- **Paths:** `src/shell/renderer/rpc/*`, `.ls-lint.yml`
- **Subject:** `ref(renderer): Split RPC client layers`
- **Body:**
  Separate Eden transport from the per-endpoint facade; client below
  cap; client.spec covers both.

### C11 — Replace list prop bag
- **Phase:** B · **Tasks:** T112
- **Paths:** `src/shell/renderer/hooks/list/*`, `src/shell/renderer/components/list/*`
- **Subject:** `ref(renderer): Replace list p prop bag`
- **Body:**
  Named contracts replace the ListPageShell p bag; break up ListMain;
  remove list complexity suppressions (no new ignores).

### C12 — Consume ListStats byType
- **Phase:** B · **Tasks:** T113
- **Paths:** `src/shell/renderer/{components,hooks,utils}/list/*`
- **Subject:** `ref(renderer): Consume ListStats byType`
- **Body:**
  appendTypeFacetRows + list reads iterate ENTRY_TYPE_VALUES over
  stats.byType; facet output identical.

### C13 — Overlay coordinator
- **Phase:** D · **Tasks:** T114
- **Paths:** `src/shell/renderer/components/shared/*`, overlay consumers
- **Subject:** `ref(renderer): Add overlay coordinator`
- **Body:**
  One coordinator owns overlay open/close + stacking; remove scattered
  mutually-exclusive booleans as sole mechanism.

### C14 — Shared overlay primitive
- **Phase:** D · **Tasks:** T115
- **Paths:** `src/shell/renderer/components/shared/*`
- **Subject:** `ref(renderer): Share overlay primitive`
- **Body:**
  Extract backdrop/header/focus-trap/dismiss backing sync modal, task
  sheet, filter overlay; jscpd duplication drops.

### C15 — Types out of components
- **Phase:** D · **Tasks:** T116
- **Paths:** `src/shell/renderer/**`
- **Subject:** `ref(renderer): Move types out of components`
- **Body:**
  SyncModalModel and siblings move to .types/.model; no type-only
  imports from .component.tsx remain.

### C16 — Drop redundant prefixes
- **Phase:** E · **Tasks:** T117
- **Paths:** `src/shell/renderer/components/list/*`, `src/shell/renderer/actions/*`, `.ls-lint.yml`
- **Subject:** `ref(renderer): Drop redundant prefixes`
- **Body:**
  git mv list_*/entry_action_* to drop the folder-implied prefix; add
  ls-lint rules; 0 stale imports.

### C17 — Split shared primitives
- **Phase:** E · **Tasks:** T118
- **Paths:** `src/shell/renderer/components/shared/**`, `assets/guides/STYLING_GUIDE.md`
- **Subject:** `ref(renderer): Split shared primitives`
- **Body:**
  Separate primitives (chips/badges/markdown) from sync-feature
  components; document the boundary.

### C18 — Reorganize actions and keymap
- **Phase:** E · **Tasks:** T119
- **Paths:** `src/shell/renderer/actions/**`, `src/shell/renderer/components/shortcuts/*`
- **Subject:** `ref(renderer): Reorganize actions, keymap`
- **Body:**
  Role suffixes for actions (+ panel/ subfolder); single-source the
  shortcut keymap feeding overlay/keymap/chord flows.

### C19 — Decompose shell hooks
- **Phase:** E · **Tasks:** T120
- **Paths:** `src/shell/main/utils/shell_hooks.util.ts`, `src/shell/main/window/*`, `src/shell/app/lib/sync/*`
- **Subject:** `ref(main): Decompose shell hooks`
- **Body:**
  Split shell_hooks by concern into vocabulary-valid modules placed by
  domain (no .options; no placement collision).

### C20 — Closeout
- **Phase:** closeout · **Tasks:** T121
- **Paths:** `tools/metrics/baselines/role-conformance/baseline.json`, `assets/specs/020-architecture-consolidation/closeout-metrics.txt`, `assets/catalog/catalog.yaml`, `TODO.md`
- **Subject:** `chore(spec): Close out 020 consolidation`
- **Body:**
  Ratchet baseline (suppressions→0), record closeout metrics, fix
  duplicate P3-7, register catalog key, full spec-ready green.

## Closeout
- [x] **T121** Ratchet baseline (suppressions→0), closeout metrics, fix duplicate P3-7, catalog key, full `mise run spec ready` — *gate:* DoD 1–7

**Hard invariants (every task):** behaviour-frozen (baseline spec green → green);
**no new `// biome-ignore`**; `biome.jsonc` caps only tighten; `.ls-lint.yml`
additive; `.dependency-cruiser.cjs`/`knip.jsonc` unchanged; `mise run audit roles
compare` never regresses; commit after each green task.
