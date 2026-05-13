<!-- markdownlint-disable-file -->
# Renderer — List / Split / Detail Keyboard Navigation — Design

## OVERVIEW

Restore reliable **ArrowRight** / **ArrowLeft** navigation in the Electrobun
webview after the detail panel closes. The **view state machine** in
`view_reducer.util.ts` stays the source of truth; this work fixes **event delivery
and focus** so user input reaches the handlers.

**Context archive:** prior notes in [`handoff.md`](handoff.md).

---

## ROOT CAUSE HYPOTHESIS (TO VERIFY)

`document.addEventListener('keydown', …, true)` behaves consistently in
Happy-DOM tests but **not** in the real webview when focus lands on
`document.body` after detail unmounts. The fix must not rely solely on that
path.

**Verification:** before any main-process fallback, log in dev build: event
target, phase, and `document.activeElement` after close — confirm whether
document capture fires.

---

## DECISIONS

| Topic                    | Decision                                                                                                                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary strategy         | **Renderer-first:** handle ArrowRight/Left on the **list surface** `onKeyDown` (same path as ArrowUp/Down), or on a **single focusable shell** (`tabIndex={-1}`) if portaled detail breaks surface targeting.                                                                                    |
| Document listener        | **Remove** `document` capture listener for ArrowRight/Left once the renderer-first path is verified, to avoid double handling.                                                                                                                                                                   |
| Focus after detail close | Extend `list_main.component.tsx` effect: after `detailEntry` clears, restore focus using **`queueMicrotask` + double `requestAnimationFrame`** (or `setTimeout(0)` if needed), then call existing `focusListSurface`. If `activeElement` is still not the surface, **retry once** on next frame. |
| Input guard              | Reuse the same guard as today: ignore navigation when `event.target` is `HTMLInputElement`, `HTMLTextAreaElement`, or `contenteditable`.                                                                                                                                                         |
| Fallback                 | **Main-process global shortcuts** only if verification proves keys never reach the renderer surface; follow `.cursor/electrobun-skill-routing.md` and the **electrobun-native-ui** skill. Shortcuts **must** check “typing in field” before firing (see requirements RNF-4).                     |

---

## FILES (EXPECTED TOUCH SET)

| File                                                         | Change                                                                                                                                                                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shell/renderer/hooks/list/use_view_navigation.hook.ts`  | Remove document-level ArrowRight/Left listener once logic moves; keep reducer + `advance` / `retreat` / `closeToList`.                                                                                                                 |
| `src/shell/renderer/hooks/list/use_list_selection.hook.ts`   | Extend `onListKeyDown` to call `advance` / `retreat` with the same key rules and input guard.                                                                                                                                          |
| `src/shell/renderer/components/list/list_main.component.tsx` | Strengthen post-close focus restore (see DECISIONS). Register **`onKeyDown={handleKey}`** on the **`kb-powertoys`** root so ArrowRight/Left still run when focus is inside the shell (e.g. full detail), not only on the list surface. |
| `src/shell/renderer/utils/list/list_surface_focus.util.ts`   | Optional: add `focusListSurfaceRobust` if logic grows; otherwise keep helpers minimal.                                                                                                                                                 |
| `src/shell/main/main.ts` (fallback only)                     | Register global shortcuts + RPC/message to renderer — **only** if RNF-4 triggered.                                                                                                                                                     |

---

## BEHAVIOUR CONTRACT

- **View ladder:** `ADVANCE` / `RETREAT` from `view_reducer.util.ts` define
  **list → split → detail** and **detail → split → list**. Users may traverse
  this ladder in any valid alternation (see requirements RNF-2b); each key
  applies at most one transition.
- **ArrowRight:** when `viewState !== 'detail'`, call `advance()` (existing
  semantics from `use_view_navigation`).
- **ArrowLeft:** when `detailEntry !== null`, call `retreat()` (existing
  semantics). (`detailEntry` is cleared only when retreating from **split** to
  **list**; in **split** and **detail** it stays set so the same entry backs the
  detail column.)
- **Close-to-list:** `closeToList()` dispatches `CLOSE_TO_LIST` and clears
  `detailEntry`. UI paths that dismiss the detail panel entirely (close button,
  etc.) **SHALL** call `closeToList()` (not raw `setDetailEntry(null)`) so
  `viewState` stays aligned with `detailEntry`.

---

## LAYOUT (list page)

`list_main.component.tsx` **SHALL** read `viewState` from selection (not
`detailEntry` alone):

- **`list`:** list panel full width; no detail column; search row visible;
  footer visible.
- **`split`:** list panel `kb-pt-list-panel--narrow`; detail in `kb-pt-detail`;
  search row visible; footer visible.
- **`detail`:** list panel `kb-pt-list-panel--hidden`; detail uses
  `kb-pt-detail--full`; **search row hidden** (`kb-pt-search--hidden`) so the
  main column uses the vertical space above the footer; **footer stays visible**.
  The main + detail stack **SHALL** use flex `min-height: 0` and `overflow-y:
  auto` on the detail host so long entries scroll while the footer remains
  pinned.

Horizontal navigation (`handleKey`) **SHALL** run on **`kb-powertoys`**
`onKeyDownCapture` so ArrowLeft/ArrowRight still apply when focus is inside the
detail body (capture runs before inner handlers consume the event).

---

## TESTING STRATEGY

- Update or add specs under `src/shell/renderer/hooks/list/*.spec.tsx` so
  keyboard events are dispatched with the same **capture-on-shell** pattern as
  production (wrapper `onKeyDownCapture` + list surface `onKeyDown` for
  vertical arrows only).
- Keep `view_reducer.util.spec.ts` unchanged unless reducer changes.
- Add `use_view_navigation.hook.spec.tsx` to assert `ViewState` through multi-step
  ladders (split vs full detail share `detailEntry`; only `viewState` tells them
  apart in tests).

---

## RISKS

- **Double events:** if both document and surface handlers exist briefly, keys
  may double-advance — remove document listener in the same PR as surface
  handling.
- **Portaled detail:** if detail renders outside the list subtree, surface-only
  keys may miss while detail is focused; mitigate with **`kb-powertoys`**
  `onKeyDownCapture` for ArrowLeft/ArrowRight (see LAYOUT).
