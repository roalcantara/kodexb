<!-- markdownlint-disable-file -->
# KB v0 — Design Polishing — Tasks

**Spec slug:** `design-polishing`
**Reads:** [`requirements.md`](./requirements.md), [`design.md`](./design.md)
**Execution mode:** Single working branch, vertical tracer-bullet slices, **one atomic commit** at the very end (D-012).

### Execution status (2026-05-27)

| Task | Status   | Notes                                                                                          |
| ---- | -------- | ---------------------------------------------------------------------------------------------- |
| 1–11 | **Done** | Landed in `b0d7dcc` (`feat(renderer): Polish Andromeda Void v0 UI`) on `feat-add-stats-panel`. |
| 12   | **Done** | `list.css` trimmed; docs (`CLAUDE.md`, `CODESTYLE_GUIDE`, `STYLING_GUIDE`).                    |
| 13   | **Done** | Quality gate green; atomic commit recorded.                                                    |
| 14   | **Done** | Wireframe visual parity (renderer + CSS).                                                      |
| 15   | **Done** | Token hygiene — zero literals in `styles/components/`; `lint:renderer-css` gate.               |

---

## How to use this file

- Tasks are **ordered**. Do not parallelise unless the **"Parallelisable with"** row is non-empty.
- Each task lists its **dependencies** (must complete first), the **requirement IDs** it satisfies, and its **completion conditions** (binary, observable).
- After completing a task, run the **per-task verification** before moving on. If a check fails, do not advance — diagnose first (`systematic-debugging` skill).
- Do **NOT** create intermediate git commits. Stage incrementally on the working branch; the implementor produces the single conventional commit at Task 13.

---

## Phase map

| Phase                     | Tasks   | Purpose                                                               |
| ------------------------- | ------- | --------------------------------------------------------------------- |
| **Foundation**            | 1, 2    | Land Tailwind v4, theme tokens, build wiring; prove dev + prod work.  |
| **Core surfaces**         | 3, 4, 5 | Migrate the highest-traffic surfaces (list rows, search, footer).     |
| **Secondary surfaces**    | 6, 7, 8 | Migrate filter overlay, detail panel, settings.                       |
| **Modal surfaces**        | 9, 10   | Task sheet, confirm dialog, command palette.                          |
| **Notification surfaces** | 11      | Sync progress / modal / toast, action toasts.                         |
| **Cleanup**               | 12, 13  | Trim `list.css` to escape hatches, doc updates, single atomic commit. |
| **Wireframe parity**      | 14      | Close visual gaps vs `wireframe.html` (extends Tasks 4–5).            |
| **Token hygiene**         | 15      | Remove hardcoded colours from partials; enforce `var(--*)` only.      |

---

## Task 1 — Install Tailwind v4, wire build pipeline, prove dev + prod

| Field                  | Value                                                         |
| ---------------------- | ------------------------------------------------------------- |
| Depends on             | —                                                             |
| Parallelisable with    | —                                                             |
| Requirements satisfied | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-026 |
| Estimated effort       | 3–4 h                                                         |

### What this task does

Bootstraps the entire styling pipeline so subsequent tasks have a working foundation. Adds Tailwind v4 + CLI, creates `app.css`, `theme.css` (skeleton with **all** tokens from `DESIGN.md`, per `design.md` §6.1), wires `mise.toml` tasks, removes the old `list.css` import from `index.ts`, and proves that `bun run dev`, `bun run build`, and `bun run build:prod` all complete and produce a CSS bundle that includes Tailwind output.

### Steps

1. `bun add -d tailwindcss @tailwindcss/cli` and commit `bun.lock` changes locally.
2. Create `src/shell/renderer/styles/app.css` per `design.md` §6.2.
3. Create `src/shell/renderer/styles/theme.css` per `design.md` §6.1 (every token from `DESIGN.md`).
4. Create `src/shell/renderer/styles/components/` directory with an empty placeholder for each surface listed in `design.md` §3 (so the `@import`s in `app.css` resolve).
5. Add `src/shell/renderer/styles/generated/` to `.gitignore`.
6. Add the path to `knip.jsonc#ignore` and verify `.dependency-cruiser.cjs` does not flag it.
7. Add `[tasks.styles]` + `[tasks."styles:watch"]` to `mise.toml`. Make `dev` and `build` (and `build:prod` if separate) depend on them. **Inspect existing tasks first**; do not duplicate Electrobun invocations.
8. Update `src/shell/renderer/index.ts` to import `./styles/generated/app.css` (still keep `./styles/list.css` import for now — Task 12 removes it).
9. Smoke: run `mise run styles` once; confirm `src/shell/renderer/styles/generated/app.css` exists and is non-empty.
10. Smoke: `bun run dev` — confirm the app boots; CSS may look identical because no class names changed yet.
11. Smoke: `bun run build` — confirm `dist/kb.app` exists and `…/views/shell/index.css` is non-empty.
12. Smoke: `bun run build:prod` — confirm minified output and no warnings.

### Completion conditions

- [x] `package.json#devDependencies` contains `tailwindcss` (^4.x) and `@tailwindcss/cli`.
- [x] No `postcss`, `autoprefixer`, or `@tailwindcss/postcss` added.
- [x] `src/shell/renderer/styles/app.css`, `theme.css`, and `components/*.css` placeholders exist.
- [x] `src/shell/renderer/styles/generated/app.css` is generated and gitignored.
- [x] `mise run styles` runs cleanly; `mise run styles:watch` starts a watcher.
- [x] `bun run dev` boots the app, with the watcher running.
- [x] `bun run build` and `bun run build:prod` complete with 0 warnings.
- [x] `bun run test` passes (no behavioural changes yet).
- [x] `mise run lint` passes (the new generated path is ignored by knip/cruiser).

### Verification command sequence

```
mise run styles
bun run lint
bun run test
bun run dev   # then ⌃C; confirms it boots
bun run build
bun run build:prod
```

---

## Task 2 — Add semantic + component helper classes, prove utilities resolve to tokens

| Field                  | Value                                                           |
| ---------------------- | --------------------------------------------------------------- |
| Depends on             | Task 1                                                          |
| Parallelisable with    | —                                                               |
| Requirements satisfied | REQ-011, REQ-012, REQ-007 (verification only), REQ-009, REQ-010 |
| Estimated effort       | 2 h                                                             |

### What this task does

Adds the four `.semantic-*` helper classes (`command`, `url`, `cheat`, `task-characteristic`) and the three `.cmp-*` helper classes (`button-primary`, `kbd`, `entry-row-selected`) inside `theme.css` per `design.md` §6.1. Then writes a tiny throwaway test page (or simply uses an existing component momentarily) to **prove** that `bg-primary`, `text-color-task`, `text-body-md`, `rounded-md`, `gap-lg` all resolve to the right CSS values at runtime. Removes the throwaway after verification.

### Steps

1. Author `.semantic-command`, `.semantic-url`, `.semantic-cheat`, `.semantic-task-characteristic` in `theme.css`.
2. Author `.cmp-button-primary`, `.cmp-kbd` in `theme.css`. (`.cmp-entry-row-selected` will live in `components/entry_row.css` — added in Task 3.)
3. Open the dev app; in browser devtools, inspect a temporarily-added `<div className="bg-primary text-color-task rounded-md p-lg">test</div>` somewhere in `app.tsx`; confirm:
   - `bg-primary` resolves to `rgb(94 207 190)` (Supernova Cyan).
   - `text-color-task` resolves to `rgb(255 174 87)` (Solar Orange).
   - `rounded-md` resolves to `6px`.
   - `p-lg` resolves to `16px`.
4. Remove the throwaway markup.
5. Run quality gates.

### Completion conditions

- [x] `theme.css` declares `.semantic-command`, `.semantic-url`, `.semantic-cheat`, `.semantic-task-characteristic`, `.cmp-button-primary`, `.cmp-kbd`.
- [x] Manual devtools check confirms `bg-primary`, `text-color-task`, `rounded-md`, `p-lg` resolve to expected values.
- [x] No throwaway test markup remains in source.
- [x] `bun run test` + `mise run lint` pass.

---

## Task 3 — Migrate S1 (App shell + drag stripe) + S5 (Footer + kbd chip)

| Field                  | Value            |
| ---------------------- | ---------------- |
| Depends on             | Task 2           |
| Parallelisable with    | —                |
| Requirements satisfied | REQ-013, REQ-016 |
| Estimated effort       | 3 h              |

### What this task does

Migrates two small surfaces in one slice because the footer's `kbd` chip pattern is reused everywhere downstream and the app shell is the wrapper everything sits inside. Smallest end-to-end proof of the migration playbook (`design.md` §7).

### Steps

1. Follow the playbook in `design.md` §7 for the app-shell wrapper (find it; likely a top-level `<div>` in `app.tsx` or a dedicated shell component).
2. Move `.theme-app-shell` + `.theme-window-drag-stripe` rules from `list.css` into `components/app_shell.css`, expressed via `@apply` where possible. Retain the `-webkit-app-region` declaration with `/* RETAIN: ... */`.
3. Migrate `list_footer.component.tsx` to use `cmp-footer` (in `components/footer.css`) + utilities + `.cmp-kbd` for the keyboard hint chips.
4. Update `list_footer.component.spec.tsx` to assert on `cmp-footer` / `cmp-kbd` / role / text (no Tailwind utility fragments).
5. Delete the migrated rules from `list.css`.

### Completion conditions

- [x] No `cmp-app-shell`, `cmp-window-drag-stripe`, `cmp-footer*`, `cmp-empty-state*` references use legacy `theme-*` names in renderer JSX.
- [x] `components/app_shell.css` and `components/footer.css` exist with the migrated rules.
- [x] `list_footer.component.spec.tsx` passes and asserts on the new class names.
- [x] Window drag still works (manual smoke: drag the title bar).
- [x] `bun run test` + `mise run lint` + `bun run dev` (manual smoke) all green.

---

## Task 4 — Migrate S2 (Search bar + toolbar + filter chip)

| Field                  | Value   |
| ---------------------- | ------- |
| Depends on             | Task 3  |
| Parallelisable with    | —       |
| Requirements satisfied | REQ-014 |
| Estimated effort       | 3 h     |

### What this task does

Migrates the search/toolbar header to match the wireframe's PowerToys-style row (52px min-height, transparent input, optional back button, filter chip on the right). System font stack only; no Google Fonts import.

### Steps

1. Apply migration playbook to `list_search_filter_chrome.component.tsx` and `toolbar.component.tsx`.
2. Replace `theme-search*` / `theme-toolbar*` / `theme-filter-chip*` with utilities + a `cmp-search-bar` partial if reuse warrants it.
3. Remove `@import url(https://fonts.googleapis.com/...)` lines from `list.css` (per REQ-008, font stack is system-only).
4. Update `toolbar.component.spec.tsx` accordingly.
5. Smoke test: focus the input, confirm focus ring renders subtly; type a query, confirm placeholder italic style; toggle a filter chip, confirm `text-accent` colour.

### Completion conditions

- [x] No legacy `theme-search*`, `theme-toolbar*`, `theme-filter-chip*` class names in renderer JSX (replaced with `cmp-*`).
- [x] No `@import url(https://fonts.googleapis.com/...)` lines remain in any renderer CSS.
- [x] Filter-chip active state renders with `text-accent` and the documented accent-tinted background.
- [x] `toolbar.component.spec.tsx` passes.
- [x] `bun run test` + `mise run lint` + manual smoke green.

### Wireframe parity extensions (Task 4 — see also Task 14)

Normative sources: [`wireframe.html`](./wireframe.html) header block, [`design.md`](./design.md) §4 (search input size, filter chip), REQ-014.

- [ ] **Search magnifier:** left-aligned icon in the search row (wireframe `<svg>` search glyph).
- [ ] **Search type scale:** input uses wireframe-equivalent size (`text-xl` / `font-medium` per §4; **system font stack** per D-009, not Inter).
- [ ] **Filter control chrome:** “All” control matches wireframe pill (`rounded-lg`, border `white/5`, chevron-down), not legacy toolbar button styling.

---

## Task 5 — Migrate S3 (List body + entry row + list row) + S4 (Frecency indicator) + S14 (Drag affordances)

| Field                  | Value   |
| ---------------------- | ------- |
| Depends on             | Task 4  |
| Parallelisable with    | —       |
| Requirements satisfied | REQ-015 |
| Estimated effort       | 5 h     |

### What this task does

The biggest core slice: migrates the list body, both row implementations (`entry_row` modern + the older `list-row` rules in `list.css`), the trailing frecency indicator, and drag-source / drop-target visual affordances. This is where the wireframe's row spacing (`gap-4 px-6 py-4`) lands.

### Steps

1. Apply migration playbook to `list_results_body.component.tsx`, `entry_row.component.tsx`, `entry_row_frecency_indicator.component.tsx`.
2. Create `components/entry_row.css` with `.cmp-entry-row`, `.cmp-entry-row-selected` (border-left rail per REQ-015.2 in `color-cheat`), `.cmp-entry-glyph`, `.cmp-frecency-bar`.
3. Apply the conflict-resolution table from `design.md` §4 for icon colours per entry type: command → cyan, task → solar-orange, cheat → muted, bookmark → photon-blue + underline on URL.
4. Preserve the `data-list-selection='true'` hover-suppression behaviour (REQ-015.3).
5. Update `entry_row.component.spec.tsx` and `entry_row_frecency_indicator.component.spec.tsx`.
6. Move the drag/drop visual affordances (`theme-entry-row--dragging`, `theme-entry-row--drag-over`) into `components/entry_row.css`.
7. Manual smoke: select rows with `↑/↓`, confirm rail and background; hover with mouse during selection, confirm no secondary highlight; drag a row, confirm dragging affordance; drop, confirm drag-over rail.

### Completion conditions

- [x] No legacy `theme-list-*`, `theme-entry-row*`, `theme-list-row*`, `theme-frecency*` class names in renderer JSX (replaced with `cmp-*`).
- [x] Selected row renders the 2px `color-cheat` left rail.
- [x] Icon colour per entry type matches the §4 conflict table (token-level; favicon/brand glyphs exempt).
- [x] `data-list-selection='true'` hover-suppression preserved.
- [x] All updated `.spec.tsx` files pass.
- [x] `bun run test` + `mise run lint` + manual smoke green.

### Wireframe parity extensions (Task 5 — see also Task 14)

Normative sources: [`wireframe.html`](./wireframe.html) result rows, [`design.md`](./design.md) §4, REQ-015.2 (rail **and** row background).

- [ ] **Three-line body stack:** each row body renders (1) semantic/metadata line, (2) primary title line, (3) `#tag` row — matching wireframe vertical rhythm, not a flat title+chips layout.
- [ ] **Row alignment:** multi-line rows use `items-start` (wireframe `flex items-start`); icon column top-aligned with body.
- [ ] **Glyph background tile:** task (and other ornamental) icons use wireframe 32×32 rounded tile (`bg-priority-high/80` or equivalent per §4), not borderless favicon-only layout where §4 calls for a tile.
- [ ] **Semantic primary line:** command → `.semantic-command`; bookmark URL → `.semantic-url` on its own line; cheat subtitle → `.semantic-cheat`; task metadata → `.semantic-task-characteristic` (+ clock when applicable).
- [ ] **Tag band:** `#type` / `#tag` labels in wireframe style (italic where wireframe uses italic, `gap-3`, per-tag colours from DESIGN.md semantic table per §4 — not only `cmp-type-chip` pills).
- [ ] **Selected row fill:** selected row shows wireframe-equivalent tinted background (`surface-container-highest` / subtle `bg-white/[0.03]` per REQ-015.2), not rail-only selection.
- [ ] **Spacing:** `gap-4`, `px-6`, `py-4`; no fixed `min-height: 90px` (content-driven height per §4).

---

## Task 6 — Migrate S6 (Compact filter dropdown + overlay)

| Field                  | Value   |
| ---------------------- | ------- |
| Depends on             | Task 5  |
| Parallelisable with    | —       |
| Requirements satisfied | REQ-017 |
| Estimated effort       | 3 h     |

### What this task does

Migrates the portal-mounted compact filter dropdown, its sticky-facets row, the search filter input, and the highlight rail used by keyboard navigation. Preserves the keyboard hook behaviour entirely.

### Steps

1. Apply migration playbook to `compact_filter_overlay.component.tsx`, `filter_dropdown.component.tsx`, `filter_dropdown_tags.component.tsx`.
2. Create `components/compact_filter.css` with `.cmp-compact-filter-option`, `.cmp-compact-filter-highlight`, `.cmp-compact-filter-sticky` (sticky-facets), `.cmp-compact-filter-search-input`.
3. Retain `position: sticky` + `backdrop-filter` rules as raw CSS (`@apply` doesn't cover them cleanly) — annotate with `/* RETAIN: ... */`.
4. Update the three `.spec.tsx` siblings + `compact_filter_overlay_keyboard.util.spec.ts` if it asserts on class names (it likely doesn't — verify).
5. Manual smoke: open compact filter, navigate with `↑/↓`, confirm highlight rail; type into the search input, confirm filtering still works.

### Completion conditions

- [x] No legacy `theme-filter-*`, `theme-compact-filter-*` class names in renderer JSX (replaced with `cmp-*`).
- [x] Sticky facets header still sticks during scroll.
- [x] Highlight rail renders in `accent` colour during keyboard navigation.
- [x] Updated `.spec.tsx` files pass.
- [x] `bun run test` + `mise run lint` + manual smoke green.

---

## Task 7 — Migrate S7 (Detail panel — split & full views)

| Field                  | Value                                                                          |
| ---------------------- | ------------------------------------------------------------------------------ |
| Depends on             | Task 5                                                                         |
| Parallelisable with    | Task 6 (different files; coordinate `list.css` edits to avoid merge conflicts) |
| Requirements satisfied | REQ-018                                                                        |
| Estimated effort       | 4 h                                                                            |

### What this task does

Migrates the slide-in detail panel and its full-page sibling, the markdown view, OG image, dependency graph, metadata sidebar, and the responsive `@media (min-width: 1300px)` behaviour. Preserves the 180ms slide animation.

### Steps

1. Apply migration playbook to `detail_panel.component.tsx` and the `pages/detail/*` page.
2. Create `components/detail_panel.css` with `.cmp-detail-panel`, `.cmp-detail-panel-visible`, `.cmp-md-view`, `.cmp-og-image`, `.cmp-dependency-row`, `.cmp-metadata-sidebar`. Retain animations as raw CSS.
3. Use the `.semantic-url` helper for markdown links.
4. Preserve `@media (min-width: 1300px)` for metadata sidebar.
5. Update `detail_panel.component.spec.tsx`.
6. Manual smoke: open a detail panel, confirm slide-in; resize window across 1300px breakpoint, confirm metadata sidebar appears/disappears; render a markdown body with code + links, confirm syntax highlight and link styling.

### Completion conditions

- [x] No legacy `theme-detail-*`, `theme-md-view*`, `theme-og-image*`, `theme-dependency-*`, `theme-metadata-*` class names in renderer JSX (replaced with `cmp-*`).
- [x] Slide animation preserved (180ms ease-out).
- [x] `@media (min-width: 1300px)` behaviour preserved.
- [x] Markdown links use `.semantic-url`.
- [x] `detail_panel.component.spec.tsx` passes.
- [x] `bun run test` + `mise run lint` + manual smoke green.

---

## Task 8 — Migrate S8 (Settings page)

| Field                  | Value                                                         |
| ---------------------- | ------------------------------------------------------------- |
| Depends on             | Task 2 (token helpers must exist)                             |
| Parallelisable with    | Task 6, Task 7 (different files; coordinate `list.css` edits) |
| Requirements satisfied | REQ-019, REQ-012                                              |
| Estimated effort       | 3 h                                                           |

### What this task does

Migrates the settings page (DB path browser, source paths, sync radios, stats table, action row). Introduces a reusable `.cmp-input` partial used here and reused in Task 9 for the task sheet.

### Steps

1. Apply migration playbook to `pages/settings/*.page.tsx`.
2. Create `components/settings.css` with `.cmp-settings-heading`, `.cmp-settings-field`, `.cmp-input` (shared with Task 9), `.cmp-stats-table`.
3. Replace primary-action button with `.cmp-button-primary`.
4. Update settings-related `.spec.tsx` siblings.
5. Manual smoke: open Settings, browse to a folder, save; confirm radio/select interactions still work; check stats table renders.

### Completion conditions

- [x] No legacy `theme-settings-*`, `theme-stats-*` class names in renderer JSX (replaced with `cmp-*`).
- [x] `.cmp-settings-input` (and related partials) defined in `components/settings.css` and reused by Task 9.
- [x] Primary action button uses `.cmp-button-primary`.
- [x] All settings tests pass.
- [x] `bun run test` + `mise run lint` + manual smoke green.

---

## Task 9 — Migrate S9 (Task sheet modal) + S10 (Confirm dialog)

| Field                  | Value                                                           |
| ---------------------- | --------------------------------------------------------------- |
| Depends on             | Task 8 (`.cmp-input` available)                                 |
| Parallelisable with    | Task 10, Task 11 (different files; coordinate `list.css` edits) |
| Requirements satisfied | REQ-020                                                         |
| Estimated effort       | 3 h                                                             |

### What this task does

Migrates the modal infrastructure: backdrop, centred panel, form fields (reusing `.cmp-input`), action row, and the inline confirm dialog used in destructive flows.

### Steps

1. Apply migration playbook to the task sheet (locate via `grep "theme-task-sheet" src/shell/renderer --include="*.tsx" -l`).
2. Apply migration playbook to the confirm dialog (locate via `grep "theme-confirm-dialog" …`).
3. Create `components/task_sheet.css` and `components/confirm_dialog.css`.
4. Verify modal returns focus to the previously focused element on close (no regression vs current).
5. Update relevant `.spec.tsx` files.
6. Manual smoke: open task sheet, fill a field, cancel; reopen, save; trigger a delete confirm, cancel; trigger and confirm.

### Completion conditions

- [x] No legacy `theme-modal`, `theme-task-sheet*`, `theme-confirm-dialog*` class names in renderer JSX (replaced with `cmp-*`).
- [x] Focus restoration preserved.
- [x] `.spec.tsx` files pass.
- [x] `bun run test` + `mise run lint` + manual smoke green.

---

## Task 10 — Migrate S11 (Command palette)

| Field                  | Value                         |
| ---------------------- | ----------------------------- |
| Depends on             | Task 3 (`.cmp-kbd` available) |
| Parallelisable with    | Task 9, Task 11               |
| Requirements satisfied | REQ-021                       |
| Estimated effort       | 2 h                           |

### What this task does

Migrates the Cmd-K palette to the new token system. Reuses `.cmp-kbd` for shortcut hints.

### Steps

1. Apply migration playbook (locate via `grep "theme-command-palette" …`).
2. Create `components/command_palette.css` with `.cmp-palette-shell`, `.cmp-palette-action`, `.cmp-palette-action-selected`, `.cmp-palette-section`.
3. Use `.cmp-kbd` for shortcut hints.
4. Replace `color-mix(in srgb, var(--theme-accent) 20%, transparent)` with Tailwind `bg-accent/20`.
5. Update `.spec.tsx` siblings.
6. Manual smoke: open palette, navigate with `↑/↓`, run a command; confirm shortcut chips and selected-row tint render correctly.

### Completion conditions

- [x] No legacy `theme-command-palette*` class names in renderer JSX (replaced with `cmp-*`).
- [x] `.cmp-kbd` reused for shortcut hints.
- [x] `.spec.tsx` files pass.
- [x] `bun run test` + `mise run lint` + manual smoke green.

---

## Task 11 — Migrate S12 (Sync surfaces) + S13 (Action toasts)

| Field                  | Value                             |
| ---------------------- | --------------------------------- |
| Depends on             | Task 2 (keyframes in `theme.css`) |
| Parallelisable with    | Task 9, Task 10                   |
| Requirements satisfied | REQ-022                           |
| Estimated effort       | 3 h                               |

### What this task does

Migrates sync progress bar, sync modal (log rows, error banner, summary), sync toast (slide-up animation), and action toasts (success/error variants). Animation keyframes already moved to `theme.css @layer base` in Task 1/2.

### Steps

1. Apply migration playbook (locate via `grep "theme-sync-\|theme-action-toast" …`).
2. Create `components/sync.css` and `components/action_toast.css`.
3. Reference the existing `theme-pulse`, `theme-progress-indeterminate`, `theme-slide-up` keyframes by name (they live in `theme.css @layer base`).
4. Verify the action-toast stacking direction (`flex-col-reverse`) is preserved.
5. Update `.spec.tsx` siblings.
6. Manual smoke: trigger a sync, observe progress bar; trigger an error toast, observe slide-up animation; let toast auto-dismiss or close manually.

### Completion conditions

- [x] No legacy `theme-sync-*`, `theme-sync-toast*`, `theme-sync-modal*`, `theme-sync-progress*`, `theme-action-toast*` class names in renderer JSX (replaced with `cmp-*`).
- [x] Animations still play.
- [x] `.spec.tsx` files pass.
- [x] `bun run test` + `mise run lint` + manual smoke green.

---

## Task 12 — Trim or delete `list.css`, finalise ls-lint, documentation pass

| Field                  | Value                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| Depends on             | Tasks 3–11 (all surface migrations complete)                                                     |
| Parallelisable with    | —                                                                                                |
| Requirements satisfied | REQ-024, REQ-025, REQ-026, REQ-028, REQ-029, REQ-030, REQ-008 (font import cleanup verification) |
| Estimated effort       | 2 h                                                                                              |

### What this task does

Closes the migration: reduces `list.css` to ≤ 200 lines of `/* RETAIN: <reason> */` escape hatches OR deletes it; removes the import from `index.ts`; updates `.ls-lint.yml` for the new directory; runs the full quality-gate suite; updates docs.

### Steps

1. Inspect remaining content in `list.css`. For each block:
   - If it can be expressed via Tailwind utilities or `@apply` in an existing partial → move it.
   - If it is genuinely an escape hatch → annotate `/* RETAIN: <reason> */`.
   - If the file is empty → delete it and remove `import './styles/list.css'` from any remaining import sites.
2. Update `.ls-lint.yml` per REQ-025: rule for `src/shell/renderer/styles/components` (`.css: regex:^[a-z][a-z0-9_]*$`) and rule for `src/shell/renderer/styles` (`.css: regex:^(app|theme|list)$` if `list.css` retained, else just `app|theme`).
3. Run `bun run lint:ls`; fix any naming violations.
4. Run `bun run lint:knip`; verify `generated/` is ignored.
5. Run `bun run lint:depcruise`; verify 0 violations.
6. Update `CLAUDE.md` (project root) to reference Tailwind v4 + Andromeda Void tokens in the styling section.
7. Update `assets/guides/CODESTYLE_GUIDE.md` File-Naming table to include `.css` partial conventions.
8. Optionally create `assets/guides/STYLING_GUIDE.md` per REQ-030.4 (recommended; otherwise inline the same content into `CODESTYLE_GUIDE.md`).
9. Update `README.md` development section if `mise run dev` did not transparently compose `styles:watch`.
10. Run `grep -r "console\\." src/shell/renderer --include="*.ts" --include="*.tsx" -l` — verify no new occurrences vs git HEAD.

### Completion conditions

- [x] `src/shell/renderer/styles/list.css` is ≤ 200 lines (or deleted); every retained block annotated.
- [x] `index.ts` no longer imports `./styles/list.css` (unless retained file still exists).
- [x] `.ls-lint.yml` updated for the new directory; `bun run lint:ls` passes.
- [x] `bun run lint:knip` passes (generated path ignored).
- [x] `bun run lint:depcruise` passes.
- [x] `CLAUDE.md`, `assets/guides/CODESTYLE_GUIDE.md` updated.
- [x] (Recommended) `assets/guides/STYLING_GUIDE.md` created.
- [x] No new `console.*` calls in renderer source.

---

## Task 13 — Full quality gate + atomic conventional commit

| Field                  | Value            |
| ---------------------- | ---------------- |
| Depends on             | Task 12          |
| Parallelisable with    | —                |
| Requirements satisfied | REQ-027, REQ-031 |
| Estimated effort       | 1 h              |

### What this task does

Runs the entire DoD checklist; produces the single atomic conventional commit; pushes nothing (the user decides on push timing).

### Steps

1. Run `bun run lint:fix` (autofix what's autofixable).
2. Run `bun run lint` — must succeed with 0 errors and 0 warnings.
3. Run `bun run test` — must pass 100% with 0 skipped tests.
4. Run `bun run build` — must succeed.
5. Run `bun run build:prod` — must succeed.
6. Run `bun run dev` for a final manual smoke across every surface in `design.md` §3 (open List, Detail, Settings, TaskSheet, ConfirmDialog, CommandPalette, trigger sync, fire action toast).
7. Stage all changes: `git add` specific paths (not `git add -A`); no `.env`, no credentials.
8. Commit using a HEREDOC body, subject ≤ 50 chars. Suggested subject: `feat(renderer): polish Andromeda Void v0 UI`.
9. Confirm HK pre-commit hook passes without `--no-verify`.
10. Run `git status` and `git log -1` to confirm the commit landed cleanly.

### Commit message template

```
feat(renderer): polish Andromeda Void v0 UI

Integrate Tailwind v4 into the Electrobun renderer build pipeline,
realise the Andromeda Void design system across every visible
surface, and decompose src/shell/renderer/styles/list.css into
per-component Tailwind partials.

WHAT
- Add tailwindcss + @tailwindcss/cli; wire dev+prod via mise tasks.
- Author src/shell/renderer/styles/{app,theme}.css; map every
  DESIGN.md token into @theme; introduce .semantic-* and .cmp-*
  helper classes.
- Migrate App shell, Search/Toolbar, List body + EntryRow + Frecency,
  Compact filter, Detail panel, Settings, TaskSheet, ConfirmDialog,
  CommandPalette, Sync surfaces, ActionToasts onto Tailwind
  utilities + per-component partials in styles/components/.
- Reduce list.css to <=200 lines of /* RETAIN */ escape hatches
  (or delete entirely).
- Update .ls-lint.yml, knip.jsonc, CLAUDE.md, CODESTYLE_GUIDE.md,
  STYLING_GUIDE.md (new) for the styling rules.

WHY
- v0 design polish requires the Andromeda Void palette and
  wireframe rhythm to be the consistent contract across all
  surfaces; a single @theme block becomes the source of truth.
- Tailwind v4's CSS-first config keeps tokens co-located with the
  styles that use them; @tailwindcss/cli avoids PostCSS
  infrastructure debt.
- Component-partial decomposition makes future style edits a
  local change rather than a hunt through a 2,200-line monolith.

Spec: assets/docs/specs/design-polishing/
```

### Completion conditions

- [x] `bun run lint`, `bun run test`, `bun run build`, `bun run build:prod` all pass cleanly.
- [x] Manual smoke confirms every surface renders the Andromeda Void palette (token migration complete).
- [x] A single git commit exists on the working branch with subject ≤ 50 chars and Conventional Commit format (`b0d7dcc`).
- [x] HK pre-commit hook passed without `--no-verify`.
- [x] `git status` is clean after commit.

---

## Task 14 — Wireframe visual parity (follow-up)

| Field                  | Value                                      |
| ---------------------- | ------------------------------------------ |
| Depends on             | Tasks 1–13 (foundation + migration landed) |
| Parallelisable with    | Task 12 doc pass                           |
| Requirements satisfied | REQ-014, REQ-015, REQ-016 (visual gaps)    |
| Estimated effort       | 4–6 h                                      |

### What this task does

Closes the **prototype vs shipped UI** gaps called out after `b0d7dcc`. Tasks 4–5 migrated CSS class names and tokens; this task aligns **layout and information hierarchy** with [`wireframe.html`](./wireframe.html) and [`design.md`](./design.md) §4. Behaviour and keyboard contracts stay unchanged.

### Steps

1. **Search chrome (Task 4 extensions):** add magnifier to `list_search_filter_chrome.component.tsx`; apply `text-xl` + system sans to the search input; restyle filter “All” as wireframe pill + chevron in `app_shell.css` / `compact_filter.css`.
2. **List row structure (Task 5 extensions):** refactor `entry_row.component.tsx` (and list-row variant if still used) to three-line body stack; apply `.semantic-*` on the correct lines; introduce `cmp-tag` (or equivalent) partial for `#tag` band in `entry_row.css`.
3. **Glyph tiles:** wire `brand_icon_or_glyph` / entry icon slot to optional 32×32 tile per entry type (§4 task tile rule).
4. **Selection:** ensure `cmp-list-row--selected` / `cmp-entry-row--selected` include REQ-015.2 background fill, not rail-only.
5. **Footer (optional polish):** align left summary separator with wireframe (`•` rhythm) if product copy allows; confirm `.cmp-kbd` matches §4 chip style in devtools.
6. Manual smoke: side-by-side with `wireframe.html` in browser (open file locally) vs `mise run app start`.
7. Update `entry_row.component.spec.tsx` / search chrome specs for new structure (assert `cmp-*` / roles, not utility fragments).
8. Run quality gate; commit as separate conventional commit (do not amend `b0d7dcc` unless user approves history rewrite).

### Completion conditions

Aggregate checklist — all must pass:

**Search (extends Task 4)**

- [x] Search magnifier visible and aligned with wireframe header.
- [x] Search input type scale matches §4 (`text-xl`, system font).
- [x] Filter “All” matches wireframe pill + chevron chrome.

**List rows (extends Task 5)**

- [x] Three-line body stack (metadata → title → `#tags`).
- [x] `items-start` alignment on multi-line rows.
- [x] Glyph background tiles where §4 requires them.
- [x] Semantic helpers on correct lines per entry type.
- [x] Tag band matches wireframe italic / gap / per-tag colours.
- [x] Selected row: 2px `color-cheat` rail **and** tinted row background.

**Quality**

- [x] `bun run test` + `mise run lint` + `bash .agents/skills/app-quality-gate/scripts/gate.sh` pass.
- [ ] Manual side-by-side with `wireframe.html` signed off (user or reviewer).

---

## Task 15 — Token hygiene and CSS dedupe

| Field                  | Value                   |
| ---------------------- | ----------------------- |
| Depends on             | Tasks 1–14              |
| Parallelisable with    | —                       |
| Requirements satisfied | REQ-005, REQ-007, D-008 |
| Estimated effort       | 3–4 h                   |

### What this task does

Eliminates **hardcoded colour literals** from `src/shell/renderer/styles/components/*.css`. Every chromatic value lives in `theme.css` `@theme` once; partials reference `var(--color-*)`, `var(--shadow-*)`, and spacing tokens. Adds `bun run lint:renderer-css` to the lint pipeline so the discipline cannot regress.

### Steps

1. Inventory `rg '#[0-9a-fA-F]|rgb\\(|rgba\\(' src/shell/renderer/styles/components`.
2. Add missing chrome tokens to `@theme` (overlays, scrims, glass, shadows, footer text).
3. Replace every literal in component partials with `var(...)`.
4. Simplify duplicate rules where safe (e.g. shared selected-row fill, merged toast variants).
5. Add `tools/scripts/check_renderer_css_tokens.sh`; wire into `mise run lint check`.
6. Update `assets/guides/STYLING_GUIDE.md` §Token hygiene.
7. Run quality gate.

### Completion conditions

- [x] `rg` over `styles/components/` finds **no** `#`, `rgb(`, or `rgba(` literals.
- [x] New overlay/scrim/shadow tokens documented in `theme.css` (comment block).
- [x] `bun run lint:renderer-css` passes; included in full `mise run lint check`.
- [x] `bash .agents/skills/app-quality-gate/scripts/gate.sh` passes.

### Verification

```bash
bun run lint:renderer-css
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

---

## Definition of Done (whole spec)

Cross-reference with [`assets/guides/DoD.md`](../../../guides/DoD.md). Every box there must be ticked.

A higher-level checklist for the implementor:

- [x] Tasks 1–11 each report all completion conditions met (`b0d7dcc`).
- [x] Task 13 complete (quality gate + atomic commit).
- [x] Task 12 doc pass (`CLAUDE.md`, `CODESTYLE_GUIDE.md`, `STYLING_GUIDE.md`).
- [x] Task 14 wireframe visual parity (renderer + CSS; manual sign-off pending).
- [x] Task 15 token hygiene (`lint:renderer-css`, no literals in component partials).
- [x] Every requirement REQ-001 … REQ-031 has at least one task that satisfies it (REQ-014/015 visual details completed in Task 14).
- [x] Single atomic conventional commit on the working branch for migration (`b0d7dcc`).
- [x] `handoff.md` not modified (planning artifact).
- [x] Implementor reported: branch `feat-add-stats-panel`, commit `b0d7dcc`, spec under `assets/docs/specs/design-polishing/`.
- [x] **Deviation (resolved):** wireframe layout parity landed in follow-up after `b0d7dcc` (Task 14).
