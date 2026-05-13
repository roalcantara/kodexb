<!-- markdownlint-disable-file -->
# kb UX/UI Redesign — Design

## OVERVIEW

Redesign kb with **Raycast UX patterns** (search-first, keyboard-driven, ⌘K actions,
transient window on hotkey) and **PowerToys Run UI aesthetics** (minimal, flat,
dark, compact two-line results). The window is resizable — users control the size.

No backend changes. This is a CSS + React markup redesign.

**UX = Raycast**: search bar always focused, type to filter, arrow keys to navigate,
Enter for primary action, ⌘K for extended actions, Escape to dismiss.

**UI = PowerToys**: dark flat surface, subtle borders, compact icon+text rows,
minimal visible chrome, no gradients, clean typography.

---

## SCOPE DECISIONS

| Decision | Choice | Rationale |
|---|---|---|
| Layout approach | CSS-first redesign | Same components, new styles. No new components, no RPC changes. |
| Search bar | Centered, prominent, takes focus on open | Raycast/PowerToys pattern — search is THE interaction |
| Filtering | Compact "Type ▾" chip next to search bar, opens inline dropdown | Raycast-style — replaces the large filter dropdown with 3 sections |
| Toolbar | Removed — actions moved to CmdK palette + shortcuts | Cleaner, keyboard-first |
| Result rows | Two-line compact: title + type/tags subtitle. Mini chip pills for badges. | PowerToys density with kb's information richness |
| Detail panel | Slides in from right, narrows list. Window resizable. | Same pattern as current, just restyled |
| Footer | Subtle bar with result count + keyboard shortcut hints | Contextual help |
| Theme | Andromeda Void (existing dark palette) — no changes | Already matches the dark aesthetic |

---

## NAVIGATION — Three-Stage Progressive Disclosure

```
  List ──Enter/→──► Split ──Enter/→──► Detail
    ▲                  ▲                  │
    │                  │                  │
    └───Escape/←───────└───Escape/←───────┘
```

| Key | Action |
|-----|--------|
| Enter / → | Advance: List → Split → Detail |
| ← / Escape | Retreat: Detail → Split → List |
| ArrowUp / ArrowDown | Navigate between entries (all views) |
| ✕ Close button | Jump from any view back to List |

**Stage 1 — List**: Full-width entry list. Search bar + filter chip at top.
No detail visible. The default state when the app opens.

**Stage 2 — Split**: List narrows to 340px on the left. Detail content slides in
on the right. Both scroll independently. Window expands to 1050px.

**Stage 3 — Detail**: Detail content fills the full window. No list visible.
Focused reading mode. ArrowUp/Down still navigates between entries.

## VISUAL DESIGN — PowerToys UI Aesthetic

- **Background**: Solid `#0b0e14` (matches existing Andromeda Void)
- **Surface**: `#121721` for input fields, dropdown panels
- **Borders**: `1px solid #1a1f2a` — subtle, flat, no shadows
- **Text**: `#e2e9f5` primary, `#8892a4` muted, `#555` footer
- **Selection**: `rgba(94, 207, 190, 0.06)` — barely visible tint
- **Chips**: `background: #232936`, `border-radius: 4px`, small `11px` text
- **Icons**: Inline text glyphs (🔗 ⌘ 📋 ☐), not separate icon components
- **Rows**: `10px 20px` padding, `1px solid #1a1f2a` dividers, no hover background
- **No gradients, no drop shadows, no rounded corners beyond `6px`**
- **Footer**: `8px 20px`, `#555` text, `11px` size

## COMPONENT CHANGES

### `list_main.component.tsx` — Refactor layout

Current: Toolbar → ListArea (with detail panel) → FilterDropdown (overlay)

New: Search bar + filter chip → Compact list → Detail overlay (conditional) → Footer

```tsx
<div className="kb-powertoys">
  <div className="kb-pt-search">
    <input ref={searchInputRef} ... />
    <FilterChip label={currentFilter} onClick={onFilterClick} />
  </div>
  <div className="kb-pt-results">
    {rows.map(entry => <EntryRow entry={entry} compact />)}
  </div>
  {detailOpen && <DetailPanel ... />}
  <div className="kb-pt-footer">
    <span>{resultCount} results</span>
    <span>⌘K · ⌘N · ⌘,</span>
  </div>
</div>
```

### `entry_row.component.tsx` — Compact mode

Current: Large row with separate glyph, title, description, tags, badges

New: Compact two-line row with inline chips

```
[🔗]  React — A JS library for building UIs  ↵ Open
      bookmark  [react] [javascript] [ui]  ⬆ high  overdue
```

Two-line layout: title/desc (line 1) + type tag chips + badge mini-chips (line 2).
Action hint (↵ Open, ⌘C Copy, ⌘E Edit) on the right of the first line.

### `list_area.component.tsx` — Remove, inline into list_main

The list area as a separate component is removed. Entry rows render directly
in `list_main` under `.kb-pt-results`.

**Initial/empty state**: When no search query is active and no filters are selected,
show the first N entries (as if searching with no filters — the default behavior).
The search bar placeholder reads "Search your knowledge base…" and shows all entries
below it. The "No entries match" state only appears when the user types a search
query that returns zero results (not on initial open).

### `toolbar.component.tsx` — Simplified or Removed

The toolbar as a standalone component is replaced by the search bar + filter chip
rendered directly in `list_main`. The sync/settings/new-task buttons become:
- Sync: CmdK action or keystroke
- Settings: ⌘, keystroke
- New Task: ⌘N keystroke or CmdK action

### `filter_dropdown.component.tsx` — Compact multi-select overlay

Instead of the current 3-section dropdown, render a compact single-column overlay
with multi-select types and single-select task views:

```
Type — select one or more
  ✓ Bookmark
  ✓ Command
    Cheat
  ✓ Task
─────────
Task View — select one
    Actionable
  ✓ Today
    Overdue
    This Week
─────────
Add tags by typing #tagname in search
```

**Behavior**:
- **Type**: multi-select — check multiple types simultaneously (Bookmark + Task = show both)
- **Task View**: single-select — picking one replaces the previous
- **Tags**: type `#react` in the search bar. Multiple tags: `#react #js` (AND logic)
- **Filter chip label**: shows "Bookmark, Task" when multi-selected, "All" when none checked

### CSS — New `.kb-powertoys` root class

All new styles live under `.kb-powertoys` — the existing `.kb-listPage` styles
remain untouched for the preview server. New CSS:

- `.kb-pt-search` — search bar + filter chip row
- `.kb-pt-results` — compact result list
- `.kb-pt-row` — two-line compact entry row
- `.kb-pt-chip` — mini pill for tags, badges, type labels
- `.kb-pt-footer` — subtle bottom bar
- `.kb-pt-detail` — slide-in detail panel overlay
