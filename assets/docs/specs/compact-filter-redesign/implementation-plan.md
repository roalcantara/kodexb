<!-- markdownlint-disable-file -->

# Compact filter overlay rebuild — implementation plan

> **For agentic workers:** Implement task-by-task in order. Use checappoxes in [tasks.md](tasks.md) for verification gates. Requirements: [requirements.md](requirements.md). Design: [design.md](design.md).

**Goal:** Rebuild the compact (⌘K) filter overlay so Types/Tags are scrollable and the keyboard-highlighted row is always fully visible, with the same visual design and unchanged filter/RPC semantics.

**Architecture:** Three-row CSS grid on the card (search | single scrollport | Close footer). One `overflow-y: auto` scroll root contains sticky Quick+Task, then Types, then Tags. Pure `ensure_option_row_visible_in_scroll_root` util + `useLayoutEffect` + `ResizeObserver` for scroll alignment. Portal clip gets definite `height`.

**Tech stack:** React 19 renderer, Bun test, Biome, existing `buildFilterRows` / keyboard util, `list.css` Andromeda tokens.

---

## File map (before coding)

| File                                                                                  | Responsibility                                                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/shell/renderer/utils/list/ensure_option_row_visible_in_scroll_root.util.ts`      | Pure scroll math (extract from keyboard util)                                   |
| `src/shell/renderer/utils/list/ensure_option_row_visible_in_scroll_root.util.spec.ts` | Unit tests for rect math                                                        |
| `src/shell/renderer/components/list/compact_filter_overlay.component.tsx`             | Markup: grid rows, single scroll root, sticky facets wrapper                    |
| `src/shell/renderer/components/list/compact_filter_overlay_keyboard.util.ts`          | Key dispatch only; call extracted util                                          |
| `src/shell/renderer/components/list/compact_filter_overlay.component.spec.tsx`        | DOM structure + keyboard/highlight tests                                        |
| `src/shell/renderer/components/list/compact_filter_overlay_keyboard.util.spec.ts`     | Thin tests if scroll math moves out                                             |
| `src/shell/renderer/components/list/filter_dropdown.component.tsx`                    | Portal `height` + `maxHeight` (verify present)                                  |
| `src/shell/renderer/styles/list.css`                                                  | Replace compact-portal flex/pinned-split rules with grid + scroll-root + sticky |

**Delete / stop using:** `.app-pt-filter-dropdown-pinned`, `.app-pt-filter-dropdown-scroll` as **sibling** scrollers; `data-compact-filter-scroll-region` → rename to `data-compact-filter-scroll-root` (one attribute, one scrollport).

---

## Task 1: Extract scroll-into-view util (TDD)

**Files:**

- Create: `src/shell/renderer/utils/list/ensure_option_row_visible_in_scroll_root.util.ts`
- Create: `src/shell/renderer/utils/list/ensure_option_row_visible_in_scroll_root.util.spec.ts`
- Modify: `src/shell/renderer/components/list/compact_filter_overlay_keyboard.util.ts`

- [ ] **Step 1: Move pure functions into new util**

Export from the new file (move from `compact_filter_overlay_keyboard.util.ts`):

- `computeScrollTopAdjustmentForVisibility(containerTop, containerBottom, elementTop, elementBottom, padTop, padBottom?)` — **bottom edge checked before top** (requirements R4).
- `ensureOptionRowVisibleInScrollRoot(scrollRoot, rowEl, options?)` with defaults: `padTop: 6`, `padBottom: 22`, `preferBottomFirst: true`, `maxPasses: 16`, `epsilon: 0.5`, tall-row top-align branch, last-mile nudge loop per [design.md](design.md) §5.

- [ ] **Step 2: Write / move unit tests**

```ts
// ensure_option_row_visible_in_scroll_root.util.spec.ts
import { expect, test } from 'bun:test'
import { computeScrollTopAdjustmentForVisibility } from './ensure_option_row_visible_in_scroll_root.util'

test('computeScrollTopAdjustmentForVisibility scrolls down when bottom clips', () => {
  expect(computeScrollTopAdjustmentForVisibility(100, 400, 320, 410, 8, 12)).toBe(22)
})

test('computeScrollTopAdjustmentForVisibility prefers bottom when both edges overflow', () => {
  expect(computeScrollTopAdjustmentForVisibility(100, 200, 80, 220, 8)).toBe(28)
})
```

Add tests for: top-only clip (negative delta), zero when fits, asymmetric `padBottom`.

- [ ] **Step 3: Run tests**

```bash
bun test src/shell/renderer/utils/list/ensure_option_row_visible_in_scroll_root.util.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Wire keyboard util**

In `scrollCompactFilterHighlightIntoView`, import `ensureOptionRowVisibleInScrollRoot` and resolve:

```ts
const scrollRoot = searchInputRef.current?.closest('[data-compact-filter-scroll-root]')
```

Re-export or delete duplicated logic from `compact_filter_overlay_keyboard.util.spec.ts` (update imports).

- [ ] **Step 5: Run related tests**

```bash
bun test src/shell/renderer/components/list/compact_filter_overlay_keyboard.util.spec.ts \
  src/shell/renderer/components/list/compact_filter_overlay.component.spec.tsx
```

---

## Task 2: Rebuild overlay DOM (single scrollport + sticky facets)

**Files:**

- Modify: `src/shell/renderer/components/list/compact_filter_overlay.component.tsx`

- [ ] **Step 1: Remove pinned/scroll split**

Delete `pinnedSectionRows` / `scrollSectionRows` split in `useCompactFilterState`. Keep one `sectionedRows` from `groupFilterRowsIntoSections(filterRows)` in **flat row order** (Quick, Task views, Types, Tags).

- [ ] **Step 2: New JSX structure**

```tsx
<div className="app-pt-filter-dropdown" ...>
  <input ref={searchInputRef} className="app-pt-filter-search" ... />
  <motion-free div
    className="app-pt-filter-scroll-root"
    data-compact-filter-scroll-root
    ref={scrollRootRef}
  >
    <motion-free div className="app-pt-filter-sticky-facets">
      <CompactFilterSectionList sectionedRows={facetSectionRows} ... />
    </motion-free>
    <CompactFilterSectionList sectionedRows={scrollableSectionRows} ... />
    {filterRows.length === 0 ? <motion-free div className="app-pt-filter-empty">...</motion-free> : null}
  </motion-free>
  <button type="button" className="app-pt-filter-option app-pt-filter-option--footer" ...>Close</button>
</motion-free>
```

Where `facetSectionRows` = sections titled `Quick` | `Task views`; `scrollableSectionRows` = `Types` | `Tags`.

All `[data-compact-filter-row]` nodes remain in **global `filterRows` index order** in the DOM (facets first, then types/tags).

- [ ] **Step 3: Scroll sync hook**

Add `scrollRootRef = useRef<HTMLDivElement>(null)`.

```tsx
const rowIdsKey = useMemo(() => filterRows.map(r => r.id).join('\0'), [filterRows])

useLayoutEffect(() => {
  const root = scrollRootRef.current
  const searchRoot = searchInputRef.current?.closest('.app-pt-filter-dropdown')
  if (!root || !searchRoot) return
  const options = Array.from(root.querySelectorAll<HTMLElement>('[data-compact-filter-row]'))
  const el = options[highlightIndex]
  if (el) ensureOptionRowVisibleInScrollRoot(root, el)
}, [highlightIndex, rowIdsKey])

useEffect(() => {
  const root = scrollRootRef.current
  if (!root || typeof ResizeObserver === 'undefined') return
  const ro = new ResizeObserver(() => {
    const options = Array.from(root.querySelectorAll<HTMLElement>('[data-compact-filter-row]'))
    const el = options[highlightIndex]
    if (el) ensureOptionRowVisibleInScrollRoot(root, el)
  })
  ro.observe(root)
  return () => ro.disconnect()
}, [highlightIndex, rowIdsKey])
```

Remove duplicate scroll effect that only used `searchInputRef` if fully replaced.

- [ ] **Step 4: Preserve keyboard behavior**

- ArrowUp/Down: highlight only; **do not** `focus()` rows (R5 — search keeps focus).
- Keep `suppressNextArrowDownFromSearch`, Tab-from-search toggle, Enter on row suppress.
- `compactFilterOptionNodes` should query within `.app-pt-filter-dropdown` (unchanged).

---

## Task 3: CSS grid + sticky + footer (list.css)

**Files:**

- Modify: `src/shell/renderer/styles/list.css` (compact portal block ~`.app-pt-filter-portal-clip`)

- [ ] **Step 1: Portal clip**

Keep `height` + `maxHeight` on clip (R7). Clip: `display: flex; flex-direction: column; overflow: hidden; min-height: 0`.

- [ ] **Step 2: Card grid (3 rows)**

```css
.app-pt-filter-portal-clip > .app-pt-filter-dropdown {
  flex: 1 1 0;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  /* drop old flex-column-only hacks for pinned/scroll siblings */
}

.app-pt-filter-portal-clip > .app-pt-filter-dropdown > .app-pt-filter-search {
  /* row 1 — not in scroll root */
}

.app-pt-filter-portal-clip > .app-pt-filter-dropdown > .app-pt-filter-scroll-root {
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scroll-padding-block: 10px 16px;
  padding-bottom: 12px;
}

.app-pt-filter-portal-clip > .app-pt-filter-dropdown > .app-pt-filter-sticky-facets {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(18, 23, 33, 0.98);
  box-shadow: 0 1px 0 var(--app-border);
}

.app-pt-filter-portal-clip > .app-pt-filter-dropdown > .app-pt-filter-option--footer {
  flex-shrink: 0; /* grid row 3 */
}
```

- [ ] **Step 3: Remove obsolete rules**

Delete selectors for `.app-pt-filter-dropdown-pinned`, `.app-pt-filter-dropdown-scroll` as flex children, duplicate grid on dropdown that fought row 2, and any `quick-sticky` experiment classes no longer in TSX.

- [ ] **Step 4: Keep highlight tokens**

Retain `.app-pt-filter-dropdown .app-pt-filter-option--highlight` (accent rail + tint) per R6.

---

## Task 4: Renderer tests (structure + highlight scroll)

**Files:**

- Modify: `src/shell/renderer/components/list/compact_filter_overlay.component.spec.tsx`
- Modify: `src/shell/renderer/components/list/filter_dropdown.component.spec.tsx` (if attribute renamed)

- [ ] **Step 1: Structure assertions**

```tsx
test('CompactFilterOverlay Close is outside scroll root', () => {
  render(<CompactFilterOverlay stats={stats} types={[]} tags={[]} onChange={noop} onClose={noop} />)
  const root = document.querySelector('[data-compact-filter-scroll-root]')
  const close = screen.getByRole('button', { name: 'Close' })
  expect(root).toBeTruthy()
  expect(root?.contains(close)).toBe(false)
})

test('CompactFilterOverlay Types section lives inside scroll root', () => {
  render(<CompactFilterOverlay stats={stats} types={[]} tags={[]} onChange={noop} onClose={noop} />)
  const root = document.querySelector('[data-compact-filter-scroll-root]')
  expect(root?.contains(screen.getByText('Types'))).toBe(true)
})

test('CompactFilterOverlay Quick section lives inside scroll root (sticky band)', () => {
  render(<CompactFilterOverlay stats={stats} types={[]} tags={[]} onChange={noop} onClose={noop} />)
  const root = document.querySelector('[data-compact-filter-scroll-root]')
  expect(root?.contains(screen.getByText('Quick'))).toBe(true)
})
```

Remove tests that asserted **Quick outside** scroll region (old pinned split).

- [ ] **Step 2: ArrowDown into Types increases scrollTop (jsdom)**

Mount with stats that include Types rows; set scroll root `style.height = '120px'` and `overflow = 'auto'`; fill with enough rows; simulate ArrowDown from last task row to first type row; assert `scrollRoot.scrollTop > 0` OR highlighted element `getBoundingClientRect().bottom <= root.bottom - pad`.

Use `userEvent` + `fireEvent` as in existing specs; skip if jsdom cannot layout — document manual gate in T6.

- [ ] **Step 3: Run tests**

```bash
bun test src/shell/renderer/components/list/compact_filter_overlay.component.spec.tsx \
  src/shell/renderer/components/list/filter_dropdown.component.spec.tsx
```

---

## Task 5: Portal shell verification

**Files:**

- Verify: `src/shell/renderer/components/list/filter_dropdown.component.tsx`

- [ ] Confirm compact portal clip style includes **`height: maxHeight`** and **`maxHeight`** (R7).

```tsx
<div className="app-pt-filter-portal-clip" style={{ top, left, width, height: maxHeight, maxHeight }}>
```

---

## Task 6: Manual Electrobun DoD

- [ ] `mise run dev` (or project dev command); open list; **⌘K** compact filter.
- [ ] ArrowDown from **All Doing** → first **Bookmark** (or first Type): row fully visible with highlight rail.
- [ ] Continue ArrowDown through Types and Tags: each highlight stays in view.
- [ ] Type in search while moving highlight: focus stays in search; list filters live.
- [ ] Scroll with trackpad: sticky Quick+Task band pins at top of scrollport; Types scroll under.
- [ ] **Close** always visible at bottom; last tag row not hidden under footer.
- [ ] Tab from search still toggles highlighted row (if retained).

---

## Task 7: Quality gate

```bash
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

Or minimum:

```bash
bun test src/shell/renderer/components/list/compact_filter_overlay.component.spec.tsx \
  src/shell/renderer/utils/list/ensure_option_row_visible_in_scroll_root.util.spec.ts \
  src/shell/renderer/components/list/compact_filter_overlay_keyboard.util.spec.ts
bunx biome check src/shell/renderer/components/list/compact_filter_overlay.component.tsx \
  src/shell/renderer/utils/list/ensure_option_row_visible_in_scroll_root.util.ts \
  src/shell/renderer/styles/list.css
```

- [ ] All tests pass; no new knip unused exports; dependency-cruiser unchanged for renderer→shell rules.

---

## Spec coverage self-review

| Requirement           | Task                            |
| --------------------- | ------------------------------- |
| R1 single scrollport  | Task 2, 3                       |
| R2 sticky facets      | Task 2, 3                       |
| R3 fixed footer       | Task 2, 3, 4                    |
| R4 highlight visible  | Task 1, 2                       |
| R5 search typing      | Task 2 (no row focus on arrows) |
| R6 visual distinction | Task 3 (keep highlight CSS)     |
| R7 portal height      | Task 5                          |
| R8 testing            | Task 1, 4, 6, 7                 |

No placeholders; no RPC/`buildFilterRows` changes in scope.
