<!-- markdownlint-disable-file -->

# Codebase consolidation — Design

## OVERVIEW

This document is the implementation blueprint for the findings in
[`report.md`](report.md) and the requirements in
[`requirements.md`](requirements.md). It specifies the **exact target
shape** for every move, merge, and rename so the implementer never has
to choose a name or location.

The work ships as six **tracks**, each a single commit:

| Track | Title | Owner requirement |
| --- | --- | --- |
| A | Move pure domain logic from `shell/app/lib/` to `core/` | R2 |
| B | Centralise duplicated constants and add `fireAndForget` | R4, R5, R9 |
| C | Inline single-caller overlay hooks | R7 |
| D | Consolidate `utils/list/` from 17 → 7 modules | R6 |
| E | Move `.util.ts` out of `components/list/` to `utils/list/` | R8 |
| F | Replace cross-layer `ReturnType<typeof useX>` couplings | R10 |

Tracks ship in **A → B → C → E → D → F** order
(see [`tasks.md`](tasks.md) §Sequencing).

## Target module map

### Track A — New domain modules in `src/core/`

```text
src/core/
  domain/
    constants/
      entry.const.ts                # ← add ENTRY_TYPE_GLYPH here
    models/
      knowledges/
        tags/                       # ← NEW directory
          index.ts                  # barrel
          stop_words.const.ts       # STOP_WORDS
          extract_keywords.util.ts  # extractKeywords
          cooccurrence.util.ts      # computeCooccurrence
          rank_suggested_tags.util.ts  # rankSuggestedTags
          sorted_tags.util.ts       # sortedTags (moved from filter_dropdown.component)
        task_views/                 # ← NEW directory
          index.ts                  # barrel
          task_view_order.const.ts  # TASK_VIEW_ORDER (replaces 3 duplicates)
          filter_by_view.util.ts    # filterKnowledgeByTaskView
          count_by_view.util.ts     # countTasksByView
          is_overdue.util.ts        # isOverdue
          is_actionable.util.ts     # isActionablePlaceholder
          show_task_section.util.ts # showTaskSection
        preview/                    # ← NEW directory
          index.ts                  # barrel
          og_image.regex.const.ts   # OG_IMAGE_RE, OG_IMAGE_REVERSE_RE
          youtube_id.regex.const.ts # YOUTUBE_ID_RE
          preview_image.parser.ts   # previewImageFromHtml, youtubePreviewImage
  helpers/
    list_opts/                      # ← NEW directory
      index.ts                      # barrel
      default_page_size.const.ts    # DEFAULT_LIST_PAGE_SIZE
      stable_cache_key.util.ts      # stableListCacheKey
      to_find_all_opts.util.ts      # toFindAllOpts
```

`shell/app/lib/app_*` files keep ONLY the I/O wrappers (e.g. the
`fetch`-based preview fetcher in `app_preview_fetch.util.ts` and the
DB-touching wrappers in `app_list_query.util.ts`). They import the
pure functions from `src/core/`.

**Type fix for `ListOpts` re-import:** `to_find_all_opts.util.ts` lives
in `core/` and needs `FindAllOpts` (currently exported from
`src/shell/app/db/entry.repository.ts`). Resolution: define
`type FindAllOpts` in `src/core/helpers/list_opts/find_all_opts.types.ts`
and have `entry.repository.ts` import it from there. This keeps the
forbidden-import boundary intact.

### Track B — Centralised constants and `fireAndForget`

```text
src/core/domain/constants/entry.const.ts
  + export const ENTRY_TYPE_GLYPH: Record<EntryType, string> = {
      bookmark: '◆',
      command: '▸',
      cheat: '~',
      task: '✓'
    } as const

src/shared/utils/
  fire_and_forget.ts                # ← NEW
  index.ts                          # re-export fireAndForget

src/shell/renderer/constants/icons.const.ts
  - github: '◆',
  - example: '◆'
  + github: ENTRY_TYPE_GLYPH.bookmark,
  + example: ENTRY_TYPE_GLYPH.bookmark
  (import ENTRY_TYPE_GLYPH from '@core')
```

`fireAndForget` signature:

```ts
export function fireAndForget<T>(p: Promise<T>): void {
  p.catch(() => undefined)
}
```

Future observability hook (out of scope today, documented for the
reviewer): the helper is the seam where a `createLogger().warn(...)`
call can be added later without touching the 34 call sites again.

### Track C — Hook inlining target

```text
src/shell/renderer/hooks/list/
  use_compact_filter_overlay.hook.ts         # absorbs focus + scroll
  use_compact_filter_overlay_rows.hook.ts    # unchanged
  use_compact_filter_overlay_focus.hook.ts   # DELETED
  use_compact_filter_overlay_focus.hook.spec.tsx  # DELETED
  use_compact_filter_overlay_scroll.hook.ts  # DELETED
  use_compact_filter_overlay_scroll.hook.spec.tsx # DELETED
```

The `useEffect(() => { const t = setTimeout(...) }, [searchInputRef])`
block from `_focus` and the two effects from `_scroll` move verbatim
into `useCompactFilterOverlay`, placed immediately after the
existing `useCompactFilterOverlayRows` call.

Spec coverage: any spec assertions that lived in the deleted spec
files SHALL be merged into
`use_compact_filter_overlay.hook.spec.tsx`. If the merged spec exceeds
Biome's `noExcessiveLinesPerFile` (today 400), split by `describe`
block — do not introduce a new `*-focus.hook.spec.ts` file.

### Track D — `utils/list/` consolidation map

Final non-spec file list under `src/shell/renderer/utils/list/`:

| New module | Exports |
| --- | --- |
| `virtual_list.util.ts` | `virtualListWindow`, `VirtualListWindow`, `listViewportPageSize`, `effectiveListPageSize`, `readListScrollMetrics`, `ListScrollMetrics` |
| `list_keyboard.util.ts` | `tabIndexAttr` (private), `nextTabbable`, `focusListSurface`, `blurDescendantsKeepingRoot`, `listSearchTypeaheadAction`, `ListSearchTypeaheadAction` |
| `list_scroll.util.ts` | `scheduleDoubleRaf`, `scheduleFocusSearchInputSelectAll`, `ensureOptionRowVisibleInScrollRoot`, `EnsureOptionRowVisibleOptions`, `computeScrollTopAdjustmentForVisibility` |
| `list_filters.util.ts` | `listFilterSummary`, `listOptsFromListFilters`, `loadListRows` |
| `list_frecency.util.ts` | `frecencyDisplayTier`, `recordEntryVisitFireAndForget` (re-exported through `fireAndForget`) |
| `list_formatters.util.ts` | `previewForClipboardCopiedToast`, `clipboardCopiedToastMessage`, `formatListFooterStatus`, `ListFooterStatusInput`, `CLIPBOARD_COPIED_TOAST_PREVIEW_MAX` |
| `list_page_state.util.ts` | `listPageEmptyFlags`, `ListEmptyFlagsInput`, `viewReducer`, `ViewState`, `ViewAction` |

Mapping from old → new (every old file is accounted for):

| Old file | Merged into |
| --- | --- |
| `virtual_list_window.util.ts` | `virtual_list.util.ts` |
| `list_viewport_page_size.util.ts` | `virtual_list.util.ts` |
| `read_list_scroll_metrics.util.ts` | `virtual_list.util.ts` |
| `list_page_tab_ring.util.ts` | `list_keyboard.util.ts` |
| `list_search_typeahead.util.ts` | `list_keyboard.util.ts` |
| `list_surface_focus.util.ts` | `list_keyboard.util.ts` |
| `schedule_double_raf.util.ts` | `list_scroll.util.ts` |
| `ensure_option_row_visible_in_scroll_root.util.ts` | `list_scroll.util.ts` |
| `list_filter_summary.util.ts` | `list_filters.util.ts` |
| `list_opts_from_filters.util.ts` | `list_filters.util.ts` |
| `list_entries_query.util.ts` | `list_filters.util.ts` |
| `frecency_tier.util.ts` | `list_frecency.util.ts` |
| `record_entry_visit.util.ts` | `list_frecency.util.ts` |
| `clipboard_copy_toast.util.ts` | `list_formatters.util.ts` |
| `list_footer_status.util.ts` | `list_formatters.util.ts` |
| `list_page_empty_flags.util.ts` | `list_page_state.util.ts` |
| `view_reducer.util.ts` | `list_page_state.util.ts` |

**Imports outside `utils/list/` MUST be updated to point at the new
module path.** Each old export name is preserved verbatim — no
renames, no signature changes inside this track.

### Track E — `.util.ts` exits `components/list/`

| Old path | New path |
| --- | --- |
| `src/shell/renderer/components/list/filter_row_icon_basename.util.ts` | `src/shell/renderer/utils/list/filter_row_icon_basename.util.ts` |
| `src/shell/renderer/components/list/compact_filter_overlay_build_rows.util.ts` | `src/shell/renderer/utils/list/compact_filter_overlay_build_rows.util.ts` |
| `src/shell/renderer/components/list/compact_filter_overlay_keyboard.util.ts` | `src/shell/renderer/utils/list/compact_filter_overlay_keyboard.util.ts` |

Specs move with their files. Imports across the codebase are updated.

### Track F — Hook-return-type coupling

`src/shell/renderer/utils/list/list_page_state.util.ts` (the merged
target from Track D) defines:

```ts
export type ListEmptyFlagsInput = {
  rows: ReadonlyArray<unknown>     // length is the only read
  dbStats: { total: number } | null
  loading: boolean
  debouncedSearch: string
}

export function listPageEmptyFlags(data: ListEmptyFlagsInput) { ... }
```

The hook `useListPageData` already produces these fields. Callers pass
the hook return value directly — TypeScript checks the shape
structurally, so no caller change is needed beyond removing the
`ReturnType` indirection inside the util.

## Sequencing rationale

A before B: domain logic must already live in `core/` so B can centralise
constants in `core/domain/constants/entry.const.ts`.

C before D: inlining the overlay hooks first means Track D does not have
to update the deleted hooks' import paths.

E before D: moving `components/list/*.util.ts` into `utils/list/` first
keeps Track D's merge candidates in one place; otherwise D would have to
handle imports from two folders.

F at the end: the type fix in `list_page_state.util.ts` depends on D's
file rename.

## Allowlist (intentional non-changes)

| Item | Reason |
| --- | --- |
| `src/core/domain/models/entries/schemas/*` (9 schema files) | One TypeBox schema per file is the chosen pattern — fits R3 of the foundation design. |
| `src/shell/renderer/components/shared/*` (9 components) | Each is a distinct UI primitive — no candidates with overlapping props. |
| `src/shell/renderer/actions/*` (8 files) | Each maps to a single concrete entry-action; cohesion already maximal. |
| `src/core/helpers/entry_action/*` (6 files) | Mirrors `src/shell/renderer/actions/` — domain owner for action rules. |
| Biome `noExcessiveLinesPerFunction` suppression on `useListPageShell` | Owned by [`../codebase-quality-audit/`](../codebase-quality-audit/). |
| `tools/preview/server.script.ts` Elysia route registration | Tracked by `CLAUDE.md` rule; this audit does not add new routes. |

## Risk register

| Risk | Mitigation |
| --- | --- |
| `entry.repository.ts` can no longer import `FindAllOpts` from its own module after Track A introduces the core type. | Track A explicitly creates `find_all_opts.types.ts` in `core/helpers/list_opts/` and updates `entry.repository.ts` import line. |
| Merging spec files may exceed Biome `noExcessiveLinesPerFile`. | Per Track C / D notes: split by `describe`, never reintroduce a deleted per-export spec file. |
| `task_views.util.ts` is consumed by `app.ts` and `app_list_stats.util.ts` — moving it changes the call graph the existing best-practices audit's perf comparison test snapshots. | Track A keeps the export name identical (`filterKnowledgeByTaskView` etc.); only the import path changes. The perf-comparison snapshot only watches latency, not call sites. |
| Track D collapses 17 files into 7 — large diff. | Track D ships as **one** commit per R13, but the implementer must split it locally into 7 staged groups (one per merged module) before committing, so review can inspect group-by-group. The handoff repeats this. |
| `'◆'` appears in 5 spec files (`bookmark_entry_icon.component.spec.tsx`). | Specs are out of scope for the literal count assertion in R4 (the rg command uses `--glob '!*.spec.*'`). Specs continue to assert on the rendered character; they read it from `ENTRY_TYPE_GLYPH.bookmark` after Track B. |
