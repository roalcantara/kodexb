<!-- markdownlint-disable-file -->
# app UX/UI Redesign — Requirements

## INTRODUCTION

Redesign app's user interface to match the PowerToys Run aesthetic while adopting
Raycast's keyboard-driven interaction patterns. The backend (RPC, DB, App) is
unchanged — this is a CSS + React markup redesign.

**UX = Raycast**: search-first, keyboard-driven, ⌘K actions, transient window.
**UI = PowerToys**: minimal, flat, dark, compact, utilitarian.

---

## REQUIREMENT SYNTAX (EARS)

### REQ-UX-1: Search-first interface

1. WHEN the app opens, THEN the search input SHALL be focused and centered
   at the top of the window, replacing the current toolbar layout.

2. THE search bar SHALL be the primary interaction point — typing filters
   results in real time. No separate toolbar with multiple buttons.

3. A filter chip ("All ▾") SHALL appear to the right of the search bar.
   Clicking it SHALL open a compact type/task-view dropdown.

### REQ-UX-2: Compact result rows

1. EACH result row SHALL display in a compact two-line layout:
   - Line 1: type glyph + title/description + action hint on right
   - Line 2: type label chip + tag chips (mini) + badge chips (mini)

2. THE selected row SHALL show a subtle background tint
   (`rgba(94, 207, 190, 0.06)`) and an action hint on the right.

3. CHIPS for tags and badges SHALL be mini-sized (`11px`, `4px` radius,
   `#232936` background).

### REQ-UX-3: Footer bar

1. A footer bar SHALL appear at the bottom of the results area showing
   the result count and keyboard shortcut hints (`⌘K · ⌘N · ⌘,`).

### REQ-UX-4: Keyboard-driven navigation

1. `ArrowDown` / `ArrowUp` SHALL navigate between result rows.

2. `Enter` SHALL execute the primary action for the selected entry type
   (Bookmark → Open URL, Command → Copy, Task → Edit, Cheat → Copy).

3. `⌘K` SHALL open the action palette.

4. `⌘N` SHALL open the task creation sheet.

5. `⌘,` SHALL open the settings panel.

6. `Escape` SHALL close the detail panel or CmdK palette, then hide the
   window if no panels are open.

### REQ-UX-5: Resizable window

1. THE window SHALL be resizable by the user. The default size is 680×420,
   centered on screen.

2. WHEN the detail panel opens, the window SHALL expand to 1050px width
   (same behavior as current).

3. THE user MAY resize the window to any dimensions above the minimum.

### REQ-UX-6: PowerToys visual style

1. THE UI SHALL use flat, dark surfaces with subtle borders. No gradients,
   drop shadows, or excessive rounded corners.

2. THE color palette SHALL match the existing Andromeda Void design system
   (`#0b0e14` bg, `#121721` surface, `#1a1f2a` borders).

3. EXISTING components (detail panel, settings page, task sheet, toast,
   progress bar, CmdK palette) SHALL be restyled to match the PowerToys
   aesthetic but retain their functionality.

---

## SUCCESS CRITERIA

- `bun test` passes with 0 failures, 0 skipped
- `bun run lint` exit 0, zero warnings
- `bun run build` succeeds
- `bun dev` shows the new PowerToys-style UI
- Preview server continues to work with existing styles
