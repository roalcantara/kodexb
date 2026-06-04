<!-- markdownlint-disable-file -->

# Entry Action Panel — implementation plan

> **For agentic workers:** Implement task-by-task; run tests after each task. Use `app-testing` and `app-quality-gate` skills before declaring done.

**Goal:** One renderer **Entry Action Panel** (catalog + executor) for palette and entry shortcuts; **Return** / **⌘Return** in **list, split, and detail** view run primary/secondary actions and record frecency on success (blocked only in text fields per R3).

**Architecture:** Pure `buildEntryActionPanel` + `executeEntryAction` in `src/shell/renderer/actions/`; hooks wire list keyboard and detail visits; palette delegates. No new RPC routes.

**Tech stack:** Bun test, React 19, Eden `recordEntryVisit`, existing `copyTextForEntry` / RPC clients.

---

### Task 1: Types + panel builder (TDD)

**Files:**

- Create: `src/shell/renderer/actions/entry_action_panel.types.ts`
- Create: `src/shell/renderer/actions/build_entry_action_panel.util.ts`
- Create: `src/shell/renderer/actions/build_entry_action_panel.util.spec.ts`

- [ ] Write failing tests: each `entry.type` has correct `primary`/`secondary` ids and section order; `entry === null` → `[sync, new-task, quit]`.
- [ ] Implement `buildEntryActionPanel`, `primaryAction`, `secondaryAction`, `actionById`.
- [ ] Run `bun test src/shell/renderer/actions/build_entry_action_panel.util.spec.ts`.

### Task 2: Executor (TDD)

**Files:**

- Create: `src/shell/renderer/actions/execute_entry_action.util.ts`
- Create: `src/shell/renderer/actions/execute_entry_action.util.spec.ts`

- [ ] Mock `recordEntryVisit` / `recordEntryVisitFireAndForget`; assert call on successful `copy` handler, not on thrown error.
- [ ] Implement `executeEntryAction` per design §Executor.
- [ ] Run executor spec.

### Task 3: Shortcut matching (TDD)

**Files:**

- Create: `src/shell/renderer/actions/entry_action_shortcuts.util.ts`
- Create: `src/shell/renderer/actions/entry_action_shortcuts.util.spec.ts`

- [ ] Test `entryActionFromKeyboard(e, { viewState, focusInTextField, ... })` → `'primary' | 'secondary' | null`.
- [ ] Implement guards: list/split/detail; block text fields; Enter; mod+Enter for secondary.

### Task 4: Refactor command palette

**Files:**

- Modify: `src/shell/renderer/hooks/list/use_command_palette.hook.ts`
- Modify: `src/shell/renderer/components/actions/command_palette.component.spec.tsx` (if ids/labels shift)

- [ ] Replace `buildActions` with `buildEntryActionPanel` + map to `CommandPaletteAction`.
- [ ] Handlers call `executeEntryAction` (or direct `run` for null-entry library actions).
- [ ] Run palette specs.

### Task 5: List surface keys

**Files:**

- Create: `src/shell/renderer/hooks/list/use_entry_action_keys.hook.ts`
- Create: `src/shell/renderer/hooks/list/use_entry_action_keys.hook.spec.tsx`
- Modify: `src/shell/renderer/hooks/list/use_list_page_shell.hook.ts`
- Modify: `src/shell/renderer/hooks/list/use_list_surface_keydown.hook.ts` or list surface `onKeyDown` chain

- [ ] Register **window** `keydown` (with `use_window_view_nav_keys` or sibling) for Return / ⌘Return.
- [ ] Resolve current entry from `viewState` + `selectedId` / `detailEntry`.
- [ ] Spec: Return runs `open-url` in list, split, and detail; ignored when focus in search input.

### Task 6: Row hints

**Files:**

- Modify: `src/shell/renderer/components/list/entry_row.component.tsx`
- Modify: `src/shell/renderer/components/list/entry_row.component.spec.tsx` (if present)

- [ ] Replace `getPrimaryActionHint` with panel-derived `↵` label.
- [ ] Update command row hint from `⌘C Copy` to `↵ Paste` / `↵ Copy` per type.

### Task 7: Consolidate visits

**Files:**

- Create: `src/shell/renderer/hooks/list/use_record_detail_visit.hook.ts`
- Create: `src/shell/renderer/hooks/list/use_record_detail_visit.hook.spec.tsx`
- Modify: `src/shell/renderer/hooks/list/use_view_navigation.hook.ts`
- Modify: `src/shell/renderer/hooks/list/use_view_navigation_record_visit.hook.spec.tsx`

- [ ] Detail hook: record visit on `detailEntry.id` change.
- [ ] Remove duplicate `recordEntryVisitFireAndForget` from `advance` / `selectDetailEntry`.
- [ ] Copy shortcut: call `executeEntryAction(..., 'copy', ctx)`.
- [ ] Run navigation visit specs.

### Task 8: Docs + gate

**Files:**

- Modify: `assets/docs/specs/README.md`
- Modify: `assets/docs/specs/list-frecency-sort/requirements.md` (R2 cross-link only)
- Check: `assets/docs/specs/entry-action-panel/tasks.md` boxes

- [ ] `bun test` on all touched paths.
- [ ] `bash .agents/skills/app-quality-gate/scripts/gate.sh`.

**Suggested commits (Conventional, ≤50 char subject):**

1. `feat(renderer): Add entry action panel builder`
2. `feat(renderer): Wire Return shortcuts to actions`
3. `refactor(renderer): Palette uses action executor`
