<!-- markdownlint-disable-file -->
# Renderer — List / Split / Detail Keyboard Navigation — Tasks

**Goal:** Ship [`requirements.md`](requirements.md) per [`design.md`](design.md).

**Verify:** `bun test src/shell/renderer/hooks/list` and manual check in
`bun run dev` (Electrobun webview): ArrowRight → split → ArrowLeft → ArrowRight
again opens split.

---

## Task 1: Verify root cause (short)

- [ ] In Electrobun dev build, reproduce the broken sequence with temporary
  logging in `use_view_navigation.hook.ts` (remove before merge): confirm whether
  `document` capture `keydown` fires on the second ArrowRight and what
  `document.activeElement` is after detail closes.
- [ ] Document one-line conclusion in the PR description or a comment on the
  first implementation commit.

---

## Task 2: Renderer-first — move ArrowRight / ArrowLeft to list surface path

- [ ] Move ArrowRight / ArrowLeft handling from `document` listener in
  `use_view_navigation.hook.ts` into `use_list_selection.hook.ts`
  `onListKeyDown` (call existing `advance` / `retreat` with same guards).
- [ ] Remove the `useEffect` that registers `document.addEventListener` for those
  keys once surface handling is wired.
- [ ] Ensure search `input` and other inputs still do not trigger navigation when
  focused.

**Verify:** `bun test src/shell/renderer/hooks/list`

---

## Task 3: Harden focus restore after detail closes

- [ ] Update `list_main.component.tsx` (or `list_surface_focus.util.ts`) per
  [`design.md`](design.md): microtask + double `rAF` (or equivalent) before
  `focusListSurface`, optional single retry if focus did not land on surface.

**Verify:** manual Electrobun check of the ArrowRight / ArrowLeft cycle.

---

## Task 4: Tests aligned with production

- [ ] Update hook/component tests to fire keyboard events on the same DOM node
  that receives `onKeyDown` in production (not only `document`).
- [ ] Cover the RNF-2b arbitrary ladder in `use_view_navigation.hook.spec.tsx`
  (assert `ViewState`, not `detailEntry` alone) and shell `handleKey` when the
  shell node is focused.

**Verify:** `bun test src/shell/renderer/hooks/list`

---

## Task 5: Optional fallback — main-process shortcuts (only if Task 1 proves need)

- [ ] Read `.cursor/electrobun-skill-routing.md` and **electrobun-native-ui**
  (or the skill it routes to for global shortcuts).
- [ ] Implement guarded shortcuts in main that forward to renderer only when no
  text field is focused (per [`requirements.md`](requirements.md) RNF-4).
- [ ] Document why fallback was required in PR / commit message.

**Verify:** manual + `bun test` (add main-side spec only if the repo already
tests main helpers this way; do not introduce flaky CEF in CI without an
existing pattern).

---

## Task 6: Quality gate

- [ ] `bun test`
- [ ] `bun run lint`
