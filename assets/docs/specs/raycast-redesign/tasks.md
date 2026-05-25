<!-- markdownlint-disable-file -->
# app UX/UI Redesign — Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checappox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the UI to PowerToys Run aesthetics with Raycast UX patterns — search-first, compact rows, chip filtering, no toolbar.

**Architecture:** CSS-first redesign. Same React components, new CSS classes under `.app-powertoys` root. No backend changes.

**Primary verification:** `bun test && bun run lint && bun run build` are green. `bun dev` shows the new UI.

---

## Task 0: Pre-flight read

**Files:** none

- [ ] Read `assets/docs/specs/raycast-redesign/design.md`
- [ ] Read `assets/docs/specs/raycast-redesign/requirements.md`

---

## Task 1: CSS — PowerToys styles

**Files:** Modify `src/shell/renderer/styles/list.css`

Add a new section at the end of the file with all PowerToys styles under `.app-powertoys`. These styles are additive — existing `.app-listPage` styles remain for the preview server.

Key styles:
- `.app-powertoys` — root container, full height, flex column
- `.app-pt-search` — search bar + filter chip row, `padding: 20px 20px 12px`, `gap: 10px`
- `.app-pt-search input` — dark surface, subtle border, `16px` font, `12px 14px` padding
- `.app-pt-filter-chip` — "All ▾" button, `#121721` bg, `1px solid #232936`, `8px 12px`, `13px`
- `.app-pt-results` — scrollable list, no padding
- `.app-pt-row` — `padding: 10px 20px`, `border-top: 1px solid #1a1f2a`, `display: flex`, `gap: 10px`
- `.app-pt-row--selected` — `background: rgba(94,207,190,0.06)`
- `.app-pt-row-icon` — `font-size: 16px`, `flex-shrink: 0`
- `.app-pt-row-body` — `flex: 1`, `min-width: 0`
- `.app-pt-row-title` — `color: #e2e9f5`, `13px`, `font-weight: 500`, text overflow ellipsis
- `.app-pt-row-subtitle` — `color: #8892a4`, `11px`, `margin-top: 2px`
- `.app-pt-row-hint` — `font-size: 10px`, type-specific accent color
- `.app-pt-chip` — `display: inline-block`, `background: #232936`, `border-radius: 4px`, `padding: 2px 6px`, `font-size: 11px`, `margin: 1px 2px`
- `.app-pt-chip--bookmark` — `color: #3399ff`
- `.app-pt-chip--command` — `color: #5ecfbe`
- `.app-pt-chip--cheat` — `color: #a855f7`
- `.app-pt-chip--task` — `color: #ffae57`
- `.app-pt-chip--urgent` — `color: #ff6b6b`
- `.app-pt-chip--high` — `color: #ffae57`
- `.app-pt-chip--overdue` — `color: #ff6b6b`
- `.app-pt-chip--blocked` — `color: #888`
- `.app-pt-footer` — `padding: 8px 20px`, `display: flex`, `justify-content: space-between`, `color: #555`, `font-size: 11px`
- `.app-pt-detail` — slide-in detail panel styles (reuse existing with new class)
- `.app-pt-filter-dropdown` — compact dropdown overlay below filter chip

Commit after each file or as one: `style(ux): Add PowerToys CSS styles`

---

## Task 2: EntryRow compact mode

**Files:** Modify `src/shell/renderer/components/list/entry_row.component.tsx`

Add a `compact?: boolean` prop. When `compact=true`, render using PowerToys classes:

```tsx
if (compact) {
  const primaryAction = getPrimaryAction(entry)
  return (
    <div className={`app-pt-row${selected ? ' app-pt-row--selected' : ''}`} onClick={onClick}>
      <span className="app-pt-row-icon">{getIcon(entry)}</span>
      <div className="app-pt-row-body">
        <div className="app-pt-row-title">{entry.desc || entry.key}</div>
        <div className="app-pt-row-subtitle">
          <span className={`app-pt-chip app-pt-chip--${entry.type}`}>{entry.type}</span>
          {entry.tags.map(t => <span key={t} className="app-pt-chip">{t}</span>)}
          {entry.type === 'task' && <BadgeChips entry={entry} />}
        </div>
      </div>
      {primaryAction && <span className="app-pt-row-hint">{primaryAction.hint}</span>}
    </div>
  )
}
// ... existing full-width row render ...
```

Add a helper `getPrimaryAction(entry)` that returns `{ hint: string }` based on type.

Add a helper `BadgeChips` that renders mini chips for task priority, status, overdue, blocked.

Commit: `feat(ux): Add compact EntryRow mode`

---

## Task 3: Refactor list_main layout

**Files:** Modify `src/shell/renderer/components/list/list_main.component.tsx`

Replace the current Toolbar + ListArea + FilterDropdown layout with:

```tsx
<div className="app-powertoys">
  <div className="app-pt-search">
    <input ref={searchInputRef} ... className="app-pt-search-input" />
    <button className="app-pt-filter-chip" onClick={onFilterClick}>
      {filterLabel} ▾
    </button>
  </div>
  <div className="app-pt-results" ref={listSurfaceRef}>
    {rows.map(entry => <EntryRow key={entry.id} entry={entry} compact selected={...} />)}
  </div>
  {detailOpen && <DetailPanel ... />}
  {filterOpen && <CompactFilterDropdown ... />}
  <div className="app-pt-footer">
    <span>{resultCount} results</span>
    <span>⌘K · ⌘N · ⌘,</span>
  </div>
</div>
```

Import search, filter, row state from `useListPageShell`. Remove Toolbar import.

Commit: `feat(ux): Refactor list_main to PowerToys layout`

---

## Task 4: Compact filter dropdown

**Files:** Modify `src/shell/renderer/components/list/filter_dropdown.component.tsx`

Add a `compact?: boolean` prop. When `compact=true`, render a simplified single-column dropdown:

```tsx
if (compact) {
  return (
    <div className="app-pt-filter-dropdown">
      <div className="app-pt-filter-section">Type</div>
      {['All', 'Bookmark', 'Command', 'Cheat', 'Task'].map(t => ...)}
      <div className="app-pt-filter-divider" />
      <div className="app-pt-filter-section">Task View</div>
      {['Actionable', 'Today', 'Overdue', 'This Week'].map(tv => ...)}
    </div>
  )
}
```

Commit: `feat(ux): Add compact filter dropdown mode`

---

## Task 5: Integration & polish

**Files:** Modify `use_list_page_shell.hook.ts`, `use_list_page_filters.hook.ts`

- Ensure the shell passes `compact={true}` to all relevant components
- Remove toolbar-related refs and props from the shell
- Keep window resize on detail open (existing behavior)
- Ensure CmdK palette still opens via ⌘K
- Keep sync toast, progress bar rendering

Commit: `feat(ux): Integrate PowerToys layout into shell hook`

---

## Task 6: Full test suite + quality gate

**Files:** none (verification only)

- [ ] Run: `bun test && bun run lint && bun run build`
- [ ] Expected: all green.
- [ ] Commit: `chore: UX redesign verification`
