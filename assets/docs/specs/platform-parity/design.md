<!-- markdownlint-disable-file -->

# macOS / Linux platform parity — Design

**Audit date:** 2026-06-01
**Scope:** `src/shell/main/`, handoff adapters, shell window chrome, parity tests.
**Normative feature specs:** [`entry-action-handoff/`](../entry-action-handoff/), [`shell-window-nav/`](../shell-window-nav/).

---

## Summary

Code audit shows **Linux is partially supported** but **not at parity** with macOS
for handoff. Some Linux paths were added (`xdotool` in terminal/paste) while **unit
tests still assert macOS-only errors** — a spec/code drift that hides regressions.
**Browser handoff** skips Linux frontmost-browser routing (acceptable fallback to
`Utils.openExternal` until WM_CLASS adapter lands).

All handoff adapters now have Linux paths: terminal/paste via `xdotool`, editor via
`gtk-launch` when `editorApp` is set, and `Utils.openPath`/`openExternal` as fallback.

---

## Parity matrix (2026-06-01 audit)

Status legend: **Done** = both platforms meet feature intent; **Partial** = Linux
best-effort or missing edge cases; **Gap** = Linux broken or macOS-only API; **N/A** = intentional platform delta.

| Capability                           | User surface           | macOS adapter                                                     | Linux adapter (current)                                           | Status             | Evidence                                                                   |
| ------------------------------------ | ---------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------- |
| Open URL (bookmark)                  | Footer / ⌘↵ primary    | `resolveFrontmostAppBundleId` + `open -b` or `Utils.openExternal` | `resolveFrontmostApp` → always `null` → `Utils.openExternal` only | **Partial**        | `browser_handoff.util.ts`                                                  |
| Open URL (known frontmost browser)   | Same                   | `open -b {bundleId}`                                              | Not implemented (design §Linux delta: WM_CLASS)                   | **Partial**        | `resolve_frontmost_app.util.ts` (darwin only)                              |
| Paste in terminal                    | Command primary        | AppleScript activate + ⌘V                                         | `xdotool search --name` + `ctrl+v`                                | **Partial**        | `terminal_handoff.util.ts`; requires `xdotool`; fragile window title match |
| Run in terminal                      | Command secondary      | AppleScript + ⌘V + Return                                         | `xdotool` activate + keys                                         | **Partial**        | same                                                                       |
| Paste doc (cheat)                    | Cheat primary          | System Events ⌘V                                                  | `xdotool key ctrl+v` (no focus activation)                        | **Partial**        | `paste_frontmost_handoff.util.ts`                                          |
| Open in editor (default)             | Shortcut / action      | `Utils.openPath`                                                  | `Utils.openPath`                                                  | **Done**           | `editor_handoff.util.ts`                                                   |
| Open in editor (named app)           | Settings `editorApp`   | `open -a {app} {path}`                                            | `gtk-launch {desktop-id} {path}` (via `Bun.spawnSync`)            | **Done**           | `editor_handoff.util.ts` linux branch                                      |
| Clipboard save/restore               | Registry               | `Utils.clipboardReadText/WriteText`                               | same                                                              | **Done**           | `electrobun_clipboard.port.ts`                                             |
| Hide on handoff / re-show on failure | Registry + main window | minimize / unminimize                                             | same                                                              | **Done**           | `handoff_registry.service.ts`, `main.ts`                                   |
| Global shortcut toggle               | ⌘⌃/ / Ctrl⌃/           | `GlobalShortcut` + `CommandOrControl`                             | same                                                              | **Done**           | `main.ts`                                                                  |
| Window cursor placement              | Launch position        | `Screen` + `resolveDisplayForPlacement`                           | same                                                              | **Done**           | `main.ts`, `placement.util.ts`                                             |
| Frameless / hidden title bar         | Shell chrome           | `titleBarStyle: 'hidden'`                                         | `titleBarStyle: 'default'`                                        | **N/A** (UX delta) | `shell_hooks.util.ts`                                                      |
| Window drag stripe                   | List shell             | RPC drag + CSS regions                                            | same (WebKitGTK limits documented)                                | **Partial**        | `use_window_drag.hook.ts`, `app_shell.css`                                 |
| Preview e2e handoff                  | Playwright             | Intercept RPC                                                     | same (no real OS paste)                                           | **Done**           | `entry_action_handoff.feature`                                             |
| Native hide after handoff            | Desktop only           | `@todo @native-handoff`                                           | `@todo @native-handoff`                                           | **Deferred**       | feature file L85–95                                                        |

---

## Electrobun native API survey (2026-06-01)

Revisited [Electrobun documentation](https://blackboard.sh/electrobun/docs/) (full corpus
aligned with [`electrobun-corpus-audit/report.md`](../electrobun-corpus-audit/report.md))
and project/global Electrobun skills (`electrobun-plugin-guide`, `electrobun-platform`,
`electrobun-core`, `electrobun-native-ui`, `electrobun-best-practices`, `electrobun-rpc`).

**Conclusion:** Electrobun provides **no native Linux API** to replace `xdotool` for
**cross-application** automation (activate external terminal, synthesize Ctrl+V/Return in
another app's window, detect Linux frontmost browser). Those operations sit outside the
framework surface — same class as macOS AppleScript / `open -a` / `open -b`, not Utils gaps.

### Handoff feature → Electrobun native option (Linux)

| Handoff need                           | Electrobun API                                                                                                                                                                                             | Linux native?     | kb today                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------- |
| Read/write clipboard for handoff       | [`Utils.clipboardReadText`](https://blackboard.sh/electrobun/docs/apis/utils) / `clipboardWriteText`                                                                                                       | **Yes**           | `electrobun_clipboard.port.ts`               |
| Open URL (default browser)             | [`Utils.openExternal`](https://blackboard.sh/electrobun/docs/apis/utils)                                                                                                                                   | **Yes**           | `browser_handoff.util.ts` fallback           |
| Open file (default app)                | [`Utils.openPath`](https://blackboard.sh/electrobun/docs/apis/utils)                                                                                                                                       | **Yes**           | `editor_handoff.util.ts` when no `editorApp` |
| Open file in named editor              | *None* — use `xdg-open` / desktop entry (OS), not Electrobun                                                                                                                                               | **No**            | `gtk-launch` on Linux; `open -a` on macOS    |
| Route URL to frontmost browser         | *None* on Linux (macOS uses bundle id + `open -b`)                                                                                                                                                         | **No**            | `Utils.openExternal` only                    |
| Paste into **external** focused app    | *None* — [`ApplicationMenu` `{ role: "paste" }`](https://blackboard.sh/electrobun/docs/apis/application-menu) applies only to **kb's focused webview**; **Linux application menus not supported** upstream | **No**            | `xdotool key ctrl+v`                         |
| Activate external terminal + paste/run | *None* — `BrowserWindow.focus()` focuses **kb windows only**                                                                                                                                               | **No**            | `xdotool search/windowactivate` + keys       |
| Detect frontmost external app          | *None* on Linux (darwin: osascript in adapter)                                                                                                                                                             | **No**            | `resolve_frontmost_app` returns null         |
| Re-show kb after failed handoff        | `BrowserWindow.unminimize()` / `focus()`                                                                                                                                                                   | **Yes**           | registry + `main.ts`                         |
| Global summon shortcut                 | [`GlobalShortcut`](https://blackboard.sh/electrobun/docs/apis/utils) (X11 `XGrabKey` on Linux)                                                                                                             | **Yes** (kb only) | `main.ts`                                    |
| Window placement                       | [`Screen`](https://blackboard.sh/electrobun/docs/apis/utils)                                                                                                                                               | **Yes**           | cursor display                               |

### Implications for platform-parity plan

1. **Keep `xdotool` for R3/R4** — not a Utils adoption miss; document as **required Linux
   dependency** with actionable install errors (already in adapters).
2. **Phase 2 editor gap** — prefer **`xdg-open`** (or `gtk-launch`), not Electrobun Utils;
   `Utils.openPath` only covers default-app open.
3. **Do not replace xdotool with ApplicationMenu paste** — paste role cannot target Terminal,
   browser, or editor outside kb.
4. **Wayland caveat** — upstream documents Linux `GlobalShortcut` as X11; `xdotool` is
   X11-only. Wayland users may need `ydotool`/portal-based flows — **out of Electrobun scope**;
   document as known limitation in manual dogfood (Phase 4), not a hidden Utils API.
5. **External tools Electrobun already documents** — Linux notifications use `notify-send`;
   parity spec should treat `xdotool` similarly (optional OS package, clear error UX).

### References

- [Utils API](https://blackboard.sh/electrobun/docs/apis/utils) — clipboard, openExternal, openPath, GlobalShortcut, Screen
- [Application Menu](https://blackboard.sh/electrobun/docs/apis/application-menu) — Edit roles; **Linux: menus not currently supported**
- [Creating UI](https://blackboard.sh/electrobun/docs/guides/creating-ui) — Edit menu enables ⌘C/⌘V **inside app webview only**
- [Cross-Platform Development](https://blackboard.sh/electrobun/docs/guides/cross-platform-development) — GTKWebKit vs CEF; no automation APIs
- [`electrobun-utils-adoption/design.md`](../electrobun-utils-adoption/design.md) — Utils scope explicitly excludes terminal/paste automation

---

## Known spec / test drift (Phase 1 targets)

| File                                   | Status (2026-06-01)                                                                                               | Remaining work                         |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `terminal_handoff.util.spec.ts`        | **Fixed** — Linux xdotool success/missing cases with injected `platform`                                          | None for Phase 1                       |
| `paste_frontmost_handoff.util.spec.ts` | **Fixed** — same pattern                                                                                          | None for Phase 1                       |
| `editor_handoff.util.spec.ts`          | **Fixed** — `platform` injection; Linux + `editorApp` via `gtk-launch` success/failure; win32 unsupported       | None for Phase 2                       |
| `browser_handoff.util.spec.ts`         | **Fixed** — explicit Linux/frontmost-null describe block added                                                   | None                                   |

---

## Target architecture

### Handoff adapters (unchanged layering)

```
handoff_registry.service.ts
  → browser_handoff.util.ts
  → terminal_handoff.util.ts
  → paste_frontmost_handoff.util.ts
  → editor_handoff.util.ts
  → electrobun_clipboard.port.ts
```

Each adapter **SHALL** branch on `platform` (injected in tests; `process.platform` in production):

```ts
type Platform = NodeJS.Platform

function handoffFn(..., platform: Platform = process.platform): HandoffResult
```

### Linux external-tool policy

| Tool                                    | Used for                         | Missing tool behavior                                      |
| --------------------------------------- | -------------------------------- | ---------------------------------------------------------- |
| `xdotool`                               | Terminal paste/run, cheat paste  | `{ ok: false, error: 'xdotool not found: …' }` + debug log |
| `Utils.openExternal` / `Utils.openPath` | Browser default, editor default  | Boolean false → `{ ok: false, error }`                     |
| `xdg-open` (or `gtk-launch`)            | Editor with `editorApp` on Linux | `gtk-launch {desktop-id} {path}` implemented                |

Document Linux package hint in error strings only (no installer automation in v1).

### Editor Linux adapter (normative)

When `editorApp` is set and `platform === 'linux'`:

1. Prefer `xdg-open` with env or args that select the desktop file for the named app, **or**
2. `gtk-launch {desktop-id} {filePath}` when config stores a `.desktop` id.

When unset: keep `Utils.openPath(filePath)`.

Do **not** call `open -a` on Linux.

### Browser Linux adapter (phased)

**Phase A (minimum):** Keep `Utils.openExternal` when frontmost resolution is null (current).

**Phase B (optional):** Implement design §Linux delta — read active window WM_CLASS, map to
known browser list, open via `xdg-open` with browser-specific command if matched.

Phase B is **Could** tier; Phase A satisfies R2.1.

### Logging

All catch/fallback paths **SHALL** log at **debug** via `getLogger(['kb', 'main', 'handoff', …])`
before returning fallback values (project logging policy).

---

## Testing strategy

| Layer       | Requirement                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| Unit        | Every adapter: table-driven cases per platform with **injected** `platform` and mocked I/O (`Bun.$`, `spawnSync`, `Utils`). |
| Unit        | Zero conditional `expect` on `process.platform`; zero `typeof result.ok` smoke tests.                                       |
| Integration | `handoff_registry.service.spec.ts` — clipboard restore + adapter failure per kind.                                          |
| E2e         | Existing `@spec:entry-action-handoff` preview intercept scenarios (platform-agnostic).                                      |
| Manual      | Phase 4 dogfood matrix: macOS + Linux (native shell) for terminal, cheat paste, editor named app.                           |

Shared test helper: `src/__tests__/helpers/testing.bun_dollar.mock.ts` (exported from `@testing`).

---

## Error handling

- Handoff adapters return discriminated `{ ok: true } | { ok: false, error: string }`.
- Registry maps failures to `{ ok: false, error, code }` and re-shows window.
- Linux missing-dependency errors **SHALL** include tool name and one-line install hint
  (e.g. `apt install xdotool` / `brew install xdotool` — detect not required).

---

## References

- [`entry-action-handoff/design.md`](../entry-action-handoff/design.md) §Electrobun vs external automation — normative handoff rationale (this survey is the evidence)
- [`entry-action-handoff/design.md`](../entry-action-handoff/design.md) §Terminal, §Cheat paste, §Browser Linux delta
- [`electrobun-utils-adoption/design.md`](../electrobun-utils-adoption/design.md)
- [`assets/guides/TESTING_GUIDE.md`](../../../guides/TESTING_GUIDE.md) §Better Specs
- [`assets/guides/ELECTROBUN.md`](../../../guides/ELECTROBUN.md)
