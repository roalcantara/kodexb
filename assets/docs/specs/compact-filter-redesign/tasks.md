<!-- markdownlint-disable-file -->

# Compact filter overlay rebuild — tasks

Ordered verification. Requirements: [requirements.md](requirements.md). Design: [design.md](design.md). Step-by-step plan: [implementation-plan.md](implementation-plan.md).

## T1 — Scroll util extraction

- [x] `ensure_option_row_visible_in_scroll_root.util.ts` + co-located `.spec.ts` exist under `src/shell/renderer/utils/list/`.
- [x] Bottom-first `computeScrollTopAdjustmentForVisibility`; `ensureOptionRowVisibleInScrollRoot` matches design §5.
- [x] `compact_filter_overlay_keyboard.util.ts` delegates scroll to util; no duplicate rect math.

## T2 — DOM rebuild (single scrollport)

- [x] No sibling `.kb-pt-filter-dropdown-pinned` + `.kb-pt-filter-dropdown-scroll` split.
- [x] One `[data-compact-filter-scroll-root]` contains Quick, Task views, Types, Tags (facets in `.kb-pt-filter-sticky-facets`).
- [x] Search input is **sibling above** scroll root; Close is **sibling below** scroll root.
- [x] `filterRows` DOM order matches flat highlight index.

## T3 — CSS grid layout

- [x] `.kb-pt-filter-dropdown` uses `grid-template-rows: auto minmax(0, 1fr) auto`.
- [x] `.kb-pt-filter-scroll-root` is the only `overflow-y: auto` for options.
- [x] Sticky facets + footer + highlight styles per design; obsolete flex/pinned rules removed.

## T4 — Scroll sync

- [x] `useLayoutEffect` on `[highlightIndex, rowIdsKey]` calls `ensureOptionRowVisibleInScrollRoot`.
- [x] `ResizeObserver` on scroll root re-runs ensure when height changes.
- [x] No `scrollIntoView` as sole mechanism.

## T5 — Keyboard / focus (unchanged semantics)

- [x] ArrowUp/Down move highlight; search can keep focus while typing (R5).
- [x] Tab-from-search, ArrowUp from row 0 → search, snapshot Enter/Esc unchanged vs [command-palette-filter-ux](../command-palette-filter-ux/requirements.md) R3.

## T6 — Automated tests

- [x] Util unit tests pass.
- [x] Overlay specs: Close outside scroll root; Quick and Types inside scroll root.
- [x] `filter_dropdown` compact portal spec still passes.

## T7 — Portal geometry

- [x] `.kb-pt-filter-portal-clip` inline style sets `height` and `maxHeight` to `compactFilterPortalBox` cap.

## T8 — Manual Electrobun

- [ ] ArrowDown past **All Doing** shows full highlighted Type/Tag row (not a sliver).
- [ ] Close always visible; last row not under footer.

## T9 — Quality gate

- [ ] `bash .agents/skills/kb-quality-gate/scripts/gate.sh` green on changed tree (or agreed subset before commit).
