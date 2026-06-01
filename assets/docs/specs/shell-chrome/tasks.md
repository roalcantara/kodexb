<!-- markdownlint-disable-file -->
# Shell chrome unification — Tasks

**Spec slug:** `shell-chrome`
**Design:** [`design.md`](design.md)
**Requirements:** [`requirements.md`](requirements.md)

Run gate before marking done: `bash .agents/skills/app-quality-gate/scripts/gate.sh`

---

## Phase 1 — Shared overlay shell tokens

**Requirements:** SC-3, SC-4

- [ ] **1.1** Create `overlay_shell_layout.const.ts` (`OVERLAY_SHELL_WIDTH_PX = 560`); migrate from `sync_modal_layout.const.ts` with re-export or single rename + import updates.
- [ ] **1.2** Add `styles/components/overlay_shell.css`; import from `app.css`.
- [ ] **1.3** Add `overlay_shell_layout.const.spec.ts` (width + CSS contains `cmp-overlay-shell`).

**Done when:** Constants and CSS partial exist; specs pass.

---

## Phase 2 — Remove list quick actions + Raycast footer

**Requirements:** SC-1, SC-2, SC-7, SC-8, SC-9, SC-10

- [ ] **2.1** Remove `ListQuickActions` from `list_main.component.tsx`.
- [ ] **2.2** Delete `list_quick_actions.component.tsx` + spec.
- [ ] **2.3** Remove `syncButtonRef`, `settingsButtonRef`, `newTaskButtonRef` from shell hook, list page, focus ring hook, `list_keyboard.util.ts` + specs.
- [ ] **2.4** Update `list_main.component.spec.tsx` — assert no `.cmp-toolbar--quick-actions`.
- [ ] **2.5** Refactor `list_footer.component.tsx`: resolve primary action from selected row; render `{label} ↵ | Actions ⌘K`; remove `DEFAULT_SHORTCUTS` static chips.
- [ ] **2.6** Add footer CSS (`.cmp-footer-actions-raycast`); wire click on primary to `executePanelAction`.
- [ ] **2.7** Update `list_footer.component.spec.tsx` — command row shows “Paste in Terminal”; no `⌘N` / `⌘,` in footer.
- [ ] **2.8** Tag frequency chroma: `tagFrequencyClass`, CSS tiers, thread counts into `entryTagItems` + specs (SC-8).
- [ ] **2.9** Drop `#type` from `entryTagItems` + spec (SC-9).
- [ ] **2.10** List shell `min-width: 740px` token + CSS (SC-10).

**Done when:** List renders search → results → contextual footer only; all five entry types readable; focus ring and footer specs green.

---

## Phase 3 — Apply overlay shell to modals

**Requirements:** SC-3, SC-4

- [ ] **3.1** Command palette: `cmp-overlay-shell` + unified backdrop; width 560px.
- [ ] **3.2** Sync modal: add shell class; keep SY-7 width stability.
- [ ] **3.3** Task sheet: shell class + matching radius/shadow.
- [ ] **3.4** Update component specs for palette and task sheet.

**Done when:** All three overlays share visual contract; manual smoke — open ⌘K, sync, new task.

---

## Phase 4 — Empty state

**Requirements:** SC-5

- [ ] **4.1** Replace toolbar-style empty sync button with link/inline CTA + palette hint.
- [ ] **4.2** Update `list_results_body.component.spec.tsx`.

---

## Phase 5 — E2e

**Requirements:** SC-1, SC-6

- [ ] **5.1** Add `assets/features/e2e/shell_chrome.feature` (`@spec:shell-chrome`).
- [ ] **5.2** Update `e2e/screenplay/sync.task.ts` — `RunSync` via palette “Sync sources”.
- [ ] **5.3** Update `assets/docs/specs/e2e/step-catalog.md`.
- [ ] **5.4** Scenario: list has no Sync toolbar button.

**Done when:** Sync e2e scenarios pass without main-list Sync button.

---

## Phase 6 — Quality gate

**Requirements:** all

- [ ] **6.1** `bash .agents/skills/app-quality-gate/scripts/gate.sh` green.
- [ ] **6.2** Update `assets/docs/specs/README.md` index with `shell-chrome` link.

---

## Dependency graph

```txt
1.1–1.3 overlay tokens
  → 2.x remove quick actions + Raycast footer
  → 3.x modal styling
  → 4.x empty state
  → 5.x e2e
  → 6.x gate
```
