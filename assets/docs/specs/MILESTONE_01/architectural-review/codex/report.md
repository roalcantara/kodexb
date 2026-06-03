<!-- markdownlint-disable-file -->
# Architectural review for v0.10.0

**Review date:** 2026-06-02
**Branch:** `release/v0.10.0`
**Snapshot:** `3df4fd1d`

## 1. Executive summary

The project has a sound architectural base. Its Functional Core, Imperative
Shell (FCIS) direction is visible in the code, the Electrobun process boundary
is explicit, the renderer is isolated from native capabilities, SQLite is
accessed through repositories, and RPC routes provide a deliberate transport
boundary. The project is not a rewrite candidate.

The main risk is not that the architecture is fundamentally wrong. The risk is
that several newer feature areas have grown across the existing boundaries
without acquiring a single owner. Tasks, shortcuts, configuration, and local
ranking state each expose a different form of this pressure:

1. Task mutation currently updates the derived SQLite projection before
   attempting to update the YAML source of truth. Source write failures are
   logged and suppressed. A successful RPC response can therefore leave the
   database and source files inconsistent.
2. Sync deletes and recreates the SQLite database, but that database now stores
   entry and shortcut frecency. Those values are learned local state, not
   derivable from YAML. A sync discards them.
3. Shortcut concepts are represented in Core, Shell App, Shared RPC, and the
   Renderer. The `BindingRef` structure is repeated, and collision logic has
   diverged between Core and Renderer.
4. Runtime schemas and TypeScript DTOs are manually duplicated across the RPC
   boundary. The pattern is manageable today, but literal sets and optional
   fields have already drifted.
5. `App` remains a useful stable facade, but it now coordinates too many
   application concerns directly. The generic `src/shell/app/lib/` bucket is
   becoming the place where feature ownership is deferred.

The concern that pure logic has been pushed into Shell too aggressively is
partly founded. There are clear candidates to move into Core: task source
serialization, task tag normalization/defaulting, task state transitions,
shortcut identifiers, and canonical shortcut collision classification.

The inverse caution matters too: deterministic code is not automatically Core
code. Window placement, native handoff shaping, RPC serialization, and
renderer-only interaction state should remain Shell-local even when pure.
Moving them into Core would increase coupling rather than improve clarity.

The most pragmatic path is incremental:

1. Fix source-of-truth and sync durability defects before the release tag.
2. Establish canonical owners for task, shortcut, and config concepts.
3. Keep `App` as an RPC-facing facade while extracting cohesive application
   services behind it.
4. Continue renderer decomposition around workflows and bounded contexts, not
   around arbitrary file-count reduction.
5. Refresh architecture guides after the ownership decisions are implemented.

## 2. Review scope and method

This is a targeted architectural review, not a line-by-line code review. It is
grounded in:

- The project guidance under `assets/guides/`.
- The foundation design and prior audit artifacts under `assets/docs/specs/`.
- The dependency-cruiser boundary model.
- Code Review Graph statistics, hub analysis, and large-function analysis.
- Direct source inspection of Core, Shared, Shell App, Shell Main, Renderer,
  RPC schemas, database repositories, sync, configuration, tasks, shortcuts,
  and native handoff adapters.

The production TypeScript/TSX surface contains 336 files:

| Area | Production files |
| --- | ---: |
| `src/core/` | 95 |
| `src/shared/` | 20 |
| `src/shell/app/` | 27 |
| `src/shell/main/` | 30 |
| `src/shell/renderer/` | 144 |
| `src/__tests__/` | 20 |

The architecture graph contains 4,323 nodes and 24,834 edges across 590 files.
Its community output is test-heavy and should not be treated as a definitive
domain map. It is still useful for identifying concentration points:

| Hotspot | Graph signal |
| --- | ---: |
| `useListPageShell` | degree 54 |
| `ListMain` | degree 47 |
| `fireAndForget` | degree 45 |
| `bootstrap` | degree 39 |
| `App` | degree 37 |
| `useTaskSheet` | degree 35 |

Dependency-cruiser confirms that the intended import direction is mostly
holding:

| Origin | Significant internal destinations |
| --- | --- |
| `src/core/` | `src/core/`, `src/shared/` |
| `src/shared/` | `src/shared/`, one Core import |
| `src/shell/app/` | Shell App, Core, Shared |
| `src/shell/main/` | Shell Main, Shell App, Shared, two Core imports |
| `src/shell/renderer/` | Renderer, Shared, Core, one type-only Shell Main import |

The one Renderer-to-Main dependency is the intentional type-only import used
for RPC inference. It is not evidence of native capability leakage into the
Renderer.

## 3. Current architecture

### 3.1 Runtime model

The application is divided into three runtime-facing areas:

1. **Shell Main** owns Electrobun startup, windows, native OS interactions,
   native handoff adapters, and RPC route registration.
2. **Shell App** owns application orchestration, configuration loading,
   database access, YAML import, source write-back, preview retrieval, and the
   stable `App` facade consumed by RPC routes.
3. **Shell Renderer** owns React presentation, keyboard interaction,
   list/detail behavior, settings, quick lookup, and RPC client calls.

Core owns deterministic knowledge parsing, validation, task filtering, list
options, tags, ranking calculations, entry actions, and other pure behavior.
Shared owns cross-process DTOs, logging helpers, and small cross-cutting
constants.

This is a reasonable Electrobun shape. Native capabilities do not bleed into
Core or Renderer. Main remains the native adapter layer. App provides a useful
application boundary between transport and data access.

### 3.2 Bounded contexts visible today

The current structure exposes the following meaningful contexts:

| Context | Current locations | Assessment |
| --- | --- | --- |
| Knowledge catalog | Core entries, Shell App import/repositories, Renderer list/detail | Established and mostly coherent |
| Tasks | Core task views, Shell App task mutation/write-back, Renderer task sheet/list | Real context, but ownership is fragmented |
| Shortcuts and quick lookup | Core shortcut parsing/collisions, Shell App bindings, Shared RPC, Renderer quick lookup | Real context, currently the most distributed |
| Configuration | Core defaults/path helpers, Shell App config, Shared RPC, Renderer settings | Small context with visible drift |
| Native handoff | Shell Main handoff adapters, App delegates, Renderer actions | Appropriately Shell-owned |
| Preview retrieval | Shell App fetch/cache, Renderer consumption | Appropriately adapter-oriented |
| Local ranking | Core frecency calculation, Shell App persistence, Renderer display | Conceptually coherent, but persistence ownership is unsafe during sync |

The codebase does not need a broad directory rewrite. It does need stronger
conventions for where a feature's canonical types, pure policy, orchestration,
and adapters live.

## 4. Strengths to preserve

### 4.1 The FCIS dependency direction is real

The dependency model is not aspirational documentation only. Core contains
substantial deterministic behavior, including source parsing, tag validation,
task views, list filters, entry-action policy, and frecency calculation.
Shell App and Renderer consume that behavior without pulling native concerns
into Core.

Preserve the rule:

```txt
Core -> deterministic domain and application policy
Shared -> deliberately cross-boundary contracts and infrastructure helpers
Shell App -> orchestration, persistence, filesystem, network
Shell Main -> Electrobun and operating-system adapters
Renderer -> presentation and interaction state
```

### 4.2 Renderer isolation is appropriate

The Renderer talks through RPC and imports only pure/shared concepts. Native
operations are delegated through Shell Main. This supports security,
testability, and reasoning about process boundaries.

The type-only RPC inference dependency should remain explicit and documented
rather than replaced with a less precise hand-written facade.

### 4.3 YAML source parsing is appropriately Core-owned

The source parsers and validators under
`src/core/domain/models/entries/parsers/` place deterministic source
interpretation in the Functional Core. This is the correct direction.

Shell App's importer should continue to:

1. Read files.
2. Invoke Core parsers.
3. Persist resulting projections.
4. Report progress and errors.

### 4.4 SQLite repositories are explicit and pragmatic

The project uses raw SQL with typed repository functions instead of introducing
an ORM abstraction that would add ceremony without solving a current problem.
The repositories are discoverable, instrumentation is centralized through
`repositoryStmts(...)`, and the database schema is readable.

Keep this approach. The persistence defect is about lifecycle and durability,
not about the absence of an ORM.

### 4.5 Existing quality controls are unusually strong

The repository has enforceable architecture and quality tooling:

- dependency-cruiser
- Biome
- TypeScript strictness
- knip
- ast-grep
- ls-lint
- jscpd
- the application quality gate
- a Code Review Graph daemon

These controls should continue to protect boundaries. Do not weaken thresholds
to accommodate structural growth. Use the signals to guide extractions.

### 4.6 File suffix conventions improve local reasoning

Names such as `*.repository.ts`, `*.parser.ts`, `*.util.ts`, `*.hook.ts`,
`*.component.tsx`, and `*.routes.ts` provide useful local context. The suffix
rule is worth preserving.

The next improvement is to align written guidance with the exceptions that the
current code intentionally uses, such as `app.ts`, `client.ts`, and
`schemas.ts`.

## 5. Architectural concerns, risks, and code smells

### 5.1 P0: task mutations can report success after source write failure

The foundation design states that YAML is the source of truth and SQLite is a
derived index. Task mutation currently performs the operations in the opposite
risk order:

- `src/shell/app/app.ts:229-233` upserts SQLite before source write-back during
  task creation.
- `src/shell/app/app.ts:239-244` upserts SQLite before source write-back during
  task update.
- `src/shell/app/app.ts:250-253` deletes from SQLite before source removal.
- `src/shell/app/app.ts:279-294` updates task order in SQLite before writing
  affected source files.

The filesystem functions in
`src/shell/app/lib/app_task_source.util.ts:6-50` catch errors, log them, and do
not rethrow. The caller returns success and invalidates caches as if persistence
succeeded.

This is not a theoretical purity issue. It is a correctness defect:

1. The in-memory and SQLite view can diverge from YAML.
2. A subsequent sync can silently undo an apparently successful user action.
3. Reorder can partially persist across multiple source files.
4. The user has no actionable error response.

The temp-file-plus-rename implementation is good and should remain. The
application transaction model around it needs to change.

**Recommendation:** introduce a task mutation application service. The service
should make source-of-truth persistence failures observable and define an
explicit consistency policy. A pragmatic default is:

```txt
validate and transform in Core
-> write YAML atomically
-> update or rebuild SQLite projection
-> invalidate caches
-> report success
```

For multi-file reorder, do not claim full atomicity across filesystems. Either:

- constrain reordered tasks to one writable source file,
- stage all file payloads and provide explicit reconciliation on failure, or
- record a recoverable sync-required state when a partial write occurs.

Add failure-path tests for create, update, delete, and reorder.

### 5.2 P0: sync deletes learned frecency state

`src/shell/app/lib/app_sync.util.ts:21-38` closes the database and unlinks the
SQLite file, WAL, and SHM files before import.

The same SQLite file contains:

- `entry_frecency`, created in `src/shell/app/db/schema.ts:38-46`
- `binding_frecency`, created in `src/shell/app/db/schema.ts:108-114`

Those tables are not derived from YAML. They are learned local state updated by
user interaction. Deleting the database before every sync discards that state.

This undermines:

- catalog ranking,
- shortcut ranking,
- the value of repeated usage,
- user trust in personalization behavior.

The current database should no longer be described as wholly derived. It mixes
two persistence classes:

| Data class | Examples | Rebuildable from YAML? |
| --- | --- | --- |
| Source projection | `knowledges`, FTS, entry bindings | Yes |
| Learned local state | entry frecency, binding frecency | No |

**Recommendation:** make the persistence classes explicit before the release
tag. The simplest robust options are:

1. Preserve local-state tables while rebuilding only projection tables in a
   transaction.
2. Move learned local state to a separate durable SQLite database and keep the
   current catalog database disposable.

Option 2 gives the clearest long-term model. Option 1 is likely the smaller
release patch if it can be implemented without a fragile export/import cycle.

Add an integration test that records entry and binding visits, performs sync,
and asserts that ranking state remains.

### 5.3 P1: task behavior is split between Core, Shell App, and Renderer

Several deterministic task rules remain in Shell App:

- `src/shell/app/lib/app_task_source.util.ts:53-64` serializes tasks back to
  YAML records.
- `src/shell/app/lib/app_task_source.util.ts:67-73` normalizes task tags and
  supplies the default `task` tag.
- `src/shell/app/app.ts:256-277` defines task status and priority cycles.

The tag normalization logic duplicates
`src/core/domain/models/entries/parsers/tags.parser.ts:6`.

Renderer task-sheet state also repeats status and priority literal sets. The
RPC schema repeats them again. This is exactly the class of shell-adjacent
deterministic behavior that should move into Core.

**Recommendation:** establish a Core task policy module containing:

- canonical task status and priority values,
- next-status and next-priority transition helpers,
- create-task normalization/defaulting,
- task-to-source-record serialization.

Shell App should remain responsible for reading, writing, renaming, deleting,
logging, and orchestrating projection updates.

### 5.4 P1: shortcut ownership is fragmented and collision behavior can drift

The shortcut context has expanded beyond its original entry-parser role. A
structurally equivalent `BindingRef` concept appears in:

- `src/core/domain/models/entries/parsers/shortcut.parser.ts:8-17`
- `src/core/domain/models/entries/collisions/collision.detector.ts:3-12`
- `src/shell/app/db/binding.repository.ts:92-101`
- `src/shared/rpc/desktop_rpc_schema.ts:125-134`

`src/shell/app/lib/import_collision_warnings.util.ts:14-25` maps between
equivalent representations because no single canonical type owns the concept.

Collision behavior is also duplicated:

- Core collision detection in
  `src/core/domain/models/entries/collisions/collision.detector.ts`
  understands platform overlap and sequence shadowing.
- Renderer collision grouping in
  `src/shell/renderer/utils/shortcuts/binding_collisions_by_hash.util.ts`
  implements a separate simplified classification.

The likely failure mode is user-visible disagreement: import warnings and
Renderer conflict indicators can produce different answers for the same
bindings.

Shortcut identifier construction is also repeated between Core parsing and
Renderer selection utilities.

**Recommendation:** make shortcut bindings a first-class Core concept:

- one canonical `BindingRef` type,
- one canonical binding identifier helper,
- one collision classifier,
- explicit presentation mappings in Renderer,
- RPC aliases or projections only when the transport shape genuinely differs.

This is a consolidation, not a request to move quick-lookup UI behavior into
Core.

### 5.5 P1: `App` is a stable facade but an increasingly broad implementation

`src/shell/app/app.ts` contains a 297-line `App` class. It coordinates:

- database lifetime,
- cache lifetime,
- listing and stats,
- configuration,
- syncing,
- bindings,
- frecency,
- task CRUD,
- task state transitions,
- task reordering,
- Shell delegates,
- preview retrieval,
- tag suggestions.

The Code Review Graph reports `App` as a hub with degree 37. A broad facade is
not inherently bad: RPC routes benefit from one conventional application
surface. The issue is direct implementation ownership.

The generic `src/shell/app/lib/` directory is also accumulating cross-feature
helpers:

- list query composition,
- stats calculation,
- sync information,
- sync orchestration,
- task source write-back,
- native shell delegates,
- preview fetching.

**Recommendation:** keep `App` as the RPC-facing facade, but delegate cohesive
work to feature application modules:

```txt
src/shell/app/
  app.ts
  catalog/
  config/
  shortcuts/
  sync/
  tasks/
  preview/
```

Start with `tasks/` because it has a correctness defect. Extract other areas
only when the resulting owner is clearer. Do not introduce one-class-per-method
service ceremony.

### 5.6 P1: RPC schemas and DTOs are duplicated manually

`src/shared/rpc/desktop_rpc_schema.ts:23-40` documents the split:

- runtime TypeBox validation schemas live in Shell Main,
- equivalent hand-written TypeScript DTOs live in Shared for Renderer/App
  imports.

Explicit transport validation is valuable. The current duplication is not
automatically wrong. However, repeated literal sets and optional fields have
started to drift.

Examples:

- Page sizes are defined in Shell App config, Shell Main RPC schemas, and
  Renderer constants.
- Task statuses and priorities are defined in Core, Shell Main RPC schemas,
  Renderer task-sheet state, and Shell App transition methods.
- Task views are defined as a Shared RPC type while Core utilities consume the
  concept and Shell Main repeats the runtime literals.
- Entry-type filter literals are repeated even though Core already owns entry
  type values.

**Recommendation:** consolidate low-risk runtime value sets first. Then decide
whether pure TypeBox transport schemas should move under `src/shared/rpc/` so
runtime schemas and `Static<typeof schema>` DTOs can share one definition.

Do not force every domain model to equal its transport DTO. Preserve explicit
mapping where the boundary meaningfully changes shape.

### 5.7 P1: configuration exposes unsupported or dropped fields

The configuration surface contains two concrete drift examples.

#### `configPath`

`ConfigPatch` and the Shell Main TypeBox schema accept `configPath`:

- `src/shared/rpc/desktop_rpc_schema.ts:104-110`
- `src/shell/main/rpc/schemas.ts:64-70`

`App.applyConfigPatch()` does not pass `configPath` to `saveConfig()`:

- `src/shell/app/app.ts:197-205`

The settings page displays the current path but does not submit a new one. The
transport contract therefore advertises capability the application does not
implement.

#### `display.advisories`

The config schema accepts and types `display.advisories`:

- `src/shell/app/config/config.schema.ts:14-33`

`resolveConfig()` drops the value:

- `src/shell/app/config/config.loader.ts:23-36`

The Renderer reads `cfg.display.advisories` for quick lookup behavior. The
value can be present in YAML and still resolve as absent.

**Recommendation:** remove unsupported `configPath` mutation or implement it
fully. Preserve and persist `display.advisories` if it is a supported feature;
otherwise remove the dead contract. Add round-trip config tests.

### 5.8 P2: Renderer structure is discoverable but concentrated

Renderer is the largest area with 144 production files. The list workflow
alone contains:

- 29 files under `hooks/list/`
- 13 files under `utils/list/`
- 12 files under `components/list/`

The largest Renderer hotspots include:

| File | Size signal |
| --- | ---: |
| `src/shell/renderer/components/list/list_main.component.tsx` | 302 lines |
| `src/shell/renderer/hooks/list/use_view_navigation.hook.ts` | 277 lines |
| `src/shell/renderer/components/shared/sync_modal.component.tsx` | 244 lines |
| `src/shell/renderer/hooks/settings/use_settings_page.hook.ts` | 241 lines |
| `src/shell/renderer/actions/build_entry_action_panel.util.ts` | 232 lines |
| `src/shell/renderer/rpc/client.ts` | 314 lines |

The prior consolidation work improved locality. The remaining issue is not
simply file count. The list shell, keyboard flows, and shortcut flows remain
high-coupling areas.

**Recommendation:** continue extracting around workflows:

- list query and navigation state,
- task-sheet interaction,
- action-panel construction,
- quick-lookup ranking and collision presentation,
- RPC bridge transport versus endpoint facade.

Avoid global utility buckets. Prefer feature-local modules with narrow public
surfaces.

### 5.9 P2: Core currently mixes domain policy with shell-adjacent pure policy

Core contains `DEFAULTS` paths and path expansion helpers. These functions are
pure and testable, so their presence does not violate FCIS. However, they are
configuration and environment policy rather than knowledge-domain behavior.

The project should decide which definition of Core it wants:

1. **Broad Functional Core:** all deterministic policy, including environment
   path resolution.
2. **Domain-focused Core:** knowledge, tasks, shortcuts, and ranking only;
   deterministic configuration policy belongs to Shell App config modules.

Both are defensible. The current guidance sometimes implies the second while
the code uses the first.

**Recommendation:** choose explicitly. The domain-focused Core is easier to
onboard into as the app grows, but moving stable config helpers is not a
pre-release priority.

### 5.10 P2: derived-index schema lifecycle needs an explicit policy

`src/shell/app/db/client.ts:22-35` runs idempotent bootstrap DDL. The foundation
design anticipated introducing migrations when the first real schema change
arrived.

The database now includes catalog projection, FTS, bindings, entry frecency,
and binding frecency. There is no schema-version or migration runner visible in
the bootstrap path.

Because local learned state now shares the database, deleting and rebuilding
the file cannot be the universal schema-upgrade mechanism.

**Recommendation:** define the lifecycle before more schema growth:

- projection schema can rebuild,
- learned state schema must migrate or live separately,
- startup should detect incompatible schema versions,
- recovery should be explicit and testable.

If learned state moves to its own database, use a small migration runner only
for that durable state and keep projection rebuilds simple.

### 5.11 P2: architecture guidance has drifted from the implementation

The guides are useful but no longer fully describe the code:

- `assets/guides/CODESTYLE_GUIDE.md` says Shell App owns all business logic
  while the implemented FCIS model clearly places substantial policy in Core.
- The same guide describes `app.service.ts`, while the actual facade is
  `src/shell/app/app.ts`.
- Some wording implies that nothing crosses Shell boundaries without RPC,
  although Shell Main intentionally imports Shell App in-process.
- `assets/docs/specs/foundation/design.md` includes earlier bridge and route
  examples that are no longer exact.
- Shared RPC types and Main runtime schemas are described as drift-free, but
  the config surface demonstrates drift.

Documentation drift matters because the repository relies on written
conventions for agent and developer routing.

**Recommendation:** refresh guides after the ownership changes. Document the
actual runtime boundaries, accepted suffix exceptions, and canonical concept
owners.

### 5.12 P2: native handoff error contracts deserve a release audit

Native handoff belongs in Shell Main and is correctly located there. One
failure-path detail should be audited:

`src/shell/main/handoff/handoff_registry.service.ts:28-63` restores the prior
clipboard on explicit success and explicit adapter failure. If an exception is
thrown after the clipboard has been replaced, the `catch` branch shows the
window and disarms the guard but does not restore the clipboard.

This is a Shell adapter robustness issue, not a Core boundary issue.

**Recommendation:** restore clipboard state from a `finally`-style path when
replacement occurred, and verify that command adapters inspect subprocess
results rather than treating process launch as command success.

## 6. Core and Shell assessment

### 6.1 Logic that should move from Shell into Core

| Current logic | Current owner | Recommended Core owner | Reason |
| --- | --- | --- | --- |
| Task tag normalization/defaulting | Shell App task source util | Core task policy | Domain rule; duplicates Core normalization |
| Task-to-YAML record serialization | Shell App task source util | Core task source projection | Pure source representation policy |
| Task status cycle | `App` | Core task policy | Deterministic business transition |
| Task priority cycle | `App` | Core task policy | Deterministic business transition |
| Shortcut binding ID generation | Core parser and Renderer utilities | Core shortcut binding module | Canonical concept with repeated logic |
| Shortcut collision classification | Core and Renderer | Core shortcut collision module | One business answer should drive all surfaces |
| Task view values | Shared RPC plus Core constants | Core task-view module | Core filtering behavior owns the concept |
| Page-size values | Config, RPC, Renderer | Shared or Core config policy module | One application policy set |

### 6.2 Logic that should remain in Shell

| Logic | Correct owner | Reason |
| --- | --- | --- |
| Filesystem read/write/rename/unlink | Shell App | I/O and recovery policy |
| SQLite repositories and SQL | Shell App | Persistence adapter |
| YAML import orchestration and progress events | Shell App | I/O workflow |
| RPC TypeBox transport validation | Shared RPC or Shell Main | Boundary validation, not domain policy |
| Electrobun bootstrap and window construction | Shell Main | Native runtime adapter |
| Window placement calculation | Shell Main window module | Native UI policy with one adapter consumer |
| Clipboard and terminal/browser/editor handoff | Shell Main handoff modules | OS capability boundary |
| Renderer navigation, focus, virtualization, and modal state | Renderer | UI interaction state |
| Renderer formatting and display tiers | Renderer | Presentation policy unless reused outside UI |

### 6.3 Practical boundary rule

Use this question when deciding whether pure code should move into Core:

> Does the behavior express a stable answer about knowledge, tasks, shortcuts,
> ranking, or application policy that multiple adapters should agree on?

If yes, Core is a strong candidate.

If the behavior only exists to shape one adapter, one component, one native
API, or one transport envelope, keep it local even if deterministic.

## 7. Opportunities for simplification

### 7.1 Introduce feature-owned application modules behind `App`

Keep one conventional `App` facade for RPC routes. Delegate implementation to
cohesive modules:

| Module | Initial responsibilities |
| --- | --- |
| `tasks/` | source-first mutations, projection updates, reorder consistency |
| `sync/` | projection rebuild lifecycle, learned-state preservation |
| `shortcuts/` | binding persistence and warning orchestration |
| `catalog/` | list, detail, stats, tag suggestions, cache ownership |
| `config/` | load, resolve, save, round-trip policy |
| `preview/` | network retrieval and cache |

This is a Rails-like convention in the useful sense: developers can predict
where feature behavior belongs. It does not require a large framework or deep
class hierarchy.

### 7.2 Replace generic buckets with local ownership

`src/shell/app/lib/` is a transitional bucket. Move files when a feature owner
is established. Do not create a new top-level `utils/` bucket.

Likewise, keep Renderer utilities under the feature that consumes them. A
shortcut-only helper belongs under `renderer/.../shortcuts/`, not a shared
utility directory.

### 7.3 Separate durable local state from disposable projection state

The cleanest mental model is:

```txt
YAML sources
  -> disposable catalog projection database

User interaction
  -> durable local-state database
```

This removes special cases from sync and gives schema migrations a narrow
purpose.

### 7.4 Derive low-level contracts where derivation removes real duplication

Prefer:

```ts
export const TASK_STATUS_VALUES = ['todo', 'doing', 'done'] as const
export type TaskStatus = (typeof TASK_STATUS_VALUES)[number]
```

Then reuse the values to build schemas and UI options.

Do not derive complex transport payloads from domain objects when it obscures
the boundary. The goal is less drift, not clever type machinery.

### 7.5 Treat documentation as an executable convention map

The guides should answer:

- Which layer owns which kinds of behavior?
- Where does a new task feature go?
- Where does a new shortcut rule go?
- Which schemas are canonical?
- Which databases are disposable?
- Which state must survive sync?
- Which file suffix exceptions are intentional?

This lowers onboarding cost and improves agent behavior without adding runtime
complexity.

## 8. Opportunities to consolidate concepts, types, and abstractions

| Concept | Current duplication | Consolidation target | Expected benefit |
| --- | --- | --- | --- |
| `BindingRef` | Core parser, Core collision detector, Shell App repository, Shared RPC | Core shortcut binding type with explicit RPC projection if needed | Prevents mapping churn and collision drift |
| Binding identifier | Core parser, Renderer chord-detail and selection utilities | Core shortcut ID helper | One identifier contract |
| Collision result | Core importer warnings, Renderer simplified hash grouping | Core collision classifier plus Renderer presentation mapping | Same answer across import and UI |
| Task status values | Core constants, App cycles, RPC schema, Renderer task sheet | Core task policy constants | Easier additions and safer transitions |
| Task priority values | Core constants, App cycles, RPC schema, Renderer task sheet | Core task policy constants | Same |
| Task view | Shared RPC type, Core order/filter utilities, RPC schema literals | Core task-view module; Shared re-export if useful | Correct semantic ownership |
| Task source record | Shell App serializer adjacent to filesystem code | Core task source projection | Keeps write adapter small |
| Tag normalization | Core parser and Shell App task creation | Core normalization helper | Prevents validation mismatch |
| Page-size values | Shell App config, Shell Main schemas, Renderer constants | Shared config policy constants | Removes trivial repeated literals |
| Ranked list entry | Shell App `KnowledgeWithFrecency`, Shared `RpcListEntry` | Neutral application projection or deliberate alias | Reduces equivalent structural types |
| Config patch | Shared DTO, Main schema, App save subset, Renderer subset | One supported capability contract | Removes advertised-but-ignored fields |
| Learned local state | Mixed with disposable SQLite projection | Separate durable store or preserved tables | Makes sync semantics correct |

## 9. Recommendations ordered by priority and ROI

| Priority | Recommendation | ROI | Why now |
| --- | --- | --- | --- |
| P0 | Preserve entry and binding frecency across sync | Very high | Current sync destroys learned user state |
| P0 | Make task source write failures visible and source-of-truth-safe | Very high | Current RPC success can mask persistence failure |
| P1 | Consolidate Core task policy and source projection helpers | High | Small extraction removes repeated rules and clarifies Shell orchestration |
| P1 | Establish one canonical shortcut binding type, ID helper, and collision classifier | High | Prevents current and future UI/import disagreement |
| P1 | Remove or implement unsupported config fields; fix advisories round-trip | High | Concrete contract drift with user-visible behavior |
| P1 | Introduce projection versus durable-state database lifecycle policy | High | Prevents repeated sync and migration special cases |
| P1 | Keep `App` facade but delegate task and sync workflows | High | Reduces hub pressure without breaking RPC callers |
| P2 | Consolidate low-risk literal sets used by schemas and UI | Medium | Cheap reduction in change amplification |
| P2 | Split Renderer RPC bridge transport from endpoint facade | Medium | Improves navigation in a 314-line infrastructure hotspot |
| P2 | Continue Renderer workflow extraction | Medium | Reduces coupling in the largest layer |
| P2 | Refresh FCIS, code-style, and foundation docs | Medium | Makes conventions trustworthy again |
| P3 | Decide whether config path helpers belong in broad Core or Shell App config | Low | Improves conceptual cleanliness but does not block release |

## 10. Suggested refactoring roadmap

### 10.1 High-impact / low-effort

These changes should be small enough to pursue before or immediately after the
v0.10.0 tag, depending on release freeze policy.

1. Add sync integration tests proving that entry and binding frecency survive
   sync.
2. Preserve learned local state during sync, at minimum by rebuilding only
   disposable projection tables.
3. Stop swallowing task source write-back errors.
4. Add task mutation failure-path tests.
5. Move task tag normalization/defaulting onto the existing Core tag
   normalization path.
6. Centralize task status, priority, task-view, and page-size values.
7. Remove `configPath` from writable patch DTOs unless changing the active
   config file is intentionally supported.
8. Preserve `display.advisories` through config resolution and save, or remove
   the unsupported feature contract.
9. Restore clipboard content on exceptional native-handoff paths.

### 10.2 High-impact / high-effort

These should be implemented as focused specs after the immediate release
correctness work.

1. Split durable local state from the disposable catalog projection database.
2. Introduce explicit database schema lifecycle handling for durable state.
3. Extract a task mutation application service behind `App`.
4. Make shortcuts a first-class Core bounded context with canonical bindings,
   IDs, parsing, and collision classification.
5. Replace parallel Renderer collision classification with a Core-driven
   result plus presentation mapping.
6. Gradually replace `src/shell/app/lib/` with feature-owned application
   modules.
7. Split Renderer RPC bridge mechanics from endpoint wrappers.

### 10.3 Nice-to-have

1. Decide whether deterministic config path policy belongs in Core or Shell
   App and document the decision.
2. Refresh `assets/guides/CODESTYLE_GUIDE.md`,
   `assets/guides/FCIS.guide.md`, and the foundation design examples.
3. Document intentional suffix exceptions to the artifact naming convention.
4. Continue splitting large Renderer hooks when a cohesive workflow boundary
   emerges.
5. Add a lightweight ownership matrix to `assets/guides/` for new features.

## 11. Release posture for v0.10.0

### 11.1 Resolve before tagging

The following should be treated as release correctness items:

1. Sync must not discard entry or shortcut frecency.
2. Task mutation must not report success when YAML source persistence fails.
3. `display.advisories` should either round-trip correctly or be removed from
   the supported surface.
4. Native handoff clipboard restoration should be verified on exceptional
   paths if those flows are release-facing.

### 11.2 Suitable for post-tag structured refactoring

The following are important but do not justify a pre-release directory
reorganization:

1. Feature-owned Shell App modules behind `App`.
2. Shortcut bounded-context consolidation.
3. Shared schema derivation strategy.
4. Renderer workflow extraction.
5. Guide refresh and ownership matrix.

## 12. Rails-influenced conventions worth adopting

The useful Rails influence is not a framework imitation. It is predictable
placement and low-friction defaults.

Adopt these conventions:

1. Every feature has one obvious application module under Shell App when it
   performs I/O orchestration.
2. Every cross-adapter business concept has one canonical Core owner.
3. Runtime schema literals are derived from one exported value set.
4. `App` remains the conventional application facade for RPC.
5. Renderer code stays feature-local and presentation-oriented.
6. Disposable projection data and durable local data are visibly separate.
7. New abstractions must remove a concrete duplication, inconsistency, or
   navigation cost.

Avoid these failure modes:

1. Moving all pure functions into Core regardless of ownership.
2. Introducing generic service layers that only rename repository calls.
3. Reducing file count as an end in itself.
4. Treating DTO duplication as always bad when a boundary intentionally
   changes shape.
5. Preserving stale conventions in guides after the implementation evolves.

## 13. Final assessment

The architecture is stronger than the concerns might initially suggest. Core
is not empty, Main is not overloaded with domain behavior, Renderer does not
hold native capability, and Shell App is a legitimate orchestration layer.

The concerns are still directionally correct. Shell App has started to retain
deterministic task behavior because it sits next to filesystem work. Shortcut
behavior has grown into a bounded context without a single owner. Shared RPC
contracts and runtime schemas are accumulating repeated definitions. The
disposable-database assumption is no longer valid after local ranking state was
added.

The highest-value work is not architectural beautification. It is to make the
existing architecture honest:

- YAML writes must behave like source-of-truth writes.
- Local learned state must survive projection rebuilds.
- Core must own cross-adapter business answers.
- Shell must orchestrate those answers and contain I/O.
- Guides must describe the implemented conventions.

Once those corrections land, the current FCIS and Electrobun structure should
support future growth without a broad rewrite.

## 14. Evidence index

| Topic | Primary evidence |
| --- | --- |
| FCIS guidance | `assets/guides/FCIS.guide.md` |
| Code organization guidance | `assets/guides/CODESTYLE_GUIDE.md` |
| Foundation persistence model | `assets/docs/specs/foundation/design.md` |
| Task mutation orchestration | `src/shell/app/app.ts:213-294` |
| Task source write suppression | `src/shell/app/lib/app_task_source.util.ts:6-50` |
| Task pure source projection | `src/shell/app/lib/app_task_source.util.ts:53-73` |
| Existing Core tag normalization | `src/core/domain/models/entries/parsers/tags.parser.ts:6` |
| Sync database deletion | `src/shell/app/lib/app_sync.util.ts:21-38` |
| Database bootstrap | `src/shell/app/db/client.ts:22-35` |
| Learned-state schema | `src/shell/app/db/schema.ts:38-46`, `src/shell/app/db/schema.ts:108-114` |
| RPC DTO duplication rationale | `src/shared/rpc/desktop_rpc_schema.ts:23-40` |
| Config patch drift | `src/shared/rpc/desktop_rpc_schema.ts:104-110`, `src/shell/app/app.ts:197-205` |
| Advisories resolution drift | `src/shell/app/config/config.schema.ts:14-33`, `src/shell/app/config/config.loader.ts:23-36` |
| Native handoff exceptional path | `src/shell/main/handoff/handoff_registry.service.ts:28-63` |
| Renderer list hotspot | `src/shell/renderer/components/list/list_main.component.tsx` |
| Renderer navigation hotspot | `src/shell/renderer/hooks/list/use_view_navigation.hook.ts` |
| Renderer RPC hotspot | `src/shell/renderer/rpc/client.ts` |
