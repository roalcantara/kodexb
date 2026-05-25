# Shell window chrome, placement, and detail navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship centered frameless (or best fallback) main window on macOS first, with ArrowLeft reliably retreating from full detail to split; Linux best-effort parity afterward.

**Architecture:** Pure placement helper in `src/shell/main/window/` for `x`/`y`; `main.ts` uses `Screen.getPrimaryDisplay()` from `electrobun/bun` before `show()`. Renderer adds a `window` `keydown` capture listener that forwards ArrowLeft/ArrowRight to existing `handleKey` when modals are closed, alongside the existing React capture on `kb-powertoys`.

**Tech stack:** Bun, Electrobun (`electrobun/bun`), React 19, `bun:test`, Playwright preview E2E.

**Canonical path:** This file lives next to the feature design under `assets/docs/specs/shell-window-nav/` (kb does not use `docs/superpowers/`).

---

## File map

| File                                                                             | Responsibility                                                                                                                                       |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shell/main/window/placement.util.ts`                                        | Pure: given work area + width/height, return centered `{ x, y, width, height }`.                                                                     |
| `src/shell/main/window/placement.util.spec.ts`                                   | Unit tests for placement util.                                                                                                                       |
| `src/shell/main/main.ts`                                                         | Import `Screen`, compute frame, set `BrowserWindow` frameless / `titleBarStyle` options.                                                             |
| `src/shell/main/main.spec.ts`                                                    | Extend if needed for placement helper imports only (keep main.ts thin).                                                                              |
| `src/shell/renderer/hooks/list/use_view_navigation.hook.ts`                      | Optionally export a tiny wrapper; likely unchanged except if deduplicating key guard.                                                                |
| `src/shell/renderer/hooks/list/use_window_view_nav_keys.hook.ts` **(new)**       | `useEffect` registers `window` capture `keydown`; calls injected `handleKey`; cleanup on unmount.                                                    |
| `src/shell/renderer/hooks/list/use_window_view_nav_keys.hook.spec.tsx` **(new)** | Listener calls `handleKey` when shell-focused mock div fires; does not fire when `disabled` true.                                                    |
| `src/shell/renderer/hooks/list/use_list_page_shell.hook.ts`                      | Compose new hook with `handleKey` + suppression flags from palette / task sheet / settings — or pass-through props if hook lives in `ListMain` only. |
| `src/shell/renderer/components/list/list_main.component.tsx`                     | Wire suppression booleans into window hook.                                                                                                          |
| `src/shell/renderer/styles/list.css` (or shell CSS)                              | `-webkit-app-region: drag` strip + `no-drag` on interactive elements when frameless.                                                                 |
| `electrobun.config.ts`                                                           | Only if platform defaults require mac/linux keys (often unchanged).                                                                                  |

---

### Task 1: Placement math (pure)

**Files:**

- Create: `src/shell/main/window/placement.util.ts`
- Create: `src/shell/main/window/placement.util.spec.ts`

- [ ] **Step 1: Write `placement.util.ts`**

```typescript
export type WorkArea = { x: number; y: number; width: number; height: number }

export type WindowFrame = { x: number; y: number; width: number; height: number }

/** Centers `width`×`height` inside `work`; clamps so the frame stays inside work when larger than work. */
export function centerFrameInWorkArea(work: WorkArea, width: number, height: number): WindowFrame {
  const w = Math.min(width, work.width)
  const h = Math.min(height, work.height)
  const x = work.x + Math.max(0, Math.floor((work.width - w) / 2))
  const y = work.y + Math.max(0, Math.floor((work.height - h) / 2))
  return { x, y, width: w, height: h }
}
```

- [ ] **Step 2: Write `placement.util.spec.ts`**

Cover: square work area + even size; odd work area width; window larger than work (clamp size and position); work area with non-zero `x`/`y`.

- [ ] **Step 3: Run tests**

Run: `bun test src/shell/main/window/placement.util.spec.ts`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/shell/main/window/placement.util.ts src/shell/main/window/placement.util.spec.ts
git commit -m "feat(shell): add window centering placement util"
```

---

### Task 2: Main process — center + Screen

**Files:**

- Modify: `src/shell/main/main.ts`
- Modify: `src/shell/main/main.spec.ts` if imports need updating (optional)

- [ ] **Step 1: Read Electrobun `Screen` shape**

Run: `rg "getPrimaryDisplay" node_modules/electrobun -n` (or open type defs under the resolved package). Confirm property names for work area (`workArea` vs `bounds`).

- [ ] **Step 2: Wire `main.ts`**

After `const DEFAULT_WIDTH` / `DEFAULT_HEIGHT`, before `new BrowserWindow`:

```typescript
import { BrowserWindow, Screen, Utils } from 'electrobun/bun'
import { centerFrameInWorkArea } from './window/placement.util'

// inside bootstrap(), before new BrowserWindow:
let initialFrame = { x: 100, y: 100, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
try {
  const primary = Screen.getPrimaryDisplay()
  const wa = primary.workArea ?? primary.bounds
  if (wa && wa.width > 0 && wa.height > 0) {
    initialFrame = centerFrameInWorkArea(
      { x: wa.x, y: wa.y, width: wa.width, height: wa.height },
      DEFAULT_WIDTH,
      DEFAULT_HEIGHT
    )
  }
} catch {
  // keep fallback initialFrame
}

win = new BrowserWindow({
  title: 'kb',
  url: 'views://shell/index.html',
  frame: initialFrame,
  rpc: kbWebviewRpc
})
```

Adjust `wa` access to match real `Screen` API from Step 1.

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 4: Manual smoke (macOS)**

Run: `bun dev` — window should appear centered, not top-left.

- [ ] **Step 5: Commit**

```bash
git add src/shell/main/main.ts
git commit -m "feat(shell): center main window on primary display"
```

---

### Task 3: Frameless `BrowserWindow` (macOS first)

**Files:**

- Modify: `src/shell/main/main.ts`
- Possibly: `electrobun.config.ts`

- [ ] **Step 1: Spike options**

Add to `BrowserWindow` options (exact names from Electrobun 1.18.x types), e.g.:

```typescript
titleBarStyle: 'hiddenInset',
transparent: false,
```

Or `frame: false` if the constructor accepts a boolean alongside or instead of rect — **do not guess**; match the type definition.

If runtime throws or window is unusable, revert to `titleBarStyle: 'hiddenInset'` only and document in commit body.

- [ ] **Step 2: Renderer drag region**

In shell header / `list.css`, add a top strip (e.g. `.kb-windowDrag`) with:

```css
.kb-windowDrag {
  -webkit-app-region: drag;
}
.kb-windowDrag button,
.kb-windowDrag input,
.kb-pt-search,
.kb-pt-results {
  -webkit-app-region: no-drag;
}
```

Tune selectors so list rows and search are `no-drag`. Verify click targets still work.

- [ ] **Step 3: Manual smoke macOS**

Drag window from top strip; resize; verify traffic-light region if inset style leaves system buttons.

- [ ] **Step 4: Linux pass**

Repeat `bun dev` on Linux; if title bar options differ, gate with `process.platform === 'darwin'` vs `linux` and use documented Linux defaults.

- [ ] **Step 5: Commit**

```bash
git add src/shell/main/main.ts src/shell/renderer/styles/list.css
git commit -m "feat(shell): frameless chrome and drag region"
```

---

### Task 4: Window-level ArrowLeft / ArrowRight capture

**Files:**

- Create: `src/shell/renderer/hooks/list/use_window_view_nav_keys.hook.ts`
- Create: `src/shell/renderer/hooks/list/use_window_view_nav_keys.hook.spec.tsx`
- Modify: `src/shell/renderer/hooks/list/use_list_page_shell.hook.ts` **or** `list_main.component.tsx` (pick one ownership; prefer shell hook composition)

- [ ] **Step 1: Implement hook**

```typescript
import { useEffect } from 'react'

export type WindowViewNavKeysOpts = {
  disabled: boolean
  handleKey: (e: KeyboardEvent) => void
}

export function useWindowViewNavKeys({ disabled, handleKey }: WindowViewNavKeysOpts): void {
  useEffect(() => {
    if (disabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      handleKey(e)
      if (e.defaultPrevented) e.stopPropagation()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [disabled, handleKey])
}
```

**Important:** `handleKey` from `useViewNavigation` is stable via `useCallback`, but wrapping in shell must not change semantics. Map `KeyboardEvent` to the shape `handleKey` expects (`preventDefault`, `target`, `key`) — native `KeyboardEvent` is compatible.

- [ ] **Step 2: Wire `disabled`**

`disabled = showSettings || p.taskSheetVisible || p.palette.open` (use exact names from `useListPageShell` / props passed to `ListMain`).

- [ ] **Step 3: RTL spec**

Render a test harness with `useWindowViewNavKeys`, `disabled: false`, mock `handleKey` counting ArrowLeft. `fireEvent.keyDown(window, …)` may not hit window listener — use `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))` in capture phase or dispatch on `document`. Assert mock called once; with `disabled: true`, assert zero calls.

- [ ] **Step 4: Run tests**

Run: `bun test src/shell/renderer/hooks/list/use_window_view_nav_keys.hook.spec.tsx`
Run: `bun test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/shell/renderer/hooks/list/use_window_view_nav_keys.hook.ts src/shell/renderer/hooks/list/use_window_view_nav_keys.hook.spec.tsx
git commit -m "feat(renderer): window capture for view nav keys"
```

---

### Task 5: Integration verification

- [ ] **Step 1: E2E**

Run: `bunx playwright test e2e/preview_list_nav.e2e.spec.ts` (or `mise run` equivalent if defined).
Expected: pass.

- [ ] **Step 2: Full test + lint**

Run: `bun test`
Run: `bun run lint:biome`
Expected: clean.

- [ ] **Step 3: Electrobun manual (macOS)**

Full detail → ArrowLeft → split with focus inside detail body (click markdown first).
Palette open → ArrowLeft must not change view state.

- [ ] **Step 4: Final commit** (if only doc tweaks remain)

Merge or squash per team convention.

---

## Appendix — `Screen` field names

After Task 2 Step 1, paste the observed `Screen.getPrimaryDisplay()` shape into the PR description (or extend `placement.util.spec.ts` with a comment) so Linux QA uses the same field names as macOS.
