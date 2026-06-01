<!-- markdownlint-disable-file -->

# Compact filter overlay — design (rebuild)

Normative technical contract for rebuilding the **compact** filter UI (portal under `document.body`). Requirements: [requirements.md](requirements.md).

**Goal:** Same **layout and visual design** as today’s card (search, QUICK, TASK VIEWS, TYPES, TAGS, Close), with **one reliable scroll model**, **fixed Close footer (option B)**, and **guaranteed visibility** of the keyboard-highlighted row. Incorporates lessons from the collapsed flex scroller, `scrollIntoView` unreliability, and CEF geometry timing.

## Non-goals

- Changing RPC, `ListStats`, `buildFilterRows` ordering rules, or live `onChange` semantics.
- Replacing the non-compact anchored `FilterDropdownPanel` (unless a later task explicitly merges implementations).

## Architecture

### 1. Portal shell (`FilterDropdown` compact branch)

- Keep **`createPortal(..., document.body)`** and **`compactFilterPortalBox`** for `top`, `left`, `width`, `maxHeight`.
- The clip node (e.g. `.app-pt-filter-portal-clip`) **shall** set **`height` and `maxHeight`** to the same **`maxHeight`** value returned by `compactFilterPortalBox` so descendants have a **definite block size** on the main axis.

### 2. Card interior: CSS grid (three rows)

The dropdown root (e.g. `.app-pt-filter-dropdown`) **shall** be a **CSS grid** with **three rows** and one column (`minmax(0, 1fr)`):

| Row | Role          | CSS                                                                       |
| --- | ------------- | ------------------------------------------------------------------------- |
| 1   | Search input  | `auto` — **does not scroll** with the list; always visible at top of card |
| 2   | Option list   | `minmax(0, 1fr)` — **single** `overflow-y: auto`; **`min-height: 0`**     |
| 3   | Close control | `auto` — **fixed footer** (option B); **never** inside the scrollport     |

The portal clip **shall** pass definite **`height`** (see §1) so row 2 receives a non-zero height in CEF.

### 3. Scrollport contents (row 2 only)

Inside row 2, DOM order **top → bottom**:

1. **Sticky facet band** — one wrapper containing **Quick** + **Task views** sections. CSS: `position: sticky; top: 0; z-index` above scrolling content; opaque background + bottom edge so Types/Tags slide underneath without bleed-through.
2. **Types** section (normal flow).
3. **Tags** section (normal flow).
4. **Padding** at the bottom of the scrollport so the last row is not flush against the grid seam above the Close row.

**No second `overflow-y: auto`** anywhere inside row 2. **No** sibling split between “pinned column” and “scroll column” at the grid level — that pattern caused the collapsed scroller.

### 4. Row model and highlight

- Reuse a single **flat `filterRows`** array and stable `id` / `kind` / `isOn` rules aligned with [command-palette-filter-ux/design.md](../command-palette-filter-ux/design.md) **Flat filter row order** (or the current `buildFilterRows` implementation — they must stay consistent).
- **`highlightIndex`** indexes into the same **flat `filterRows`** list as today; DOM order of `[data-compact-filter-row]` **shall** match that list (sticky Quick+Task rows first, then Types, then Tags — all inside the scrollport).

**Index ↔ DOM:** `querySelectorAll('[data-compact-filter-row]')` document order **must** match `filterRows` order. Sticky block rows appear **first** in the scrollport; Types; Tags.

### 5. Scroll-into-view module

Extract a small pure module (e.g. `ensure_option_row_visible_in_scroll_root.util.ts`) used only by the compact overlay:

**Inputs:** `scrollRoot: HTMLElement`, `rowEl: HTMLElement`, options `{ padTop, padBottom, preferBottomFirst, maxPasses, epsilon }`.

**Algorithm:**

1. If `rowEl` is null, no-op.
2. If `rowEl` is not a descendant of `scrollRoot`, no-op (should not occur when all `[data-compact-filter-row]` nodes live under the scroll root).
3. If `rowEl.offsetHeight` (or `getBoundingClientRect().height`) ≥ padded viewport height − ε, set `scrollTop += rowRect.top - rootRect.top - padTop` once and return.
4. Otherwise loop up to `maxPasses`:
   - Read `getBoundingClientRect()` for `scrollRoot` and `rowEl`.
   - If **`preferBottomFirst`** and `rowEl.bottom > root.bottom - padBottom`, add `ceil(rowEl.bottom - (root.bottom - padBottom))` to `scrollTop`.
   - Else if `rowEl.top < root.top + padTop`, subtract `ceil((root.top + padTop) - rowEl.top)` from `scrollTop`.
   - Else break.
5. Last-mile nudge until both edges within ε or cap.

**Scheduling:** invoke from **`useLayoutEffect`** keyed on `[highlightIndex, rowIdentityKey, searchQuery]` and from **`ResizeObserver`** on `scrollRoot`.

**Forbidden:** relying on `scrollIntoView` alone for the scrollport (may scroll wrong ancestor).

### 6. CSS class strategy

- Prefer **new BEM suffixes** under existing `app-pt-filter-*` namespace for the rebuilt subtree (e.g. `.app-pt-filter-scroll-root`, `.app-pt-filter-sticky-facets`) so old rules can be deleted in one pass and **Biome/knip** stay clean.
- Keep **highlight** and **selected** class names compatible with existing list.css tokens **or** migrate both in the same change set with a single source of truth.

### 7. Files (suggested migration)

| Current / touched                         | Action                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `compact_filter_overlay.component.tsx`    | Replace implementation or add `compact_filter_overlay_v2` behind flag then swap                               |
| `compact_filter_overlay_keyboard.util.ts` | Fold scroll math into extracted util; keep key dispatch                                                       |
| `filter_dropdown.component.tsx`           | Portal `style` height; portal markup unchanged except clip children if needed                                 |
| `list.css`                                | Replace compact-portal block with grid + scroll-root + sticky + footer rules; remove obsolete flex-only hacks |
| Co-located `*.spec.tsx` / `*.spec.ts`     | Update assertions; add scroll-root / footer separation tests                                                  |

### 8. Rollout

- Optional **`compactFilterScrollLayoutV2`** (or env) to toggle new markup during development; remove flag once Electrobun manual check passes.

## Related specs

- [command-palette-filter-ux/design.md](../command-palette-filter-ux/design.md) — flat row order, Enter snapshot split.
- [command-palette-filter-ux/requirements.md](../command-palette-filter-ux/requirements.md) — R3 filter overlay.
- [foundation/design.md](../foundation/design.md) — renderer vs shell boundaries.

## Open items (none for v1)

All product choices for this rebuild are locked: **fixed Close footer (B)**, **single scrollport for options**, **sticky Quick+Task band inside scrollport**, **search in non-scrolling grid row 1**.
