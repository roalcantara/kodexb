<!-- markdownlint-disable-file -->
# Shell chrome unification — Design

**Spec slug:** `shell-chrome`
**Requirements:** [`requirements.md`](requirements.md)
**Prototype:** [`shell_modals_redesign_prototype.html`](../../../wireframe/prototypes/shell_modals_redesign_prototype.html) tab A — **user preferred** (2026-05-31).

---

## Overview

Proposal **A — Raycast pure** removes `ListQuickActions` from the list layout and unifies overlay styling. The main window keeps: drag stripe → search + filter chip → results → contextual footer. Library actions (sync, new task, settings) are reachable via ⌘K (Actions), global shortcuts, empty-state copy, or palette actions already registered in `build_entry_action_panel.util.ts`.

This closes the gap between [`raycast-redesign`](../raycast-redesign/design.md) (“toolbar removed”) and the current `list_quick_actions.component.tsx` row.

---

## Decision log

### D-SC-001 — Remove `ListQuickActions`; do not replace with search-row icons

**Decision:** Delete the quick-actions row entirely (Proposal A). Do not add Proposal B icon strip.

**Rationale:** User chose A; footer shows selected row primary action + Actions ⌘K (Raycast pattern); no static ⌘K / ⌘N / ⌘, inventory.

### D-SC-002 — Shared overlay shell token

**Decision:** Introduce `OVERLAY_SHELL_WIDTH_PX = 560` in `overlay_shell_layout.const.ts` (rename/consolidate from `sync_modal_layout.const.ts`).

**CSS contract:**

```css
.cmp-overlay-shell {
  box-sizing: border-box;
  width: min(var(--overlay-shell-width, 560px), 100%);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-overlay-border);
  background: var(--color-surface-container);
  box-shadow: var(--shadow-shell);
  overflow: hidden;
}

.cmp-overlay-backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-scrim-strong);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 16px 16px;
}
```

**Applies to:** `.cmp-command-palette`, `.cmp-sync-modal`, `.cmp-task-sheet` inner panel.

**Sync modal:** Keep existing `--sync-modal-width` inline style until consolidated; both MUST resolve to `560px`.

### D-SC-003 — Command palette width alignment

**Decision:** Change palette from fixed `480px` to overlay shell width (`560px`).

**Rationale:** Palette currently feels smaller and “detached” from sync modal (user screenshot feedback).

### D-SC-004 — Focus ring chain

**Decision:** Tab chain = filter button → search input → list surface → (detail | filter sheet focusables).

Remove `syncButtonRef`, `settingsButtonRef`, `newTaskButtonRef` from:

- `use_list_page_shell.hook.ts`
- `use_list_page_focus_ring.hook.ts`
- `list_keyboard.util.ts`
- `list.page.tsx` props

### D-SC-005 — E2e sync via palette

**Decision:** `RunSync` performable opens ⌘K, selects “Sync sources”, waits for modal.

**Fallback:** If palette search fails in CI, use `page.keyboard.press('Meta+k')` then `Enter` on first Library match — implement in `sync.task.ts` only.

### D-SC-006 — Raycast contextual footer

**Decision:** Replace `ListFooter` `DEFAULT_SHORTCUTS` (`⌘P · ⌘K · ⌘N · ⌘,`) with:

```
[footerStatus]                    [Primary label ↵] | [Actions ⌘K]
```

**Data path:** Same as Enter handler — `resolveCurrentEntry({ viewState, selectedId, detailEntry, rows, detailPanelHasFocus })` → `buildEntryActionPanel(ctx, deps)` → `primaryAction(panel)`.

**Primary labels by type** (from `build_entry_action_panel.util.ts`):

| Entry type | Primary label     |
| ---------- | ----------------- |
| command    | Paste in Terminal |
| bookmark   | Open URL          |
| cheat      | Copy              |
| task       | Edit task         |
| shortcut   | Open in Editor    |

**No selection / empty list:** Omit primary segment; show `Actions ⌘K` only.

**Interaction:** Primary region is a `<button>` calling `executePanelAction`; Actions region opens palette (reuse existing ⌘K handler or `onOpenPalette` prop).

**CSS:** New BEM block `.cmp-footer-actions-raycast` with `.cmp-footer-primary`, `.cmp-footer-primary-hint`, `.cmp-footer-actions-label` (mirror prototype).

**Remove:** `FooterShortcutGroup`, `DEFAULT_SHORTCUTS` for list view.

### D-SC-007 — List window min-width (Raycast-like)

**Decision:** Main list shell uses `min-width: 740px` (token `--app-list-min-width`). Overlay modals remain `560px`.

**Rationale:** Raycast’s command surface is materially wider than kb’s current list column; URLs and tag rows need horizontal room.

**Electrobun:** Initial window width ≥ 780px when implementing.

### D-SC-008 — Drop entry-type hashtags on list rows

**Decision:** `entryTagItems` emits **user tags only** — remove synthetic `#command`, `#bookmark`, etc.

**Rationale:** Type reads from glyph, semantic meta line, and task badges; type hashtags duplicate information.

**Filter sheet:** Type facets in compact filter overlay unchanged.

### D-SC-009 — Tag chroma by library frequency

**Decision:** User hashtags (not entry-type facets) scale cheat-accent saturation by global tag count from the same source as filter facets (`sortedTags` / list stats).

**Tier thresholds** (count = entries carrying that tag in the current library scope):

| Tier     | Count   | Class                    | Color contract                              |
| -------- | ------- | ------------------------ | ------------------------------------------- |
| rare     | 1–24    | `cmp-tag--freq-rare`     | `color-mix(cheat 32%, muted)`               |
| modest   | 25–99   | `cmp-tag--freq-modest`   | `color-mix(cheat 52%, muted)`               |
| common   | 100–499 | `cmp-tag--freq-common`   | `color-mix(cheat 72%, text)`                |
| dominant | 500+    | `cmp-tag--freq-dominant` | full `--color-tag-type-accent` / cheat band |

**Unchanged:** Entry type is **not** shown as a list hashtag (D-SC-008). Type facets in filter sheet unchanged.

**Renderer:** Extend `entryTagItems(entry, tagCountByName: ReadonlyMap<string, number>)` or pass counts from list page stats already loaded for filters.

**A11y:** `title="{count} entries"` on user tags (optional); do not rely on color alone — count still visible in filter sheet.

**Prototype:** [`shell_modals_redesign_prototype.html`](../../../wireframe/prototypes/shell_modals_redesign_prototype.html) tab A demonstrates four tiers.

---

## Component changes

| File                                    | Change                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `list_main.component.tsx`               | Remove `<ListQuickActions />` block                                       |
| `list_quick_actions.component.tsx`      | **Delete** + spec                                                         |
| `list_quick_actions.component.spec.tsx` | **Delete**                                                                |
| `use_list_page_shell.hook.ts`           | Remove three button refs from return                                      |
| `use_list_page_focus_ring.hook.ts`      | Drop sync/settings refs from chain                                        |
| `list_keyboard.util.ts`                 | Update `listPageFocusRingElements` signature                              |
| `list_footer.component.tsx`             | Contextual primary + Actions ⌘K; drop static shortcuts                    |
| `list_footer.component.spec.tsx`        | Primary label for selected command; no ⌘N/⌘, chips                        |
| `styles/components/list_footer.css`     | Raycast footer layout (or extend existing footer partial)                 |
| `entry_row_display.util.ts`             | Drop type facet; `tagFrequencyClass` + counts in `entryTagItems`          |
| `entry_row_display.util.spec.ts`        | Tier boundaries; no `#type` in tag items                                  |
| `styles/components/entry_row.css`       | `.cmp-tag--freq-*` modifiers                                              |
| `styles/components/app_shell.css`       | `--app-list-min-width: 740px` on list shell                               |
| `list_results_body.component.tsx`       | Restyle empty-state sync CTA (link-style, not toolbar button)             |
| `command_palette.component.tsx`         | Wrap panel with `cmp-overlay-shell`; shared backdrop class                |
| `sync_modal.component.tsx`              | Add `cmp-overlay-shell` class alongside existing structure                |
| `task_sheet` component                  | Apply `cmp-overlay-shell`                                                 |
| `styles/components/overlay_shell.css`   | **New** shared partial                                                    |
| `styles/components/command_palette.css` | Remove duplicate width/radius; extend shell                               |
| `styles/components/sync.css`            | Delegate shell dimensions to overlay partial where duplicated             |
| `styles/components/task_sheet.css`      | Same                                                                      |
| `sync_modal_layout.const.ts`            | Rename → `overlay_shell_layout.const.ts` + re-export alias for one commit |

**Keep:** `toolbar.component.tsx` for legacy/tests only — not mounted on list page. Optional follow-up: delete if knip-clean.

---

## Visual specification (Proposal A)

### Main list

```
┌─ cmp-app-shell (min 740px, radius xl) ─────────────────────────────┐
│ ░ drag stripe                                                       │
│ ⌕  Search your knowledge base…                         [All ▾]     │
├─────────────────────────────────────────────────────────────────────┤
│  rows: icon + semantic meta + title + user #tags (freq chroma)      │
├─────────────────────────────────────────────────────────────────────┤
│ 4,029 total · Showing 50          Paste in Terminal ↵ │ Actions ⌘K │
└─────────────────────────────────────────────────────────────────────┘
```

No row between search and results.

### Command palette (overlay)

- Same width and corner radius as app shell.
- Search input flush top, section headers uppercase muted (existing pattern).
- Selected row: `color-mix(primary 18%, transparent)` — match sync error row accent language.

### Sync modal

- Already 560px fixed; add shell class for border/shadow parity.
- No layout behaviour change from SY-7.

---

## Testing

| Layer     | File                                 | Cases                               |
| --------- | ------------------------------------ | ----------------------------------- |
| Unit      | `overlay_shell_layout.const.spec.ts` | Width constant + CSS file contract  |
| Component | `list_footer.component.spec.tsx`     | Raycast footer primary + Actions ⌘K |
| Component | `list_main.component.spec.tsx`       | No quick-actions toolbar            |
| Component | `command_palette.component.spec.tsx` | Shell class present                 |
| Unit      | `list_keyboard.util.spec.ts`         | Focus chain without sync/settings   |
| E2e       | `shell_chrome.feature`               | No sync button; sync via palette    |
| E2e       | Update `RunSync` in `sync.task.ts`   | Palette path                        |

---

## Files to touch (ordered)

1. `overlay_shell_layout.const.ts` + CSS partial
2. Remove quick actions + focus refs
3. Raycast footer (`ListFooter` + CSS)
4. Apply shell classes to palette / task sheet / sync
5. Empty state CTA
6. E2e + step catalog
7. Gate

---

## Prototype gate

User selected Proposal **A**. Implementation MUST NOT start until explicit approval:

`PROTOTYPE APPROVED: implement shell-chrome`
