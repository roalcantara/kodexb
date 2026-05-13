<!-- markdownlint-disable-file -->
# kb UX/UI Redesign — Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the UI to PowerToys Run aesthetics with Raycast UX patterns — search-first, compact rows, chip filtering, no toolbar.

**Architecture:** CSS-first redesign. Same React components, new CSS classes under `.kb-powertoys` root. No backend changes.

**Primary verification:** `bun test && bun run lint && bun run build` are green. `bun dev` shows the new UI.

---

## Task 0: Pre-flight read

**Files:** none

- [ ] Read `assets/docs/specs/raycast-redesign/design.md`
- [ ] Read `assets/docs/specs/raycast-redesign/requirements.md`

---

## Task 1: CSS — PowerToys styles

**Files:** Modify `src/shell/renderer/styles/list.css`

Add a new section at the end of the file with all PowerToys styles under `.kb-powertoys`. These styles are additive — existing `.kb-listPage` styles remain for the preview server.

Key styles:
- `.kb-powertoys` — root container, full height, flex column
- `.kb-pt-search` — search bar + filter chip row, `padding: 20px 20px 12px`, `gap: 10px`
- `.kb-pt-search input` — dark surface, subtle border, `16px` font, `12px 14px` padding
- `.kb-pt-filter-chip` — "All ▾" button, `#121721` bg, `1px solid #232936`, `8px 12px`, `13px`
- `.kb-pt-results` — scrollable list, no padding
- `.kb-pt-row` — `padding: 10px 20px`, `border-top: 1px solid #1a1f2a`, `display: flex`, `gap: 10px`
- `.kb-pt-row--selected` — `background: rgba(94,207,190,0.06)`
- `.kb-pt-row-icon` — `font-size: 16px`, `flex-shrink: 0`
- `.kb-pt-row-body` — `flex: 1`, `min-width: 0`
- `.kb-pt-row-title` — `color: #e2e9f5`, `13px`, `font-weight: 500`, text overflow ellipsis
- `.kb-pt-row-subtitle` — `color: #8892a4`, `11px`, `margin-top: 2px`
- `.kb-pt-row-hint` — `font-size: 10px`, type-specific accent color
- `.kb-pt-chip` — `display: inline-block`, `background: #232936`, `border-radius: 4px`, `padding: 2px 6px`, `font-size: 11px`, `margin: 1px 2px`
- `.kb-pt-chip--bookmark` — `color: #3399ff`
- `.kb-pt-chip--command` — `color: #5ecfbe`
- `.kb-pt-chip--cheat` — `color: #a855f7`
- `.kb-pt-chip--task` — `color: #ffae57`
- `.kb-pt-chip--urgent` — `color: #ff6b6b`
- `.kb-pt-chip--high` — `color: #ffae57`
- `.kb-pt-chip--overdue` — `color: #ff6b6b`
- `.kb-pt-chip--blocked` — `color: #888`
- `.kb-pt-footer` — `padding: 8px 20px`, `display: flex`, `justify-content: space-between`, `color: #555`, `font-size: 11px`
- `.kb-pt-detail` — slide-in detail panel styles (reuse existing with new class)
- `.kb-pt-filter-dropdown` — compact dropdown overlay below filter chip

Commit after each file or as one: `style(ux): Add PowerToys CSS styles`

---

## Task 2: EntryRow compact mode

**Files:** Modify `src/shell/renderer/components/list/entry_row.component.tsx`

Add a `compact?: boolean` prop. When `compact=true`, render using PowerToys classes:

```tsx
if (compact) {
  const primaryAction = getPrimaryAction(entry)
  return (
    <div className={`kb-pt-row${selected ? ' kb-pt-row--selected' : ''}`} onClick={onClick}>
      <span className="kb-pt-row-icon">{getIcon(entry)}</span>
      <div className="kb-pt-row-body">
        <div className="kb-pt-row-title">{entry.desc || entry.key}</div>
        <div className="kb-pt-row-subtitle">
          <span className={`kb-pt-chip kb-pt-chip--${entry.type}`}>{entry.type}</span>
          {entry.tags.map(t => <span key={t} className="kb-pt-chip">{t}</span>)}
          {entry.type === 'task' && <BadgeChips entry={entry} />}
        </div>
      </div>
      {primaryAction && <span className="kb-pt-row-hint">{primaryAction.hint}</span>}
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
<div className="kb-powertoys">
  <div className="kb-pt-search">
    <input ref={searchInputRef} ... className="kb-pt-search-input" />
    <button className="kb-pt-filter-chip" onClick={onFilterClick}>
      {filterLabel} ▾
    </button>
  </div>
  <div className="kb-pt-results" ref={listSurfaceRef}>
    {rows.map(entry => <EntryRow key={entry.id} entry={entry} compact selected={...} />)}
  </div>
  {detailOpen && <DetailPanel ... />}
  {filterOpen && <CompactFilterDropdown ... />}
  <div className="kb-pt-footer">
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
    <div className="kb-pt-filter-dropdown">
      <div className="kb-pt-filter-section">Type</div>
      {['All', 'Bookmark', 'Command', 'Cheat', 'Task'].map(t => ...)}
      <div className="kb-pt-filter-divider" />
      <div className="kb-pt-filter-section">Task View</div>
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
