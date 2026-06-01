<!-- markdownlint-disable-file -->

# Codebase consolidation — Audit report

## Overview

This audit was triggered by visible file-count bloat (notably 17 utility
modules under `src/shell/renderer/utils/list/`) and a duplicated `'◆'`
glyph spotted across the renderer. The scan widened to every layer
(`src/core/`, `src/shared/`, `src/shell/app/`, `src/shell/main/`,
`src/shell/renderer/`) and assessed three axes:

1. **Layer purity** — does `src/core/` actually own all pure domain logic,
   and do the other layers stay free of domain rules?
2. **DRY** — are constants, glyphs, type aliases, and small helpers defined
   in a single place?
3. **File count** — are there single-caller extractions, thin pass-through
   modules, or topic-cohesive utility files that have been split too finely?

The codebase is healthy overall. The app quality stack (Biome, knip,
dependency-cruiser, ls-lint, ast-grep, jscpd) is already enforcing the
big rules. The findings below are about **leaks that the current rules do
not catch** and **structural drift that the rules permit but do not
encourage**.

This report is the input to:

- [`requirements.md`](requirements.md) — EARS requirements.
- [`design.md`](design.md) — target module map and consolidation plan.
- [`tasks.md`](tasks.md) — six phased tracks, one commit per track.
- [`handoff.md`](handoff.md) — implementation handoff prompt.

## Baseline metrics

| Metric                                                             | Value | Source                                                                             |
| ------------------------------------------------------------------ | ----- | ---------------------------------------------------------------------------------- |
| Non-spec `.ts(x)` files under `src/`                               | 219   | `find src -type f \( -name '*.ts' -o -name '*.tsx' \) ! -name '*.spec.*' \| wc -l` |
| Co-located `.spec.ts(x)` files                                     | 128   | same `find` with `-name '*.spec.*'`                                                |
| Files in `src/shell/renderer/hooks/list/` (non-spec)               | 28    | `ls src/shell/renderer/hooks/list/`                                                |
| Files in `src/shell/renderer/utils/list/` (non-spec)               | 17    | `ls src/shell/renderer/utils/list/`                                                |
| Files in `src/shell/renderer/components/list/` (non-spec)          | 15    | `ls src/shell/renderer/components/list/`                                           |
| Files in `src/shell/app/lib/` (non-spec)                           | 13    | `ls src/shell/app/lib/`                                                            |
| Non-component importers of `filter_dropdown.component.tsx` symbols | 13    | grep `from '../../components/list/filter_dropdown.component'`                      |
| `TASK_VIEWS` literal arrays defined in source                      | 3     | grep `['actionable', 'today', 'overdue', 'this_week', 'all_pending', 'all_doing']` |
| `'◆'` literals in `src/` (excluding specs)                         | 2     | grep `◆`                                                                           |
| `.catch(() => undefined)` fire-and-forget call sites               | 34    | grep `\.catch\(\(\) => undefined\)`                                                |
| `ReturnType<typeof use*>` couplings outside the defining file      | 3     | grep `ReturnType<typeof use`                                                       |

All commands ran from repository root on commit `7e822eb`
(`fix(tests): Remove unused DOM references`).

## Priority key

- **P1 — Architectural** — domain logic in the wrong layer; rule guards
  do not catch it today.
- **P2 — DRY** — duplicate constants, types, or behaviour with high
  drift risk.
- **P3 — File count / cohesion** — over-extracted modules; topic-cohesive
  utility files that fragment a single concept across multiple files.

## P1 findings — Layer purity (Track A in tasks.md)

### A1. `EntryTypeOption` is a literal duplicate of `EntryType`

`src/shell/renderer/components/list/filter_dropdown.component.tsx:19-20`:

```ts
const ENTRY_TYPES = ['bookmark', 'command', 'cheat', 'task'] as const
export type EntryTypeOption = (typeof ENTRY_TYPES)[number]
```

`src/core/domain/constants/entry.const.ts:4` already defines:

```ts
export const ENTRY_TYPE_VALUES = ['bookmark', 'command', 'cheat', 'task'] as const
```

and `src/core/domain/types/entry.types.ts:3` exports
`type EntryType = (typeof ENTRY_TYPE_VALUES)[number]`. The two are
structurally identical.

`EntryTypeOption` is imported by **13 non-component files** across
`hooks/list/`, `utils/list/`, `components/list/` (sibling files), and
`use_list_page_shell.hook.ts`. Every import is a layer leak: a util or
hook reaching into a component file to obtain a value that the core
domain already owns.

### A2. `sortedTags`, `showTaskSection`, `TASK_VIEWS` live inside a component

Same file, `filter_dropdown.component.tsx:22, 24-35, 37-39`:

- `TASK_VIEWS: TaskView[] = ['actionable', 'today', 'overdue', 'this_week', 'all_pending', 'all_doing']` — pure data.
- `sortedTags(tags, q, selectedTags)` — pure function over tag counts.
- `showTaskSection(types)` — pure predicate.

All three are imported and consumed by hooks (`use_compact_filter_overlay.hook.ts`,
`use_compact_filter_overlay_rows.hook.ts`) and other components — these are
domain rules, not React component code.

### A3. `src/shell/app/lib/app_tag_suggest.util.ts` is pure domain logic

`STOP_WORDS`, `extractKeywords(text)`, `computeCooccurrence(entry, all, existing)`,
`SUGGEST_MAX_RESULTS`. No I/O, no `bun:sqlite`, no `node:fs`. Belongs in
`src/core/domain/models/knowledges/tags/`.

### A4. `src/shell/app/lib/app_tag_rank.util.ts` is pure domain logic

`rankSuggestedTags(entry, allEntries)` over `Knowledge`. No I/O. Belongs
in the same new `core/domain/models/knowledges/tags/` module.

### A5. `src/shell/app/lib/task_views.util.ts` is pure domain logic

Defines:

- `filterKnowledgeByTaskView(rows, view, now?)`
- `countTasksByView(rows, now?)`
- `isOverdue(k, now)`
- `isActionablePlaceholder(k)`
- A `TASK_VIEW_FILTERS` predicate map.

Pure operations over `Knowledge[type='task']`. Belongs in
`src/core/domain/models/knowledges/task_views/`.

### A6. `src/shell/app/lib/app_entry_preview.util.ts` is pure parsing

`OG_IMAGE_RE`, `OG_IMAGE_REVERSE_RE`, `YOUTUBE_ID_RE`,
`previewImageFromHtml`, `youtubePreviewImage`. Pure regex parsing.
Belongs in `src/core/domain/models/knowledges/preview/`.

`OG_FETCH_TIMEOUT_MS` is a configuration constant for an I/O wrapper —
it stays in `shell/app/lib/` with the fetch wrapper.

### A7. `src/shell/app/lib/app_list_opts.util.ts` is pure shaping

`stableListCacheKey(opts)` and `toFindAllOpts(opts)` shape `ListOpts`
without touching the DB. `DEFAULT_LIST_PAGE_SIZE = 50` is a domain
default. Belongs in `src/core/helpers/list_opts/` (mirrors existing
`src/core/helpers/frecency/`).

### A8. `utils/list/list_page_empty_flags.util.ts` couples to a hook return type

`list_page_empty_flags.util.ts:3`:

```ts
type ListData = ReturnType<typeof useListPageData>
```

A util importing a hook's inferred return type is a back-reference into
the I/O layer it should be independent of. Replace with an explicit
input type (`{ rows, dbStats, loading, debouncedSearch }`).

## P2 findings — DRY (Track B in tasks.md)

### B1. `TASK_VIEWS` literal duplicated 3 times

Identical `['actionable', 'today', 'overdue', 'this_week', 'all_pending', 'all_doing']`:

- `src/shell/renderer/components/list/compact_filter_overlay_build_rows.util.ts:6`
- `src/shell/renderer/components/list/filter_dropdown.component.tsx:22`
- `src/shell/app/lib/app_list_stats_for_filters.util.ts:12`

Any reorder, addition, or removal must be applied in three places or the
UI drifts from the stats. Centralise to `TASK_VIEW_ORDER` in
`src/core/domain/models/knowledges/task_views/` and re-export through
`@shared/rpc` if shared transport needs it.

### B2. `'◆'` glyph duplicated, plus four entry-type glyphs hidden in a function

`src/shell/renderer/constants/icons.const.ts:7,14`:

```ts
github: '◆',
example: '◆'
```

`src/shell/renderer/utils/shared/get_icon.util.tsx:10-21`:

```ts
function typeGlyphChar(entry: RpcKnowledge): string {
  switch (entry.type) {
    case 'bookmark': return '◆'
    case 'command': return '▸'
    case 'cheat': return '~'
    case 'task': return '✓'
  }
}
```

Two leaks: the bookmark glyph `'◆'` literal appears twice, and the
per-type glyph table is buried inside a function instead of being a
declared `ENTRY_TYPE_GLYPH: Record<EntryType, string>` constant. Move
the table to `src/core/domain/constants/entry.const.ts` (where
`DEFAULT_ENTRY_ICONS` already lives) and have both call sites import it.

### B3. `.catch(() => undefined)` repeated 34 times

This silent-failure idiom appears at 34 call sites in `src/`. Extract a
single `fireAndForget` helper to centralise the intent (and make it
easy to add observability later — e.g. a debug log per error). The
existing `record_entry_visit.util.ts` is the only call site that
already wraps it in a named helper — fold it into the generic helper.

### B4. `scheduleDoubleRaf` reinvented in `list_main.component.tsx`

`src/shell/renderer/utils/list/schedule_double_raf.util.ts:6-14` exports
`scheduleDoubleRaf(run)`. Yet `list_main.component.tsx` re-rolls the
same `queueMicrotask → raf → raf` chain at two call sites:

- `list_main.component.tsx:106`:
  `queueMicrotask(() => requestAnimationFrame(() => requestAnimationFrame(tryFocus)))`
- `list_main.component.tsx:134-138` inside `focusMainSearch`.

Both should call `scheduleDoubleRaf`.

### B5. `list_entries_query.util.ts` is a thin re-export pass-through

`src/shell/renderer/utils/list/list_entries_query.util.ts` (27 lines,
single caller) re-exports `listOptsFromListFilters` and wraps a
one-line RPC call. The pass-through hides the call graph without
adding behaviour.

## P3 findings — File count / cohesion (Tracks C, D, E, F in tasks.md)

### C1. Over-extracted compact-filter-overlay hooks

`src/shell/renderer/hooks/list/`:

| File                                        | Lines | Callers                   |
| ------------------------------------------- | ----- | ------------------------- |
| `use_compact_filter_overlay.hook.ts`        | 129   | 1 (the overlay component) |
| `use_compact_filter_overlay_focus.hook.ts`  | 8     | 1 (the main hook above)   |
| `use_compact_filter_overlay_rows.hook.ts`   | 63    | 1                         |
| `use_compact_filter_overlay_scroll.hook.ts` | 28    | 1                         |

`_focus` is an 8-line `setTimeout(focus, 0)` effect — single caller,
no test value over inlining. `_scroll` is a 28-line resize-observer
wiring — single caller. Inline both into the parent hook; keep `_rows`
because it carries its own non-trivial memoisation surface.

### D1. `utils/list/` is 17 modules covering 7 concepts

Current files (each non-spec):

| File                                               | Lines | Concept                    |
| -------------------------------------------------- | ----- | -------------------------- |
| `virtual_list_window.util.ts`                      | 35    | virtual list math          |
| `list_viewport_page_size.util.ts`                  | 24    | virtual list math          |
| `read_list_scroll_metrics.util.ts`                 | 22    | virtual list math          |
| `list_page_tab_ring.util.ts`                       | —     | list keyboard              |
| `list_search_typeahead.util.ts`                    | —     | list keyboard              |
| `list_surface_focus.util.ts`                       | 16    | list keyboard              |
| `schedule_double_raf.util.ts`                      | 30    | scroll/focus scheduling    |
| `ensure_option_row_visible_in_scroll_root.util.ts` | 123   | scroll/focus scheduling    |
| `list_filter_summary.util.ts`                      | 13    | list filters               |
| `list_opts_from_filters.util.ts`                   | 21    | list filters               |
| `list_entries_query.util.ts`                       | 27    | list filters               |
| `frecency_tier.util.ts`                            | —     | frecency                   |
| `record_entry_visit.util.ts`                       | 5     | frecency / fire-and-forget |
| `clipboard_copy_toast.util.ts`                     | —     | formatters                 |
| `list_footer_status.util.ts`                       | —     | formatters                 |
| `list_page_empty_flags.util.ts`                    | —     | page state                 |
| `view_reducer.util.ts`                             | 14    | page state                 |

Each concept has a single coherent API surface. Merging within concepts
reduces 17 modules to **7 modules** (and matching specs). See `design.md`
section "Track D — `utils/list/` consolidation map" for the new file
list and per-export migration.

### E1. `.util.ts` files live under `components/list/`

`src/shell/renderer/components/list/` currently contains three util
modules:

- `filter_row_icon_basename.util.ts`
- `compact_filter_overlay_build_rows.util.ts`
- `compact_filter_overlay_keyboard.util.ts`

These are not React components. The repo convention (and `.ls-lint.yml`)
expects utility files under `utils/`. Move them to
`src/shell/renderer/utils/list/` and update imports.

### F1. Cross-layer `ReturnType<typeof useX>` couplings

`grep -rn "ReturnType<typeof use" src/` returns three real call sites
(excluding the defining files):

- `src/shell/renderer/utils/list/list_page_empty_flags.util.ts:3` —
  util reaching into a hook's return type (A8 above).
- `src/shell/renderer/components/list/list_results_body.component.tsx:20` —
  component prop type derived from `useVirtualListWindow` — acceptable
  if same-folder, but should be the explicit `VirtualListWindow` type
  exported from the consolidated `virtual_list.util.ts`.
- `src/shell/renderer/hooks/list/use_list_page_shell.hook.ts:196` —
  `export type ListPageShell = ReturnType<typeof useListPageShell>` —
  acceptable self-export.

## Out of scope (deliberately)

| Area                                                    | Why                                                                                                   |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Biome suppression removal                               | Owned by [`../codebase-quality-audit/`](../codebase-quality-audit/).                                  |
| New guards, tests, mise tasks for past findings         | Owned by [`../codebase-best-practices-audit/`](../codebase-best-practices-audit/), already completed. |
| `src/core/domain/models/entries/schemas/` size          | TypeBox schema files are intentionally small; one schema per file is the chosen pattern.              |
| `src/shell/renderer/components/shared/` count (9 files) | Each is a distinct UI primitive; no consolidation candidates found.                                   |
| `src/shell/renderer/actions/` (8 files)                 | Each maps to one concrete entry action; cohesion already maximised.                                   |
| `src/__tests__/factories/` and `src/__tests__/helpers/` | Test-only; structure is already conventional.                                                         |

## Closure metrics

After all six tracks land, the report's baseline metrics should change as
follows (validated by `tasks.md` acceptance criteria):

| Metric                                                                  | Before    | Target                                 |
| ----------------------------------------------------------------------- | --------- | -------------------------------------- |
| `src/shell/renderer/utils/list/` (non-spec files)                       | 17        | 7                                      |
| `src/shell/renderer/hooks/list/use_compact_filter_overlay_*` (non-spec) | 4         | 2                                      |
| `src/shell/renderer/components/list/*.util.ts` (non-spec)               | 3         | 0                                      |
| Non-component importers of `filter_dropdown.component.tsx`              | 13        | 0                                      |
| `TASK_VIEWS` array literal definitions                                  | 3         | 1                                      |
| `'◆'` literal occurrences in `src/` (non-spec)                          | 2         | 1                                      |
| `.catch(() => undefined)` call sites (non-spec)                         | 34        | 0 (all routed through `fireAndForget`) |
| `ReturnType<typeof use*>` couplings across layers                       | 1 (A8)    | 0                                      |
| Pure-domain `.util.ts` files in `src/shell/app/lib/`                    | 5 (A3–A7) | 0                                      |
