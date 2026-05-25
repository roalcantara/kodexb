<!-- markdownlint-disable-file -->

# app — Shell window chrome, placement, and detail navigation

## Summary

Normative design for three related desktop-shell concerns:

1. **ArrowLeft in full detail** — `←` must always retreat from full detail to split (same `detailEntry`), matching on-screen copy (“← / Escape to close”) and the list → split → detail ladder.
2. **Initial window placement** — The main window must not open pinned at `(0, 0)`; it opens **centered** in the **primary display work area** for the default width and height, unless a future persisted-bounds path overrides (out of scope unless implemented in the same change set).
3. **Frameless / borderless chrome** — The main window must not show a standard titled macOS bar for the shipped look; prefer **native frameless** where Electrobun supports it, with an explicit **fallback** (e.g. hidden title bar style + in-window drag region) if `frame: false` is rejected or unstable.

Visual reference (non-normative mock): [`prototype-shell-states.html`](prototype-shell-states.html).

Related prior note: [`../renderer-nav-flow/handoff.md`](../renderer-nav-flow/handoff.md) (document-level key listeners vs Electrobun webview).

## Platform scope

- **In scope:** **macOS** and **Linux** only. **Windows is not supported** for this product.
- **Shipping order:** **macOS first** until all three behaviors are verified in an Electrobun dev build. **Linux second** with best-effort parity using the same `BrowserWindow` / `Screen` APIs Electrobun exposes; any gap is documented in the implementation plan (no blocking macOS on Linux unknowns).

## Requirements

### R1 — ArrowLeft from full detail

- When `viewState === 'detail'` and `detailEntry !== null`, a **Left** arrow key press must invoke the same **`retreat()`** path as today’s reducer (transition to `split` without clearing `detailEntry`).
- Behavior must not depend on focus living on the list surface; it must work when focus is inside the detail panel (markdown, buttons, or neutral focus), except while the user is typing in a **visible** `input` / `textarea` or a **contentEditable** field (existing guard remains).
- **Escape** continues to mean “close detail to list” via existing `closeToList` / UI affordances where applicable; this design does not redefine Escape.

### R2 — Centered initial placement

- On first show, the main `BrowserWindow` frame’s `x` / `y` must place the **default** width and height **centered** within the primary display’s **usable work area** (excluding menu bar / dock where the OS reports that), with integer coordinates clamped so the window stays fully on-screen when possible.
- If `Screen.getPrimaryDisplay()` (or the Electrobun equivalent) is unavailable or returns unusable data, **fallback:** keep current explicit size but use a safe default position (e.g. `(100, 100)`) and log once at debug level — never `(0, 0)` unless the work area genuinely starts at zero.

### R3 — Frameless / borderless

- Target appearance: no separate native title bar strip as in the current production screenshot; content extends to the window edge with optional rounded corners per platform.
- **Primary implementation:** use Electrobun `BrowserWindow` options that yield an undecorated or hidden-title-bar window on macOS, verified on **`electrobun` ^1.18.1** (or whatever the repo pins at implementation time).
- **Historical constraint:** commit `2f206df` (“Revert frameless, unsupported in version”) must be treated as **stale evidence** until re-verified; if `frame: false` (or equivalent) still fails at runtime, use the documented fallback and record the exact error string in the plan appendix.
- **Renderer follow-up when frameless:** a **drag region** at the top of the shell (CSS `-webkit-app-region: drag` where supported) and **`no-drag`** on interactive controls so search, rows, and buttons remain clickable. Linux: same pattern best-effort; document WM quirks if any.

### R4 — Modals and overlays

- ArrowLeft / ArrowRight navigation must **not** run when a modal overlay that owns keyboard focus should win (e.g. Cmd+K palette open, settings host open, task sheet open). The implementation plan wires explicit “suppress nav” flags from existing shell state.

## Architecture

### Renderer (`src/shell/renderer/`)

- **Single handler:** Keep **`handleKey`** in `use_view_navigation.hook.ts` as the only place that mutates view state for horizontal arrows.
- **Delivery:** Retain React **`onKeyDownCapture`** on the main list shell container. Add a **`window`**-level **`keydown` capture** listener (registered in the list page shell or a dedicated hook co-located with view navigation) that delegates to the same `handleKey` when navigation is not suppressed, so keys still reach logic when the Electrobun webview focus model skips the React subtree. Register and remove the listener in a `useEffect` cleanup to avoid leaks.
- **Suppression:** Listener checks `palette.open`, `showSettings`, `taskSheetVisible` (or equivalent booleans from `useListPageShell` / `ListMain`) and returns early without calling `handleKey`.

### Main (`src/shell/main/`)

- **Placement:** Before `win.show()`, compute `frame: { x, y, width, height }` using `Screen.getPrimaryDisplay()` work area and default width/height. Prefer a **pure** helper (e.g. `centerBoundsInWorkArea` in `src/shell/main/window/placement.util.ts`) plus unit tests with fake work-area rectangles.
- **Chrome:** Extend `BrowserWindow` construction in `main.ts` with frameless or `titleBarStyle` options per verified API. Optional `transparent` / vibrancy stays off unless design requires it.

## Testing

| Layer      | What                                                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit       | `placement.util.spec.ts` — centering math, clamping, odd sizes.                                                                                                                                            |
| Unit / RTL | Extend `use_view_navigation.hook.spec.tsx` or add `list_main.component.spec.tsx` — simulate `keydown` on a **non-listbox** focus target inside the shell while `viewState === 'detail'`, expect `retreat`. |
| E2E        | Keep `e2e/preview_list_nav.e2e.spec.ts` green; optionally add a case with focus on a detail-region test id if the preview app exposes one.                                                                 |
| Manual     | Electrobun dev on macOS: full detail → ArrowLeft → split; Linux same after macOS sign-off.                                                                                                                 |

## Out of scope (unless bundled in same PR explicitly)

- Persisting window bounds across sessions (`window/state.ts` already exists but is not wired in `main.ts` today).
- Resizing below minimum size or multi-window placement.
- Windows support.

## References

- `src/shell/main/main.ts` — window creation.
- `src/shell/renderer/components/list/list_main.component.tsx` — capture handler, layout classes.
- `src/shell/renderer/hooks/list/use_view_navigation.hook.ts` — `handleKey`, `retreat`.
- `src/shell/main/window/state.ts` — persisted bounds types (future).
- Prototype: [`prototype-shell-states.html`](prototype-shell-states.html).
- Implementation plan: [`implementation-plan.md`](implementation-plan.md).
