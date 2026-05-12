<!-- markdownlint-disable-file -->
# kb — Navigation Flow: Handoff Document

## Bug

ArrowRight/ArrowLeft keyboard navigation stops working after detail panel opens and closes.
Specifically: ArrowRight → split view opens → ArrowLeft closes → ArrowRight **does not** reopen.

## Root cause analysis

The keyboard handler lives at `document.addEventListener('keydown', handler, true)` in
`src/shell/renderer/hooks/list/use_view_navigation.hook.ts`. During testing in Happy-DOM
(Bun's test environment), `document.dispatchEvent(new KeyboardEvent(...))` fires the
capture-phase listener and tests pass (368/368).

In the real Electrobun webview browser, the capture-phase listener fires inconsistently
when focus is on `document.body` (which happens after the DetailPage component unmounts).

## What works

| Artifact | Status | Notes |
|----------|--------|-------|
| `view_reducer.ts` | ✅ | Pure state machine, 9 transitions, 9 tests pass |
| `view_reducer.spec.ts` | ✅ | Isolated unit tests for list↔split↔detail |
| `use_view_navigation.hook.ts` | ⚠️ | Hook logic correct, but capture-phase listener unreliable in webview |
| `use_list_selection.hook.ts` | ✅ | ArrowUp/Down only, 3 params, clean |
| HTML simulator | ✅ | `tools/test/nav-simulator.html` — standalone, confirms state machine |
| 368 unit tests | ✅ | All pass including ArrowRight/ArrowLeft cycle tests |

## What has been tried (and failed)

1. **React `onKeyDown` on root div** — fails when focus leaves the React tree (detail unmount → focus → body)
2. **`window.addEventListener('keydown', ...)`** — Happy-DOM doesn't support `window.dispatchEvent`
3. **`document.addEventListener('keydown', handler, true)` (capture)** — works in Happy-DOM tests, unreliable in browser
4. **`document.addEventListener('keydown', handler, false)` (bubble)** — same issue
5. **React `onKeyDown` on root div + native document listener** — double-registration, still fails in browser

## Files involved

| File | Role |
|------|------|
| `src/shell/renderer/hooks/list/view_reducer.ts` | Pure state machine |
| `src/shell/renderer/hooks/list/use_view_navigation.hook.ts` | Hook with document-level listener |
| `src/shell/renderer/hooks/list/use_list_selection.hook.ts` | List surface: ArrowUp/Down only |
| `src/shell/renderer/hooks/list/use_list_page_shell.hook.ts` | Shell composition |
| `src/shell/renderer/components/list/list_main.component.tsx` | Renders view based on `detailEntry` |
| `tools/test/nav-simulator.html` | Standalone HTML to verify state machine |

## Test commands

```bash
# All tests
bun test

# Navigation-specific tests
bun test src/shell/renderer/hooks/list/view_reducer.spec.ts
bun test src/shell/renderer/hooks/list/use_list_selection.hook.spec.ts

# Build
bun run build

# Dev
bun dev

# Open HTML simulator
open tools/test/nav-simulator.html
```

## Approaches to try

### Option A: KeyboardEvent constructor + dispatch on the list surface element

Instead of `document.addEventListener`, get a ref to the list surface div and dispatch native
`KeyboardEvent` directly on it when ArrowRight/ArrowLeft is pressed. Requires intercepting
keydown at the `<body>` level and re-dispatching on the surface.

```ts
// Pseudo-code
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') {
    const surface = listSurfaceRef.current
    if (surface) {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      surface.dispatchEvent(event)
    }
  }
}, false)
```

### Option B: Use `@testing-library/user-event` patterns for keyboard simulation

The test that works uses `userEvent.keyboard('{ArrowRight}')`. Research how `userEvent` dispatches
events and apply the same mechanism to the production code.

### Option C: Polling-based focus restoration

After detail close, use `requestAnimationFrame` + `focus()` on the list surface element.
This ensures focus is on the surface before the next keypress.

```ts
useEffect(() => {
  if (!detailEntry) {
    requestAnimationFrame(() => {
      listSurfaceRef.current?.focus()
    })
  }
}, [detailEntry])
```

### Option D: Electrobun in-window shortcut

Register ArrowRight/ArrowLeft as Electrobun window-level shortcuts using the `globalShortcut`
API from `electrobun/bun`. This bypasses browser focus entirely.

```ts
// In main.ts
globalShortcut.register('ArrowRight', () => {
  win?.webview.rpc.send.advanceView()
})
```

### Option E: Upgrade to Playwright E2E tests

Install Playwright and write E2E tests against the preview server. The preview server already
works as a real HTTP server for the renderer bundle. This gives a real browser environment
where keyboard events behave correctly.

```bash
bun tools/preview/server.ts  # starts on :3456
npx playwright test tools/test/nav-flow.spec.ts
```

## Quick start

```bash
cd /Users/roalcantara/Work/bun/kb
bun test                          # 368 pass, confirms logic works
open tools/test/nav-simulator.html # Standalone state machine demo
bun dev                           # See the real app
```
