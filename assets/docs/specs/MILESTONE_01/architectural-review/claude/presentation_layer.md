<!-- markdownlint-disable-file -->
# Presentation layer review — kb v0.10.0

**Status**: Companion to [`report.md`](report.md) · **Date**: 2026-06-01
**Scope**: `src/shell/renderer/` only — components, pages, hooks, utils,
actions, styles, and the orchestration patterns that bind them.

Read the parent [`report.md`](report.md) for the repo-wide review. This
document zooms into the React surface, where the dominant concerns are
**organizational** (where things live and what they're called), not
**architectural** (layer purity or FCIS violations).

---

## 1. What's in the renderer today

```
src/shell/renderer/
├── app.tsx                        10 LOC — bootstrap, no logic
├── app.spec.tsx                       — root smoke test
├── index.html / index.ts             — Bun entry
├── pages/                            4 .page.tsx + 1 nested component + 1 types file
│   ├── detail/
│   │   ├── detail.page.tsx       76 LOC
│   │   └── detail_shortcut_body.component.tsx   ← not a page
│   ├── list/list.page.tsx        25 LOC — wraps ListMain
│   └── settings/
│       ├── settings.page.tsx    195 LOC
│       └── settings.types.ts             ← not a page
├── components/                      48 components, 6,300 LOC
│   ├── actions/    (1)              command_palette
│   ├── detail/     (3)              555 LOC
│   ├── list/       (12)           2,450 LOC
│   ├── shared/     (9 + 4 non-component files)  1,441 LOC
│   ├── shortcuts/  (13)           1,745 LOC
│   └── task/       (1)              220 LOC
├── hooks/                           44 hooks, 3,609 LOC
│   ├── detail/     (1)
│   ├── list/       (27)             ← incl. 2 misplaced .util.ts files
│   ├── settings/   (1)
│   ├── shared/     (2)
│   └── shortcuts/  (13)
├── utils/                           ~30 utils
│   ├── list/       (13)
│   ├── shared/     (7)
│   └── shortcuts/  (10)
├── actions/                         11 entry-action utilities + types
├── constants/                       7 constant files
├── styles/                          15 .css partials, all feature-named
│   └── components/
│       ├── action_toast.css, app_shell.css, command_palette.css,
│       ├── compact_filter.css, confirm_dialog.css, detail_panel.css,
│       ├── entry_row.css, footer.css, list_row.css, overlay_shell.css,
│       ├── settings.css, shared.css, shortcuts.css, sync.css,
│       └── task_sheet.css
└── rpc/                             Eden Treaty bridge client
```

### Headline metric

**17 of 27 hooks in `hooks/list/` are called by exactly one file**
(usually `useListPageShell` or `ListMain`). They are not extracted for
reuse; they are extracted for file-length lint relief and unit-test
isolation. This is the single most predictive smell in the layer.

### A second headline

**Pages do not orchestrate.** The actual orchestration lives in
`use_list_page_shell.hook.ts` (211 LOC) + `list_main.component.tsx`
(301 LOC). [`list.page.tsx`](../../../../../src/shell/renderer/pages/list/list.page.tsx) is 25 lines that wire the hook to the
component. The "page" naming suggests routing/composition home; the
file itself is a four-line composition wrapper. Two orchestration sites
exist for one page.

---

## 2. Strengths to preserve

### 2.1 Suffix vocabulary is doing real work

`.ls-lint.yml` enforces `*.component.tsx`, `*.hook.ts(x)`, `*.util.ts`,
`*.page.tsx`, `*.const.ts`, `*.types.ts`. Glancing at a file's name tells
you what it is and (mostly) what folder owns it. Few teams have this
working. **Keep it.** The leaks identified below are gaps in *folder*
discipline, not in suffix discipline.

### 2.2 Style partials are feature-named

`styles/components/` has 15 `.css` files: `sync.css`, `shortcuts.css`,
`command_palette.css`, `settings.css`, `task_sheet.css`, etc. The CSS
side already organizes **by feature**. This is interesting because the
TypeScript side organizes **by kind** (component / hook / util). The
mismatch is doing harm — it's the reason the same feature touches 4–5
folders.

### 2.3 The `cmp-*` and `.semantic-*` class convention

[`STYLING_GUIDE.md`](../../../../guides/STYLING_GUIDE.md) enforces a class
naming pattern that maps cleanly between component name and stylesheet
section. This pattern is one of the few cross-folder bridges that works
today.

### 2.4 RPC client is the only main-process surface

[`rpc/client.ts`](../../../../../src/shell/renderer/rpc/client.ts) is the renderer's only door to the main process. No
component reaches around it. This is a clean enforcement of "renderer
has no Bun" beyond what dependency-cruiser catches.

### 2.5 Each "feature" is co-located *within* its own folder

`components/shortcuts/` is genuinely cohesive (13 shortcut UI bits all
about chords, keymaps, bindings). `hooks/shortcuts/` is similarly
cohesive. The grouping inside each kind-folder is sound; the friction
is having to cross kind boundaries to find a feature's pieces.

---

## 3. Concerns

Severity uses the same key as the parent report (P1/P2/P3).

### P1. Hook-as-private-method pattern (single-caller hooks)

Concrete count, taken from the working tree:

| Hook                              | Callers | Note                              |
| --------------------------------- | ------- | --------------------------------- |
| `use_list_surface_keydown`        | 1       | called only by `useListPageShell` |
| `use_list_surface_wheel_scroll`   | 1       | only by `useListPageShell`        |
| `use_list_surface_scroll_restore` | 1       | only by `ListMain`                |
| `use_list_main_entry_keys`        | 1       | only by `ListMain`                |
| `use_window_view_nav_keys`        | 1       | only by `ListMain`                |
| `use_list_page_focus_ring`        | 1       | only by `ListPage`                |
| `use_command_palette`             | 1       | only by `useListPageShell`        |
| `use_filter_dropdown_stats`       | 1       | only by `ListMain`                |
| `use_list_pointer_selection`      | 1       | only by `ListMain`                |
| `use_list_sentinel_pagination`    | 1       | only by `useListPageShell`        |
| `use_record_detail_visit`         | 1       | only by detail surface            |
| `use_task_drag_drop`              | 1       | only by `useListPageShell`        |
| `use_task_keyboard`               | 1       | only by `useListPageShell`        |
| `use_task_sheet`                  | 1       | only by something in list/        |
| `use_view_navigation`             | 1       | only by `useListSelection`        |
| `use_virtual_list_window`         | 1       | only by `ListMain`                |
| `use_window_drag`                 | 1       | only by `ListMain`                |

That is **17 of 27** hooks in `hooks/list/`. Each has its own spec file,
so the spec set is also 17 single-purpose specs. The fragmentation
exists because:

- `noExcessiveLinesPerFunction` and `noExcessiveCognitiveComplexity`
  Biome rules push effects out of the orchestrator.
- Each piece can be tested in isolation with
  `renderHook(() => useFoo(...))`.
- The team treated "make it testable" as "make it a hook".

**The cost**: discoverability and edit blast radius. A change to
keyboard handling on the list surface touches 3–5 hook files and their
specs, each in their own file, each importing the next. The "hook"
boundary is doing the job a private function would do in a class — but
React doesn't have classes for this, so the abstraction overhead leaks
into the file count.

**Independent corroborating signal**: both `useListPageShell` (the hook)
and `ListMain` (its consumer component) carry
`biome-ignore lint/complexity/noExcessiveLinesPerFunction` suppressions
([use_list_page_shell.hook.ts#L23](../../../../../src/shell/renderer/hooks/list/use_list_page_shell.hook.ts#L23), [list_main.component.tsx#L32-L33](../../../../../src/shell/renderer/components/list/list_main.component.tsx#L32)).
These are the only `biome-ignore` annotations in production renderer
code. They mark the same load — orchestrating the list page — that the
17 single-caller hooks were trying to dissipate. The pressure didn't
go away; it landed in the orchestrator.

### P1. Pages are wrappers; orchestration lives elsewhere

```
src/shell/renderer/
├── pages/list/list.page.tsx              25 LOC  ← wraps ListMain + 1 hook
├── components/list/list_main.component.tsx  301 LOC ← does the layout + keyboard
└── hooks/list/use_list_page_shell.hook.ts  211 LOC ← does the data/state
```

Three files for one screen, with the page barely participating. By
contrast:

- `pages/settings/settings.page.tsx` is 195 LOC and *is* the orchestrator.
  Its hook (`use_settings_page.hook.ts`, 240 LOC) carries state; the
  page renders.
- `pages/detail/detail.page.tsx` is 76 LOC and orchestrates between
  `DetailPageView` (in `components/detail/`) and
  `DetailShortcutBody` (which lives **under `pages/`**).

There is no consistent convention for what a "page" file contains. The
list page is a 4-line composition; the settings page is the body; the
detail page is a partial composer. A new contributor cannot predict
where a page's logic will be.

### P1. Layer-first foldering forces every feature across 4–5 directories

Adding a new piece to the **shortcuts** feature touches:

```
components/shortcuts/    new *.component.tsx
hooks/shortcuts/         new use_*.hook.ts
utils/shortcuts/         new *.util.ts
actions/                 maybe entry_action_*.util.ts
styles/components/       shortcuts.css (one shared file — odd)
constants/               icons.const.ts, filter_labels.const.ts
pages/detail/            detail_shortcut_body.component.tsx (exists)
```

The same is true for **list**, **task**, and **settings**. The folder
structure is **layer-based at the top level, feature-based at the
second level**. Layer-first is the dominant convention in mid-size
React apps from the 2018–2020 era and works well when components are
genuinely cross-feature. It breaks down when most components are
feature-specific.

In kb today, almost every component is feature-specific:

- `components/list/` is 12 list-only components.
- `components/shortcuts/` is 13 shortcut-only components.
- `components/task/` has 1 file (task sheet).
- `components/actions/` has 1 file (command palette).
- `components/detail/` has 3 files.
- `components/shared/` is the only cross-feature folder.

Twelve of twelve list components are list-only. Adding a list feature
crosses `components/list/`, `hooks/list/`, `utils/list/`, sometimes
`actions/`, and `styles/components/list_row.css`. The CSS side already
went feature-first; the TypeScript side has not.

### P2. `pages/` contains non-pages

| Path                                              | What it is   | Where it should live                                                                                              |
| ------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `pages/detail/detail_shortcut_body.component.tsx` | A component  | `components/detail/`                                                                                              |
| `pages/settings/settings.types.ts`                | A types file | inline in `settings.page.tsx` or `pages/settings/settings.types.ts` is fine, but it breaks the `pages/` invariant |

Small thing on its own; it corrodes the suffix-vocabulary contract.

### P2. `components/shared/` mixes UI primitives and feature composites

```
shared/
├── badge_accessory.component.tsx          ← primitive
├── bookmark_entry_icon.component.tsx       ← primitive
├── brand_icon_or_glyph.component.tsx      ← primitive
├── md_view.component.tsx                  ← primitive
├── preview_image.component.tsx            ← primitive
│
├── action_toast_host.component.tsx        ← feature (toasts)
├── sync_modal.component.tsx               ← feature (sync UI)
├── sync_modal_errors.component.tsx        ← feature (sync UI)
├── sync_modal_errors.util.ts              ← feature (sync UI)
├── sync_modal_layout.const.ts             ← feature (sync UI)
├── sync_progress.component.tsx            ← feature (sync UI)
├── sync_toast.component.tsx               ← feature (sync UI)
├── use_sync_modal_expansion.hook.ts       ← feature (sync UI)
└── overlay_shell_layout.const.ts          ← layout primitive
```

The `sync_*` cluster is **a coherent feature**, not a primitive. It has
8 files including its own hook and util. Burying it inside `shared/`
because it's used across pages is a mis-categorisation. If you grep
"where is the sync UI?" the answer should be one folder, not
`components/shared/sync_*` + `hooks/list/list_sync_*.util.ts`.

### P2. `hooks/list/` contains two `.util.ts` files

[`list_sync_complete_toast.util.ts`](../../../../../src/shell/renderer/hooks/list/list_sync_complete_toast.util.ts) and
[`list_sync_message_handlers.util.ts`](../../../../../src/shell/renderer/hooks/list/list_sync_message_handlers.util.ts) live in `hooks/list/` despite
not being hooks. The `.ls-lint.yml` directory contract says `hooks/`
holds `use_*.hook.ts(x)`. Two leaks aren't a crisis, but they weaken
the directory-as-type invariant.

### P2. The "renderer/actions/" middle layer is uncategorised

11 files in [`renderer/actions/`](../../../../../src/shell/renderer/actions) describe the entry-action panel
domain (what actions are available on an entry, how they map to
keyboard shortcuts, how the palette renders them). The set is internally
coherent but lives at the renderer top level, alongside `components/`,
`hooks/`, `utils/`. It is:

- not pure (it touches RPC via `executeEntryAction`),
- not a component (no `.component.tsx`),
- not a hook (no `use_*.hook.ts`),
- not pure utility (it composes a domain over async ops),
- not a constant.

It is **a feature-level domain inside the renderer**. The cluster makes
sense; its location signals "I didn't know where else to put this".

### P2. Naming: 6 hooks named `use_list_page_*` are not interchangeable

```
use_list_page_data.hook.ts
use_list_page_filters.hook.ts
use_list_page_focus_ring.hook.ts
use_list_page_rows.hook.ts
use_list_page_shell.hook.ts
use_list_page_stats_sync.hook.ts
```

Six "list_page" hooks plus `useListPageShell` (the orchestrator). If
you're new to the codebase, which one carries the list rows? Which
caches stats? `_data` and `_rows` sound interchangeable but aren't.
`_shell` reads as a generic wrapper but is actually the orchestrator.

### P3. Single-purpose top-level dirs at renderer root

`actions/`, `constants/`, `rpc/`, `styles/`, `utils/` is fine. Plus
`hooks/`, `components/`, `pages/`. That's eight top-level dirs for one
React app. Tolerable today; under feature growth, it's a forcing
function for fragmentation.

---

## 4. The underlying pattern

Most of §3 reduces to one observation:

> **`src/shell/renderer/` is organized layer-first, but the actual
> work is feature-shaped.**

When a layer-first taxonomy is applied to feature-shaped work:

- "Where do I add this?" has multiple equally-correct answers, so
  consistency erodes.
- Cross-folder coupling becomes invisible (the import graph hides it).
- Single-caller helpers proliferate because each layer must have its
  own representation of every behaviour.
- File counts grow faster than complexity (each piece becomes a tuple
  of `.component.tsx` + `.hook.ts` + `.util.ts` + `.css`).
- The orchestrator (`useListPageShell` / `ListMain`) carries the
  cohesion the folders should have carried.

The styles directory already noticed this and moved to feature
naming (`sync.css`, `shortcuts.css`, `command_palette.css`). The TS
side did not follow.

---

## 5. Two reorganization patterns to consider

The goal is not to abandon the suffix vocabulary (it works) but to
flip the **first axis** from layer to feature where the feature
already dominates.

### Option A — Feature folders (full pivot)

```
src/shell/renderer/
├── app.tsx
├── index.html / index.ts
├── styles/                          (unchanged — already feature-first)
├── primitives/                      (genuine cross-feature UI atoms)
│   ├── badge_accessory.component.tsx
│   ├── brand_icon_or_glyph.component.tsx
│   ├── kbd_chip.component.tsx
│   ├── md_view.component.tsx
│   └── preview_image.component.tsx
├── features/
│   ├── list/
│   │   ├── list.page.tsx
│   │   ├── list_main.component.tsx
│   │   ├── components/                ← list-only components
│   │   ├── hooks/                     ← list-only hooks
│   │   ├── utils/                     ← list-only utilities
│   │   └── index.ts                   ← public surface
│   ├── detail/
│   ├── shortcuts/                     ← absorbs components/shortcuts +
│   │                                    hooks/shortcuts + utils/shortcuts
│   ├── tasks/
│   ├── sync/                          ← absorbs the 8 sync_* files now in shared
│   ├── settings/
│   ├── command_palette/               ← absorbs renderer/actions + components/actions
│   └── handoff/                       (if grows)
├── kernel/                            cross-feature renderer infra
│   ├── action_toast_host.component.tsx
│   ├── overlay_shell_layout.const.ts
│   ├── use_action_toast.hook.ts
│   ├── use_debounced_value.hook.ts
│   ├── rpc/                           Eden Treaty client
│   └── constants/                     icons, layout, ui
```

**Pros**: discoverability collapses ("where's the sync UI?" → `features/sync/`),
single-caller hooks become private to their feature folder (or get
inlined without leaving the folder), CSS and TypeScript organizations
align, onboarding cost drops sharply, the `app-quality-gate` line-
length pressure drops because the orchestrator can be split *within
the feature folder* without hopping kinds.

**Cons**: large one-time rename, every import path changes, the
`.ls-lint.yml` directory contract has to be rewritten, code search
links / external docs / agent skills referencing paths drift, the
existing `app-context` skill's directory tree is invalidated. Real
risk of "rename for rename's sake" if the layer-first model is
working better than this audit suggests.

### Option B — Keep top-level layers; introduce feature sub-folders consistently

```
src/shell/renderer/
├── components/
│   ├── primitives/      ← was shared/, minus the sync_* and toast files
│   ├── list/            (unchanged)
│   ├── shortcuts/       (unchanged)
│   ├── detail/          (unchanged)
│   ├── tasks/           (rename from task/)
│   ├── sync/            ← move sync_* component files here
│   └── command_palette/ ← rename actions/ for clarity
├── hooks/
│   ├── shared/          (use_debounced_value, use_action_toast)
│   ├── list/
│   ├── shortcuts/
│   ├── detail/
│   ├── tasks/           ← rename from task hook scatter
│   ├── sync/            ← move use_sync_modal_expansion + 2 misplaced .util.ts
│   └── settings/
├── utils/
│   ├── shared/
│   ├── list/
│   ├── shortcuts/
│   ├── sync/            ← move sync_modal_errors.util.ts
│   └── tasks/
├── actions/             (unchanged or rename to "entry_actions/")
└── styles/              (unchanged)
```

**Pros**: incremental, preserves the existing mental model and
`app-context` skill, restores the `hooks/` directory's invariant
(only hooks), gives the sync feature a proper home, addresses §3's
P2 findings without touching pages/components composition.

**Cons**: doesn't address the layer-first ↔ feature-shaped mismatch
that produces single-caller hooks. The 17-single-caller-hook count
will keep growing under feature work. Option B is the "tidy what's
broken" path; Option A is the "fix the taxonomy" path.

### A middle path

The right answer for kb at v0.10 is probably a **partial pivot**:

1. **Apply Option B in full now** (small, reversible, addresses every
   P2 in §3).
2. **Take Option A's `primitives/` extraction** — split
   `components/shared/` into `primitives/` (5 files) and a relocated
   `features/sync/` (8 files). This is the clearest win.
3. **Treat Option A as a v0.11 candidate** if feature count grows
   (e.g., new feature like AI-suggested tags, dependency graph, OS
   integration adds 5+ more components). Re-evaluate then.

---

## 6. Patterns for the orchestrator problem

§3 P1 (single-caller hooks) and §3 P1 (pages-as-wrappers) are aspects
of the same root cause: **the list page's orchestration is fragmented
across one page, one component, one shell hook, and 17 satellite
hooks.** Three patterns from the React community apply:

### 6.1 Container/Presenter (Dan Abramov, 2015; deprecated by hooks but the *idea* survives)

The "presenter" component is pure layout; the "container" component
owns state and effects. kb's `ListPage` is currently a non-container
wrapper around `ListMain` (which is both container and presenter).
A genuine container layer means `ListPage` calls `useListPageShell`,
owns the keyboard wiring, and passes a fully-resolved props object
to a thinner `ListMain` that does layout only. Net result: one
orchestrator file, not three.

### 6.2 The "hook composition root" (Tanner Linsley, react-query patterns)

When a screen needs ≥ 5 hooks, build one "screen hook" that exposes
a typed, normalised shape and **inlines** the smaller hook bodies.
Resist the urge to extract each effect into its own hook unless
there's a second caller (or a clearly-bounded test surface that
isolation buys). This is exactly the rule kb is currently violating.

The smaller hooks that survive should be the ones with real reuse
(`useDebouncedValue`, `useActionToast`, `useVirtualListWindow`)
or genuine isolation value (`useTaskKeyboard` as a feature-level
unit you'd test independently). The 17 single-caller hooks fail both
tests.

### 6.3 The "Compound Component" pattern (Kent C. Dodds)

When `ListMain` is essentially a flat layout calling 4 sub-components
(`ListSearchFilterChrome`, `ListResultsBody`, `ListFooter`,
`ListOverlayHosts`), the composition fits the Compound pattern:

```tsx
<ListShell>
  <ListShell.SearchFilter ... />
  <ListShell.Results ... />
  <ListShell.Footer ... />
  <ListShell.Overlays ... />
</ListShell>
```

with a shared Context providing the shell state. Whether this is worth
the ceremony at kb's scale is a judgement call; the upside is that the
prop-spreading in [list_main.component.tsx#L211-L298](../../../../../src/shell/renderer/components/list/list_main.component.tsx#L211) — currently 80
lines of "pass `p.*` to children" — vanishes.

---

## 7. Recommendations by priority and ROI

Tiers carry the same meaning as the parent report.

### Tier A — High impact, low effort

| #   | Recommendation                                                                                                                     | Effort | Impact                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------- |
| PA1 | Move 2 misplaced `.util.ts` files out of `hooks/list/` into `utils/list/`.                                                         | XS     | Low (but restores the invariant) |
| PA2 | Move `pages/detail/detail_shortcut_body.component.tsx` to `components/detail/`.                                                    | XS     | Low                              |
| PA3 | Move `pages/settings/settings.types.ts` inline into the page (or rename folder to allow `*.types.ts`).                             | XS     | Low                              |
| PA4 | Inline the 3 single-caller `use_list_surface_*` hooks into `useListPageShell` (already marked with `biome-ignore` to accommodate). | S      | Medium                           |
| PA5 | Inline `use_list_page_focus_ring` into `ListPage` (1 caller, 1 effect).                                                            | XS     | Low                              |
| PA6 | Inline `use_filter_dropdown_stats`, `use_list_pointer_selection` into `ListMain` if not separately tested in isolation.            | S      | Medium                           |
| PA7 | Adopt a documented "single-caller-hooks must justify isolation" rule in the testing guide. Prevents recurrence.                    | XS     | High                             |

### Tier B — Structural, medium effort

| #   | Recommendation                                                                                                                                                                                                                                       | Effort | Impact                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------- |
| PB1 | Split `components/shared/` → `components/primitives/` (5 files) + `components/sync/` (8 files). Move `use_sync_modal_expansion.hook.ts` and `sync_modal_errors.util.ts` to the matching `hooks/sync/` and `utils/sync/` folders.                     | M      | High (fixes the largest mis-categorisation) |
| PB2 | Rename `renderer/actions/` to `renderer/entry_actions/` (or move to `features/entry_actions/` under Option A).                                                                                                                                       | XS     | Low (clarity)                               |
| PB3 | Establish a clear "page" convention: pages own composition (state, effects, layout *root*), components own visual presentation. Migrate `ListPage` to absorb `ListMain`'s state-shaped work and let `list_main.component.tsx` shrink to pure layout. | M      | High                                        |
| PB4 | Rename the `use_list_page_*` cluster so the orchestrator is clearly named (`useListPageOrchestrator`?) and the data hooks are clearly grouped (`useListData`, `useListFilters`, `useListRows` — drop the `page` infix).                              | S      | Medium                                      |

### Tier C — Strategic (consider for v0.11+)

| #   | Recommendation                                                                                                                                                                                                        | Effort | Impact           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------- |
| PC1 | Pivot to feature-folder organization (Option A in §5). Re-evaluate when total feature count crosses ~8, or when a new contributor reports navigation pain.                                                            | L      | High (long-term) |
| PC2 | Consider the Compound Component pattern for `ListShell` if `list_main.component.tsx` keeps growing.                                                                                                                   | M      | Medium           |
| PC3 | Add an ast-grep / dependency-cruiser rule that flags single-caller hooks (heuristic: a `use_*.hook.ts` file in `hooks/<feature>/` with exactly one importer outside its spec). Make the rule a warning, not an error. | M      | Medium           |

---

## 8. Relevant literature and patterns

These are the references and heuristics the recommendations are
drawn from. None of them is dogma; they are the working notes of
mid-size React apps that solved comparable problems.

### Folder organization

- **Kent C. Dodds — "Colocation"** (https://kentcdodds.com/blog/colocation).
  Argues that the unit of organization should be the unit of change.
  kb's CSS already follows this; the JS does not.
- **Mark Erikson — "Redux Style Guide" / Feature-folders**
  (https://redux.js.org/style-guide/). The "feature folder" pattern
  predates Redux Toolkit but is most cleanly described there.
  Recommends grouping reducers, components, and selectors by feature.
- **Bulletproof React** (https://github.com/alan2207/bulletproof-react).
  A widely-cited template for mid-size React apps. Its `src/features/`
  shape is the reference for §5 Option A.
- **shadcn/ui codebase**. Uses `components/ui/` for primitives,
  feature folders for everything else. Same instinct as the
  proposed `primitives/` extraction.

### Hook composition

- **TkDodo — "useState lazy initialization"** and the
  "react-query patterns" series at https://tkdodo.eu/blog/. The
  "screen hook" pattern (§6.2) is from there.
- **Dan Abramov — "Don't extract a hook before you have a second
  caller"** (recurring theme in his Discord/X comments; not formally
  written up). The mirror of YAGNI for hooks.
- **React docs — "Reusing Logic with Custom Hooks"**
  (https://react.dev/learn/reusing-logic-with-custom-hooks).
  Explicitly notes that hooks should be extracted for reuse OR
  conceptual clarity, not just shorter components.

### Container / presenter

- **Dan Abramov — "Smart and Dumb Components"** (2015; the post he
  later marked as deprecated). The pattern's *names* aged badly but
  the *separation* is what §6.1 leans on.
- **Cory House — "Container Components"**. Same idea, cleaner
  vocabulary.

### Desktop-app specific

- **Linear's internal architecture** (described in podcasts /
  conference talks). Uses a strong "model-view" split with the
  view layer entirely free of business logic. Their model layer is
  effectively what kb's `App` service is becoming.
- **Tana / Obsidian plugin ecosystem**. Both organise their plugin
  surface by feature, not by layer; their core/ vs ui/ split mirrors
  kb's core/ vs renderer/ split.

### When *not* to do feature folders

- **Most enterprise design-system libraries** (MUI, Mantine,
  Chakra). They are layer-first because their work *is* a layer.
  The same logic applies to kb's `components/primitives/`: things
  that are genuinely cross-feature *should* be layer-organised.

---

## 9. What to skip

The brief asked for pragmatism, not theory. Items I considered and
rejected:

- **Adopting a state-management library (Redux/Zustand/Jotai).** kb's
  current `useState` + hook-passed-down pattern is appropriate for
  this scale. The pain comes from hook fragmentation, not from state
  management. A library would add ceremony without reducing the
  hook count.
- **TanStack Query / SWR for the RPC layer.** Eden Treaty already
  gives type-safe RPC and the renderer's data shape is mostly
  request/response (not cache-shaped). Introducing a cache library
  would help only if the renderer starts doing heavy background
  refetches, which it isn't.
- **An atomic-design layer (atoms / molecules / organisms).** A
  classification system with five layers won't survive contact
  with this codebase. `primitives/` + `features/` covers the same
  ground at lower cost.
- **Storybook for the primitives.** Worth considering once
  `primitives/` exists, but not before — premature for the current
  count of UI atoms.
- **Tailwind for inline utility classes.** The current
  `cmp-*` + `.semantic-*` convention is doing well; switching would
  re-fragment the CSS organization that already works.

---

## 10. Summary

The presentation layer is **organisationally tired, not broken**.
The pieces work; the directory layout is misaligned with how the
work actually shapes itself. The single highest-impact change is
to split `components/shared/` into a real primitives folder and a
proper `sync/` feature folder; the second is to **stop extracting
single-caller hooks** as a habit and let `useListPageShell` /
`ListMain` carry their orchestrator weight (with one
`biome-ignore`, not seventeen private hooks).

The Tier A list is shippable in a single afternoon and removes
most of the daily friction. Tier B is a v0.11 conversation. Tier C
is a feature-count threshold question — revisit when the count of
top-level features doubles.

The presentation-layer recommendations are independent of the
parent report's recommendations and can land in parallel.
