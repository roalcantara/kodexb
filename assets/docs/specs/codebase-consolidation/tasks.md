<!-- markdownlint-disable-file -->

# Codebase consolidation — Tasks

Execute in order, **one commit per track** (R13). After each track:

1. Run the track's per-task verifications.
2. Run the **track close** block (typecheck + lint + targeted tests).
3. Update this file: tick checappoxes, fill in the **Verification** line
   with the commit SHA and the actual command output.
4. Commit using the suggested message.
5. Only then move to the next track.

Working directory for every command: repository root
(`/Users/roalcantara/Work/bun/app` or your local equivalent).

`@core` = `src/core` (TS path alias confirmed by reading `tsconfig.json`
during onboarding). When in doubt, use the relative path printed in the
task body — that is the literal path the implementer SHALL write.

## Phase 0 — Baseline

- [x] **T0.1** Record the starting commit:
      `git rev-parse HEAD > /tmp/codebase-consolidation-baseline.sha`.
- [x] **T0.2** Confirm green baseline:
      `bun test && bun run typecheck && bun run lint`. If any of these
      fail on the starting commit, **stop and report** — do not start
      consolidation work on top of a red tree.
- [x] **T0.3** Capture the metrics block from [`report.md` §Baseline metrics](report.md#baseline-metrics)
      into `tmp/baseline-metrics.txt` (rerun the documented commands;
      pin the actual values). These are the numbers the closing phase
      will diff against.
- **Verification:** baseline `7e822eb`; pre-track HEAD `cdc7f6d`; `bun test` green at consolidation start.

## Track A — Move pure domain logic into `src/core/`

Implements R1, R2, R3. Owner of report findings A1–A7.

- [x] **T A.1** Create directory `src/core/domain/models/knowledges/tags/`.
      Add `index.ts` re-exporting every symbol added in this track.
- [x] **T A.2** Move `STOP_WORDS`, `SUGGEST_MAX_RESULTS`, `extractKeywords`,
      `computeCooccurrence` **verbatim** from
      `src/shell/app/lib/app_tag_suggest.util.ts` to four new files:
      `src/core/domain/models/knowledges/tags/stop_words.const.ts`,
      `extract_keywords.util.ts`, `cooccurrence.util.ts`,
      `suggest_max_results.const.ts`. Keep export names identical.
      Move the matching `.spec.ts` next to each new file (split if
      multiple symbols share one spec today).
- [x] **T A.3** Move `rankSuggestedTags` from
      `src/shell/app/lib/app_tag_rank.util.ts` to
      `src/core/domain/models/knowledges/tags/rank_suggested_tags.util.ts`.
      Move its spec next to it.
- [x] **T A.4** Replace the old files `app_tag_suggest.util.ts` and
      `app_tag_rank.util.ts` with **re-export-only shims** that point
      at the new core paths, then update every importer in
      `src/shell/app/` and `src/shell/main/` to import directly from
      `@core`. Delete the shims once no importer references them
      (`rg "from '.*app_tag_(suggest|rank)\.util'" src/` returns 0).
- [x] **T A.5** Create `src/core/domain/models/knowledges/task_views/`.
      Move from `src/shell/app/lib/task_views.util.ts`:
      `filterKnowledgeByTaskView` → `filter_by_view.util.ts`,
      `countTasksByView` → `count_by_view.util.ts`,
      `isOverdue` → `is_overdue.util.ts`,
      `isActionablePlaceholder` → `is_actionable.util.ts`.
      Keep export names identical.
- [x] **T A.6** In the same `task_views/` directory create
      `task_view_order.const.ts` exporting
      `export const TASK_VIEW_ORDER: TaskView[] = ['actionable', 'today', 'overdue', 'this_week', 'all_pending', 'all_doing']`.
      Add `task_views/index.ts` barrel.
- [x] **T A.7** Update **all three** existing `TASK_VIEWS` literals to
      import `TASK_VIEW_ORDER` instead:
      `src/shell/renderer/components/list/compact_filter_overlay_build_rows.util.ts:6`,
      `src/shell/renderer/components/list/filter_dropdown.component.tsx:22`,
      `src/shell/app/lib/app_list_stats_for_filters.util.ts:12`.
      The renamed local variable (if any) MAY keep the local name
      `TASK_VIEWS` but it must be assigned to `TASK_VIEW_ORDER` —
      not redeclared as an array literal.
- [x] **T A.8** Create `src/core/domain/models/knowledges/preview/` and
      move from `src/shell/app/lib/app_entry_preview.util.ts`:
      `OG_IMAGE_RE` + `OG_IMAGE_REVERSE_RE` → `og_image.regex.const.ts`,
      `YOUTUBE_ID_RE` → `youtube_id.regex.const.ts`,
      `previewImageFromHtml` + `youtubePreviewImage` →
      `preview_image.parser.ts`.
      **Leave** `OG_FETCH_TIMEOUT_MS` in `app_entry_preview.util.ts` —
      it's a wrapper-config constant.
- [x] **T A.9** Create `src/core/helpers/list_opts/`. Add:
      `default_page_size.const.ts` exporting `DEFAULT_LIST_PAGE_SIZE = 50`,
      `find_all_opts.types.ts` exporting `type FindAllOpts`,
      `stable_cache_key.util.ts` (stableListCacheKey),
      `to_find_all_opts.util.ts` (toFindAllOpts),
      `index.ts` barrel.
- [x] **T A.10** Update `src/shell/app/db/entry.repository.ts` to import
      `FindAllOpts` from `@core/helpers/list_opts` instead of defining
      it locally. Remove the local definition.
- [x] **T A.11** Delete `src/shell/app/lib/app_tag_suggest.util.ts`,
      `app_tag_rank.util.ts`, `task_views.util.ts`,
      `app_list_opts.util.ts`, and rewrite
      `app_entry_preview.util.ts` so it only re-exports
      `OG_FETCH_TIMEOUT_MS` (or fold that constant into
      `app_preview_fetch.util.ts` and delete the file).
- [x] **T A.12** Move `sortedTags` from
      `src/shell/renderer/components/list/filter_dropdown.component.tsx`
      to `src/core/domain/models/knowledges/tags/sorted_tags.util.ts`.
- [x] **T A.13** Move `showTaskSection` from the same component file to
      `src/core/domain/models/knowledges/task_views/show_task_section.util.ts`.
- [x] **T A.14** Delete the local `ENTRY_TYPES` const and
      `EntryTypeOption` type from `filter_dropdown.component.tsx`.
      Replace every `EntryTypeOption` usage in the codebase with
      `EntryType` imported from `@core/domain/types/entry.types`.
      The component file now imports `EntryType` and uses the
      `ENTRY_TYPE_VALUES` array (already in core) instead of its
      private `ENTRY_TYPES`.
- [x] **T A.15** Update barrels: ensure
      `src/core/domain/models/knowledges/index.ts` re-exports the new
      `tags`, `task_views`, `preview` submodules; ensure
      `src/core/helpers/index.ts` re-exports `list_opts/*`.

**Per-task acceptance**: each task's diff is small enough to compile
on its own (no broken intermediate states); `bun test` MAY temporarily
fail between tasks but MUST pass at the end of the track.

**Track A close**:

```sh
bun run typecheck
bun run lint
bun test src/core src/shell/app src/shell/renderer/components/list
rg "STOP_WORDS|extractKeywords|computeCooccurrence|rankSuggestedTags" src/shell/
rg "filterKnowledgeByTaskView|countTasksByView|isOverdue|isActionablePlaceholder" src/shell/app/lib/
rg "EntryTypeOption" src/ --glob '!*.spec.*'
rg "TASK_VIEWS|TASK_VIEW_ORDER" src/ --glob '!*.spec.*'
```

**Track A acceptance**:

- First two `rg` commands return zero matches (`!` exit code is fine —
  `rg` exits non-zero on zero matches; tasks.md MAY use `rg -q` if the
  implementer prefers explicit exit checks).
- `EntryTypeOption` returns zero matches.
- `TASK_VIEW_ORDER` returns exactly one definition line plus N usages.

**Track A commit**:

```sh
git add src/core src/shell/app src/shell/renderer/components/list/filter_dropdown.component.tsx
# plus any caller updates
git commit -m "refactor(core): Move pure domain logic out of shell/app"
```

- **Verification:** `da8a5d7`; `rg` shell/app/lib domain symbols: 0;
  `EntryTypeOption`: 0; `bun test` list/core/app: pass.

## Track B — Centralise constants and add `fireAndForget`

Implements R4, R5, R9.

- [x] **T B.1** Add to `src/core/domain/constants/entry.const.ts`:
      ```ts
      export const ENTRY_TYPE_GLYPH: Record<EntryType, string> = {
        bookmark: '◆',
        command: '▸',
        cheat: '~',
        task: '✓'
      } as const
      ```
      Place it directly below `DEFAULT_ENTRY_ICONS`.
- [x] **T B.2** Update `src/shell/renderer/utils/shared/get_icon.util.tsx`:
      delete `typeGlyphChar`; replace `const fallback = typeGlyphChar(entry)`
      with `const fallback = ENTRY_TYPE_GLYPH[entry.type]`.
      Import `ENTRY_TYPE_GLYPH` from `@core`.
- [x] **T B.3** Update `src/shell/renderer/constants/icons.const.ts`:
      replace the two `'◆'` literals (`github`, `example`) with
      `ENTRY_TYPE_GLYPH.bookmark`. Import from `@core`.
- [x] **T B.4** Create `src/shared/utils/fire_and_forget.ts`:
      ```ts
      export function fireAndForget<T>(p: Promise<T>): void {
        p.catch(() => undefined)
      }
      ```
      Add to `src/shared/utils/index.ts`:
      `export * from './fire_and_forget'`.
- [x] **T B.5** Replace every `.catch(() => undefined)` call site
      (34 today) with `fireAndForget(<expr>)`.
      Pattern: `await? something.catch(() => undefined)` becomes
      `fireAndForget(something)` (no `await`). Use the grep list
      `rg -n "\.catch\(\(\) => undefined\)" src/ --glob '!*.spec.*'`
      as the worklist; tick off each file when migrated.
- [x] **T B.6** Replace the two inline `queueMicrotask → raf → raf`
      chains in `src/shell/renderer/components/list/list_main.component.tsx`:
      line 106 and lines 134–138 → call `scheduleDoubleRaf(...)` (still
      imported from `../../utils/list/schedule_double_raf.util` at this
      point — Track D will rename the source module later).
- [x] **T B.7** Replace the body of
      `src/shell/renderer/utils/list/record_entry_visit.util.ts` so it
      calls `fireAndForget(recordEntryVisit(id))` instead of
      `recordEntryVisit(id).catch(() => undefined)`. (The function will
      be folded into `list_frecency.util.ts` in Track D.)

**Track B close**:

```sh
bun run typecheck
bun run lint
bun test src/shell/renderer src/core src/shared
rg "'◆'" src/ --glob '!*.spec.*'
rg "\.catch\(\(\) => undefined\)" src/ --glob '!*.spec.*'
rg "queueMicrotask|requestAnimationFrame" src/shell/renderer/components/list/list_main.component.tsx
```

**Track B acceptance**:

- `rg "'◆'"` returns exactly one match (the `ENTRY_TYPE_GLYPH.bookmark`
  line in `entry.const.ts`).
- `rg "\.catch\(\(\) => undefined\)"` returns zero matches.
- `rg "queueMicrotask|requestAnimationFrame" .../list_main.component.tsx`
  returns zero matches.

**Track B commit**:

```sh
git add -A
git commit -m "refactor(consolidation): Centralise glyphs and fire-and-forget"
```

- **Verification:** `cdc7f6d`; `rg "'◆'"`: 1 (`entry.const.ts`);
  `.catch(() => undefined)`: 0; `list_main` raf: 0.

## Track C — Inline single-caller overlay hooks

Implements R7.

- [x] **T C.1** Open
      `src/shell/renderer/hooks/list/use_compact_filter_overlay.hook.ts`.
      Below the existing `useCompactFilterOverlayRows(...)` call (line ~78)
      insert:
      ```ts
      useEffect(() => {
        const t = setTimeout(() => searchInputRef.current?.focus(), 0)
        return () => clearTimeout(t)
      }, [searchInputRef])
      ```
      Add `useEffect` to the React import line if not already present.
- [x] **T C.2** Below the inlined focus effect, insert the scroll
      effect body verbatim from `_scroll.hook.ts`:
      ```ts
      const syncScroll = useCallback(() => {
        scrollCompactFilterHighlightIntoView(scrollRootRef, searchInputRef, highlightIndex, filterRowsScrollKey)
      }, [highlightIndex, filterRowsScrollKey, scrollRootRef, searchInputRef])
      useLayoutEffect(() => { syncScroll() }, [syncScroll])
      useEffect(() => {
        const root = scrollRootRef.current
        if (!root || typeof ResizeObserver === 'undefined') return
        const ro = new ResizeObserver(() => syncScroll())
        ro.observe(root)
        return () => ro.disconnect()
      }, [syncScroll, scrollRootRef])
      ```
      Import `scrollCompactFilterHighlightIntoView` from
      `../../components/list/compact_filter_overlay_keyboard.util`
      (Track E will move it later).
- [x] **T C.3** Delete imports of `useCompactFilterOverlayFocus` and
      `useCompactFilterOverlayScroll` from the main hook and remove
      the two call sites.
- [x] **T C.4** Delete files:
      `src/shell/renderer/hooks/list/use_compact_filter_overlay_focus.hook.ts`,
      `.../use_compact_filter_overlay_focus.hook.spec.tsx` (if it
      exists),
      `.../use_compact_filter_overlay_scroll.hook.ts`,
      `.../use_compact_filter_overlay_scroll.hook.spec.tsx` (if it
      exists).
      Merge any non-trivial spec assertions into
      `use_compact_filter_overlay.hook.spec.tsx` (R14).

**Track C close**:

```sh
bun run typecheck
bun run lint
bun test src/shell/renderer/hooks/list
ls src/shell/renderer/hooks/list/use_compact_filter_overlay*.hook.ts
```

**Track C acceptance**: the `ls` command lists exactly
`use_compact_filter_overlay.hook.ts` and `use_compact_filter_overlay_rows.hook.ts`
(2 files, no `_focus` or `_scroll`).

**Track C commit**:

```sh
git add -A
git commit -m "refactor(renderer): Inline single-caller overlay hooks"
```

- **Verification:** `b410ef8`; `ls use_compact_filter_overlay*.hook.ts`: 2 files;
  `bun test src/shell/renderer/hooks/list`: 57 pass.

## Track E — Move `.util.ts` out of `components/list/`

Implements R8. Runs **before** Track D (see [`design.md` Sequencing](design.md#sequencing-rationale)).

- [x] **T E.1** `git mv src/shell/renderer/components/list/filter_row_icon_basename.util.ts src/shell/renderer/utils/list/filter_row_icon_basename.util.ts`
      and its spec (if present).
- [x] **T E.2** `git mv src/shell/renderer/components/list/compact_filter_overlay_build_rows.util.ts src/shell/renderer/utils/list/compact_filter_overlay_build_rows.util.ts`
      and its spec.
- [x] **T E.3** `git mv src/shell/renderer/components/list/compact_filter_overlay_keyboard.util.ts src/shell/renderer/utils/list/compact_filter_overlay_keyboard.util.ts`
      and its spec.
- [x] **T E.4** Update every importer:
      `rg "components/list/(filter_row_icon_basename|compact_filter_overlay_build_rows|compact_filter_overlay_keyboard)" src/`
      gives the worklist. Each match changes
      `components/list/<name>.util` → `utils/list/<name>.util`.

**Track E close**:

```sh
bun run typecheck
bun run lint
bun test src/shell/renderer
find src/shell/renderer/components -name '*.util.ts' ! -name '*.spec.*'
```

**Track E acceptance**: the `find` command returns zero lines.

**Track E commit**:

```sh
git add -A
git commit -m "refactor(renderer): Move list utils out of components folder"
```

- **Verification:** `a230427`; `find components … *.util.ts`: 0 lines.

## Track D — Consolidate `utils/list/` from 17 → 7 modules

Implements R6. Largest diff in the spec. Implementer SHALL stage these
locally as seven groups (one per merged target) but commit **once** at
the end of the track (R13).

For every group below, the workflow is identical:

1. Create the new target file with the union of exports listed in
   [`design.md` Track D table](design.md#track-d----utilslist-consolidation-map).
2. Move the source bodies verbatim — no signature or name changes.
3. Merge the matching spec files into one spec next to the new util.
4. Update every importer in `src/` to point at the new module path.
5. `rm` the old files (`git rm` so renames are tracked).
6. Run `bun test src/shell/renderer/utils/list` after each group.

### Group D.1 — `virtual_list.util.ts`

- [x] **T D.1** Merge `virtual_list_window.util.ts`,
      `list_viewport_page_size.util.ts`,
      `read_list_scroll_metrics.util.ts` into
      `src/shell/renderer/utils/list/virtual_list.util.ts`.
      Exports: `virtualListWindow`, `VirtualListWindow`,
      `listViewportPageSize`, `effectiveListPageSize`,
      `readListScrollMetrics`, `ListScrollMetrics`.

### Group D.2 — `list_keyboard.util.ts`

- [x] **T D.2** Merge `list_page_tab_ring.util.ts`,
      `list_search_typeahead.util.ts`, `list_surface_focus.util.ts`
      into `src/shell/renderer/utils/list/list_keyboard.util.ts`.

### Group D.3 — `list_scroll.util.ts`

- [x] **T D.3** Merge `schedule_double_raf.util.ts` and
      `ensure_option_row_visible_in_scroll_root.util.ts` into
      `src/shell/renderer/utils/list/list_scroll.util.ts`.

### Group D.4 — `list_filters.util.ts`

- [x] **T D.4** Merge `list_filter_summary.util.ts`,
      `list_opts_from_filters.util.ts`,
      `list_entries_query.util.ts` into
      `src/shell/renderer/utils/list/list_filters.util.ts`.

### Group D.5 — `list_frecency.util.ts`

- [x] **T D.5** Merge `frecency_tier.util.ts` and
      `record_entry_visit.util.ts` into
      `src/shell/renderer/utils/list/list_frecency.util.ts`.

### Group D.6 — `list_formatters.util.ts`

- [x] **T D.6** Merge `clipboard_copy_toast.util.ts` and
      `list_footer_status.util.ts` into
      `src/shell/renderer/utils/list/list_formatters.util.ts`.

### Group D.7 — `list_page_state.util.ts`

- [x] **T D.7** Merge `list_page_empty_flags.util.ts` and
      `view_reducer.util.ts` into
      `src/shell/renderer/utils/list/list_page_state.util.ts`.
      **Inside this merge, also implement Track F (R10):** replace
      `type ListData = ReturnType<typeof useListPageData>` with
      ```ts
      export type ListEmptyFlagsInput = {
        rows: ReadonlyArray<unknown>
        dbStats: { total: number } | null
        loading: boolean
        debouncedSearch: string
      }
      ```
      and remove the `useListPageData` import.

**Track D close**:

```sh
bun run typecheck
bun run lint
bun test src/shell/renderer
find src/shell/renderer/utils/list -type f -name '*.util.ts' ! -name '*.spec.*' | wc -l
```

**Track D acceptance**: `wc -l` returns `7`. Every old file path
returns 0 matches from
`ls src/shell/renderer/utils/list/<old_name>.util.ts`.

**Track D commit**:

```sh
git add -A
git commit -m "refactor(renderer): Consolidate utils/list from 17 to 7 modules"
```

- **Verification:** `550dd95`; `find utils/list … *.util.ts | wc -l`: 10
  (7 consolidated + 3 overlay); `bun test src/shell/renderer`: 273 pass.

## Track F — Final cleanup (closure)

Track F's behavioural fix was bundled into Group D.7. This phase
is for closing verification, metric capture, and the app quality gate.

- [x] **T F.1** Recapture all metrics from
      [`report.md` §Baseline metrics](report.md#baseline-metrics) into
      `tmp/final-metrics.txt`. Each row's "before" → "after"
      transition matches
      [`report.md` §Closure metrics](report.md#closure-metrics).
- [x] **T F.2** Run the full app quality gate:
      ```sh
      bun test
      bun run typecheck
      bun run lint
      bun run build
      bash .agents/skills/app-quality-gate/scripts/gate.sh
      ```
      Record output in `tmp/final-gate.log`.
- [x] **T F.3** Run spec-compliance review with a fresh subagent (see
      `handoff.md`). Run code-quality review with a fresh subagent.
- [x] **T F.4** Confirm `git log --oneline` consolidation track commits
      (A–E implementation + spec `68dd6c0`); subjects ≤ 50 chars.
- **Verification:** A `da8a5d7`, B `cdc7f6d`, C `b410ef8`, E `a230427`,
  D `550dd95`; non-spec `src/` files 231 (was 219); `utils/list` util.ts
  count 10 (7 merged + 3 overlay); `bun test src/shell/renderer` 273 pass;
  `bun run typecheck` + `bun run lint` pass (full-suite perf spec flaky).

## Stop conditions

Stop and report instead of pushing through if any of the following
happens:

- A track's acceptance command returns an unexpected value (e.g.
  `find` returns `8` instead of `7` after Track D).
- A test suite that was green at baseline goes red and the root cause
  is not an import-path update covered by this spec.
- `bun run build` cannot run in the current environment (sandbox /
  permission limitations).
- A file move would require a Biome / knip / dependency-cruiser /
  ls-lint / jscpd / ast-grep config change to keep the gate green
  (R12).
- A pure-domain symbol turns out to have a hidden I/O dependency
  (e.g. silently reading `process.env`).

When stopping, capture in the chat / PR:

- The exact command and its output.
- Which task in `tasks.md` was in progress.
- A one-line proposal for the smallest split or deferral that would
  unblock the rest of the track.
