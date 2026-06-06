<!-- markdownlint-disable-file -->
<!-- Shipped: catalog key @shell_chrome. Normative behaviour: Gherkin + unit specs. -->
# Shell chrome unification — Requirements

**Spec slug:** `shell-chrome`
**Proposal:** A — Raycast pure (keyboard-first, no main-screen action row)
**Prototype:** [`assets/wireframe/prototypes/shell_modals_redesign_prototype.html`](../../../wireframe/prototypes/shell_modals_redesign_prototype.html) (tab **Proposal A**)
**Related:** [`raycast-redesign`](../raycast-redesign/design.md), [`design-polishing`](../design-polishing/design.md), [`sync`](../sync/design.md) (SY-7 modal UX)

---

## Goal

Remove the Sync / New Task / Settings button row from the list screen, show a Raycast-style contextual footer (selected entry primary action + Actions ⌘K), and unify all overlay surfaces (command palette, sync modal, task sheet) on the same 560px shell card as the main app window.

---

## REQUIREMENT SC-1: Main list has no library action row

**User story:** As a user, I want the list view to show only search, results, and footer so the layout matches the Raycast-first shell.

**Acceptance criteria:**

1. WHEN the list view is shown (not full detail) THEN the DOM SHALL NOT contain `.cmp-toolbar--quick-actions` or equivalent Sync / New Task / Settings button row between search and results.
2. WHEN the user presses `⌘K` THEN the command palette SHALL open with Library actions including Sync sources, New task, and Settings.
3. WHEN the user presses `⌘N` THEN a new task sheet SHALL open (unchanged behaviour).
4. WHEN the user presses `⌘,` THEN settings SHALL open (unchanged behaviour).
5. WHEN the list footer is visible on the default list view AND a list row is selected THEN the footer right side SHALL show `{primaryAction.label}` and a Return hint (`↵`), then a vertical separator, then `Actions` with `⌘K` — matching Raycast (see prototype Proposal A).
6. WHEN the list footer is visible on the default list view THEN it SHALL NOT display static shortcut chips for `⌘K`, `⌘N`, or `⌘,` as a shortcut inventory.
7. WHEN no entry is resolved for the current list context (empty results) THEN the footer SHALL show entry count on the left and `Actions ⌘K` on the right without a primary action label.
8. **Measure:** Component spec — `list_footer.component.spec.tsx` asserts primary label for selected command row; `list_main.component.spec.tsx` asserts no quick-actions toolbar; e2e `@spec:shell-chrome` scenario opens sync via palette.

---

## REQUIREMENT SC-2: Tab focus order excludes removed buttons

**User story:** As a keyboard user, I want Tab to move filter → search → list without stopping on removed toolbar buttons.

**Acceptance criteria:**

1. WHEN the user tabs through the list page THEN focus order SHALL be: filter chip → search input → list surface (then detail/filter focusables when open).
2. WHEN `listPageFocusRingElements` runs THEN it SHALL NOT include sync or settings button refs.
3. **Measure:** `list_keyboard.util.spec.ts` updated; `use_list_page_focus_ring.hook.spec.tsx` updated.

---

## REQUIREMENT SC-3: Unified overlay shell (560px card)

**User story:** As a user, I want command palette, sync modal, and task sheet to look like the same family as the main app shell.

**Acceptance criteria:**

1. WHEN any of command palette, sync modal, or task sheet is open THEN the inner panel SHALL use width `min(560px, 100%)` via shared CSS variable `--overlay-shell-width` (alias allowed for sync’s existing `--sync-modal-width` during migration).
2. WHEN any overlay panel is open THEN border radius SHALL match `.cmp-app-shell` (`var(--radius-xl)` / 12px).
3. WHEN any overlay panel is open THEN border and shadow SHALL use theme tokens (`var(--color-overlay-border)`, `var(--shadow-shell)` or documented equivalents in `theme.css`).
4. WHEN sync modal accordion expands with long error text THEN panel width SHALL NOT change (inherits SY-7 fixed-width behaviour).
5. **Measure:** CSS contract test or component spec; visual smoke in gate checklist.

---

## REQUIREMENT SC-4: Backdrop and z-index stack

**User story:** As a user, I want overlays to dim the list consistently without visual clashes.

**Acceptance criteria:**

1. WHEN command palette opens THEN backdrop SHALL use `var(--color-scrim-strong)` (same family as sync modal backdrop).
2. WHEN multiple overlays are not stacked THEN z-index order SHALL remain: sync modal ≥ command palette ≥ task sheet (documented in design.md; no regression from current behaviour).
3. **Measure:** `command_palette.component.spec.tsx`, `sync_modal` specs unchanged pass count.

---

## REQUIREMENT SC-5: Empty list sync entry point

**User story:** As a user with an empty library, I still need a way to run sync without the toolbar row.

**Acceptance criteria:**

1. WHEN the list is empty THEN the empty state SHALL offer sync via text action or explicit “Sync sources (⌘K → Sync)” copy — not a bordered toolbar-style button row.
2. WHEN the user activates empty-state sync THEN `onSync` SHALL run (same RPC path as today).
3. **Measure:** `list_results_body.component.spec.tsx` updated.

---

## REQUIREMENT SC-6: E2e sync trigger without toolbar button

**User story:** As CI, sync scenarios must not depend on a removed Sync toolbar button.

**Acceptance criteria:**

1. WHEN e2e runs `When I run sync` THEN it SHALL trigger sync via command palette (“Sync sources”) or documented keyboard path — not `getByRole('button', { name: /Sync/ })` on the main list.
2. WHEN `@spec:shell-chrome` scenarios run THEN list view SHALL NOT expose a Sync toolbar button.
3. **Measure:** `settings_and_sync.feature` / `sync_resilience.feature` green; step catalog updated.

---

## REQUIREMENT SC-7: Raycast-style contextual footer

**User story:** As a user, I want the footer to show what Enter will do on the selected row (like Raycast), not a static list of global shortcuts.

**Acceptance criteria:**

1. WHEN the list view has a selected row THEN `ListFooter` SHALL resolve the same entry as `useEntryActionKeys` via `resolveCurrentEntry` + `buildEntryActionPanel` + `primaryAction`.
2. WHEN a primary action exists THEN the footer SHALL render its `label` and a Return glyph (`↵`); pressing Enter SHALL still run that action (unchanged keyboard handler).
3. WHEN the user clicks the footer primary action region THEN `executePanelAction` SHALL run for that primary action (mouse parity).
4. WHEN the footer renders the actions affordance THEN it SHALL read `Actions` with `⌘K` chips only — not `⌘N` or `⌘,`.
5. WHEN full detail is open THEN the footer MAY keep the Escape back control; it SHALL still use contextual primary + `Actions ⌘K` instead of the old `DEFAULT_SHORTCUTS` row.
6. **Measure:** `list_footer.component.spec.tsx`; optional snapshot of `.cmp-footer-actions-raycast` structure.

---

## REQUIREMENT SC-8: Tag chroma by frequency

**User story:** As a user scanning the list, I want hashtag color to reflect how common a tag is in my library so frequent tags stand out and rare ones stay subtle.

**Acceptance criteria:**

1. WHEN a list row renders user hashtags THEN each tag SHALL use a frequency tier class derived from the global tag count (same counts as filter facets).
2. WHEN a tag count is 1–24, 25–99, 100–499, or 500+ THEN the tag SHALL map to `cmp-tag--freq-rare`, `modest`, `common`, or `dominant` respectively (see design D-SC-009).
3. WHEN a list row renders tags THEN it SHALL NOT include synthetic entry-type hashtags (`#command`, `#bookmark`, etc.) — see SC-9.
4. **Measure:** `entry_row_display.util.spec.ts` tier boundaries; component spec spot-check on list row markup.

---

## REQUIREMENT SC-9: No entry-type hashtags on list rows

**User story:** As a user, I want list rows to show only meaningful user tags, not redundant type labels.

**Acceptance criteria:**

1. WHEN `entryTagItems` builds tag chips for a list row THEN it SHALL NOT prepend `#${entry.type}`.
2. WHEN a command row is rendered THEN type SHALL be conveyed by glyph + `semantic-command` meta styling only.
3. **Measure:** `entry_row_display.util.spec.ts` — tag items for command entry contain `#brew` but not `#command`.

---

## REQUIREMENT SC-10: List shell min-width (Raycast-like)

**User story:** As a user, I want the list window wide enough to scan URLs, commands, and tags without constant truncation.

**Acceptance criteria:**

1. WHEN the list view is shown THEN `.cmp-app-shell` (or list host) SHALL enforce `min-width: 740px` via `--app-list-min-width`.
2. WHEN overlay modals open THEN they SHALL remain `560px` (`--overlay-shell-width`) — list width and modal width are independent.
3. **Measure:** CSS contract in `app_shell.css` spec or layout const.

---

## Out of scope

- Unified hub overlay (Proposal C).
- Search-row ghost icons (Proposal B).
- Settings page layout refactor beyond overlay shell styling.
- New product features or RPC routes.
- Tailwind migration epics in `design-polishing` (CSS may use existing component partials).

---

## Traceability

| Requirement | E2e tag              | Feature file (planned)           |
| ----------- | -------------------- | -------------------------------- |
| SC-1, SC-6  | `@spec:shell-chrome` | `shell_chrome.feature`           |
| SC-7        | `@spec:shell-chrome` | `shell_chrome.feature`           |
| SC-8, SC-9  | unit                 | `entry_row_display.util.spec.ts` |
| SC-10       | CSS / layout         | `app_shell` contract             |
| SC-3        | `@spec:sync`         | existing sync modal scenarios    |
