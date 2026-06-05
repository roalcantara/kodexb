<!-- markdownlint-disable-file -->

# Entry action handoff — design

Normative technical contract. Requirements: [requirements.md](requirements.md).

## Reference — arkn (normative UX)

Port behavior from the Raycast extension **arkn** (sibling repo). Canonical sources:

| Concern                                   | File                                                 |
| ----------------------------------------- | ---------------------------------------------------- |
| Type-specific + shared actions, shortcuts | `arkn/src/ui/components/entry.actions.component.tsx` |
| Browser / terminal OS handoff             | `arkn/src/ui/helpers/actions.helper.ts`              |
| Known browser bundle ids                  | `COMMON_APPS` in `actions.helper.ts`                 |
| Preferences                               | `terminal_app`, `editor_app` in `arkn/package.json`  |

kb **shall not** re-decide primary/secondary semantics; implement the table in §Action catalog.

### Reproduce arkn (normative)

| #   | Behavior | arkn                                                                           | kb                                          |
| --- | -------- | ------------------------------------------------------------------------------ | ------------------------------------------- |
| 1   | Browser  | frontmost known bundle → `open(url, bundleId)`; else default; hide before open | Same; **no** post-open activate nudge       |
| 2   | Terminal | clipboard cycle + activate by name + 0.5s + ⌘V (+ Return for run) in **main**  | Same                                        |
| 3   | Retreat  | `closeMainWindow` before external handoff                                      | `hide()` before handoff; re-show on failure |

### Intentional kb delta (only)

| #   | arkn                                          | kb                                                                                   |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| 4   | `terminal_app` **required** — throws if unset | `terminalApp` **optional** — OS default terminal name when unset (§Terminal handoff) |

---

## Field mapping (kb ↔ arkn)

| arkn field                 | kb field         | Notes                                       |
| -------------------------- | ---------------- | ------------------------------------------- |
| `title`                    | `key`            | YAML key; for bookmarks kb `key` is the URL |
| `desc`                     | `desc`           | Optional description                        |
| `url`                      | `key` (bookmark) |                                             |
| `cmd`                      | `key` (command)  |                                             |
| `cheat`                    | `doc` (cheat)    |                                             |
| `source` / `sourcePathURI` | `source`         | Edit source target                          |

---

## Overview

**Approach 1 — main-process handoff registry:** Renderer calls Eden Treaty RPC; main process runs **`runEntryHandoff`**, porting arkn `ActionsHelper` + dismiss semantics (`hide()` ≈ `closeMainWindow`).

On **success**, kb **hides**. On **failure**, kb **stays visible** + error toast (optional primary action: copy payload to clipboard).

```text
Renderer executeEntryAction / RPC
        ↓
runEntryHandoff(actionId, payload)
        ↓
arkn-equivalent adapter (browser | terminal | paste-frontmost | editor)
        ↓
success → hide()     |     failure → toast, no hide
```

---

## Architecture

| Layer                | Artifact                          | Role                                                         |
| -------------------- | --------------------------------- | ------------------------------------------------------------ |
| `core/handoff`       | `known_browsers.const.ts`         | Port `COMMON_APPS` bundle ids + display names                |
| `shell/main/handoff` | `handoff_registry.service.ts`     | Pipeline, focus guard, hide, clipboard restore orchestration |
| `shell/main/handoff` | `browser_handoff.util.ts`         | Frontmost browser + `open(url, bundleId?)`                   |
| `shell/main/handoff` | `terminal_handoff.util.ts`        | `pasteCommand` / `executeCommand` port                       |
| `shell/main/handoff` | `paste_frontmost_handoff.util.ts` | Cheat paste (System Events ⌘V)                               |
| `shell/main/handoff` | `editor_handoff.util.ts`          | Open source with `editorApp`                                 |
| `shell/main/window`  | `external_focus_handoff.util.ts`  | Hide retreat + blur guard                                    |
| `renderer/actions`   | panel + global shortcuts          | arkn ActionPanel shape                                       |

**Forbidden:** renderer importing shell handoff adapters.

### Electrobun vs external automation (Linux rationale)

Handoff adapters use **Electrobun `Utils` where the official API exists** (clipboard,
`openExternal`, `openPath`) per [`electrobun-utils-adoption`](../electrobun-utils-adoption/design.md).
**Cross-application** automation (paste into Terminal, paste into frontmost app, activate
an external terminal window) has **no Electrobun equivalent on Linux** — same boundary as
macOS AppleScript / `open -a` / `open -b`.

Survey (docs + skills, 2026-06-01): [`platform-parity/design.md` §Electrobun native API survey](../platform-parity/design.md#electrobun-native-api-survey-2026-06-01).

| Need                               | Electrobun native on Linux?                                                                                                                                                                             | kb adapter                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Clipboard save/restore             | **Yes** — `Utils.clipboardReadText` / `clipboardWriteText`                                                                                                                                              | `electrobun_clipboard.port.ts`                                                                                                |
| Open URL (default browser)         | **Yes** — `Utils.openExternal`                                                                                                                                                                          | `browser_handoff.util.ts` fallback                                                                                            |
| Open file (default app)            | **Yes** — `Utils.openPath`                                                                                                                                                                              | `editor_handoff.util.ts` when `editorApp` unset                                                                               |
| Open file in named editor          | **No** — use `xdg-open` / desktop entry (OS)                                                                                                                                                            | darwin: `open -a`; linux: `gtk-launch` (see [platform-parity §Phase 2](../platform-parity/design.md#editor-linux-adapter-normative)) |
| Paste into external app / terminal | **No** — `ApplicationMenu` `{ role: "paste" }` applies only to **kb's focused webview**; [upstream: Linux application menus not supported](https://blackboard.sh/electrobun/docs/apis/application-menu) | `xdotool` on Linux; AppleScript on macOS                                                                                      |
| Activate external terminal + keys  | **No** — `BrowserWindow.focus()` focuses **kb windows only**                                                                                                                                            | `xdotool search` / `windowactivate` + `key`                                                                                   |
| Frontmost browser bundle routing   | **No** on Linux                                                                                                                                                                                         | `Utils.openExternal` until WM_CLASS adapter (optional)                                                                        |

**Normative:** Do **not** remove Linux `xdotool` paths expecting a hidden Electrobun API.
Treat `xdotool` like upstream documents `notify-send` for notifications — optional OS
package with actionable install errors when missing. Wayland/X11 limits: see platform-parity
survey (X11-only `xdotool`; `GlobalShortcut` on Linux is also X11 per [Utils](https://blackboard.sh/electrobun/docs/apis/utils)).

---

## Action catalog (normative)

### Action ids (`entry_action_ids.const.ts`)

**Add:** `paste-doc`, `run-terminal`, `copy-title`, `copy-desc`

**Remove from handoff scope:** `copy-doc` as cheat primary (replaced by `paste-doc`)

**Rename intent:** `execute-terminal` → **`run-terminal`** (label **Run in Terminal**)

### `bookmark`

| id            | label            | rank    | handoff         |
| ------------- | ---------------- | ------- | --------------- |
| `open-url`    | Open In Browser  | primary | browser         |
| `copy-title`  | Copy Title       | —       | clipboard (⌘C)  |
| `copy-desc`   | Copy Description | —       | clipboard (⌘⌥C) |
| `open-editor` | Open Source      | —       | editor (⌘O)     |

No secondary (⌘Return) rank — arkn has one type-specific action only.

### `command`

| id                                         | label             | rank      | handoff          |
| ------------------------------------------ | ----------------- | --------- | ---------------- |
| `paste-terminal`                           | Paste in Terminal | primary   | terminal-paste   |
| `run-terminal`                             | Run in Terminal   | secondary | terminal-run     |
| `copy-title` / `copy-desc` / `open-editor` | (shared)          | —         | global shortcuts |

### `cheat`

| id                                         | label     | rank    | handoff         |
| ------------------------------------------ | --------- | ------- | --------------- |
| `paste-doc`                                | Paste Doc | primary | paste-frontmost |
| `copy-title` / `copy-desc` / `open-editor` | (shared)  | —       | global          |

No secondary rank.

### `task`

| id                                         | label        | rank      | handoff                            |
| ------------------------------------------ | ------------ | --------- | ---------------------------------- |
| `edit-task`                                | Edit Task    | primary   | in-app                             |
| `cycle-status`                             | Cycle Status | secondary | in-app (dynamic label optional v2) |
| `copy-title` / `copy-desc` / `open-editor` | (shared)     | —         | global                             |

### `shortcut` (kb-only)

| id            | label          | rank                 |
| ------------- | -------------- | -------------------- |
| `open-editor` | Open in Editor | primary              |
| `copy`        | Copy           | secondary            |
| `open-editor` | Open Source    | ⌘O when `source` set |

---

## Keyboard contract (arkn-aligned)

| Input            | Behavior                              |
| ---------------- | ------------------------------------- |
| Return           | primary                               |
| ⌘Return          | secondary (where defined)             |
| ⌘C / Ctrl+C      | `copy-title` → `entry.key`            |
| ⌘⌥C / Ctrl+Alt+C | `copy-desc` → `entry.desc ?? ''`      |
| ⌘O / Ctrl+O      | `open-editor` when `entry.source` set |
| Escape (list)    | minimize (kb)                         |
| ⌘⌥/ summon       | show + activate                       |

**Removed:** ⌘⇧E tertiary (replaced by ⌘O per arkn Metadata).

List **⌘C** **shall** delegate to `copy-title`, not `copyTextForEntry`, to match arkn (title/key vs body).

---

## Handoff pipeline

```ts
type HandoffKind =
  | 'browser-open'
  | 'terminal-paste'
  | 'terminal-run'
  | 'paste-frontmost'
  | 'editor-open'
```

**Order (terminal / paste / browser with external focus):**

1. Validate payload; resolve terminal name (`terminalApp` or OS default — §Terminal handoff).
2. `previousClipboard = readClipboard()`.
3. `writeClipboard(actionPayload)`.
4. `focusGuard.arm()`.
5. **Hide kb** (arkn: `closeMainWindow` **before** `open` / before AppleScript — browser path does not await close in arkn, but hide must complete before external I/O).
6. Run adapter — browser: single `open`; terminal: activate + 0.5s + ⌘V (+ Return).
7. On success: `writeClipboard(previousClipboard)`; disarm guard.
8. On failure: restore clipboard; **re-show** kb if hidden + error toast.

---

## Browser handoff (port `openInBrowser`)

```ts
// arkn/src/ui/helpers/actions.helper.ts
const app = await getFrontmostApplication()
const bundleID = Object.values(COMMON_APPS).find(i => i == app.bundleId)
closeMainWindow({ clearRootSearch: true })
await open(url, bundleID)
```

**kb macOS adapter (reproduce arkn — no extras):**

1. Resolve frontmost app bundle id.
2. If bundle id ∈ `KNOWN_BROWSER_BUNDLE_IDS` → `open -b {bundleId} {url}`.
3. Else → `open {url}` / `Utils.openExternal(url)`.
4. **Hide kb**, then open (same order as arkn).
5. **Do not** call `activateDefaultBrowser`, delayed second activate, or separate foreground pass — `open` is sufficient (remove current `activateHttpUrl` nudge pattern).

**Linux (platform delta):** frontmost window class vs known list; else `xdg-open`.

### Known browsers (from arkn `COMMON_APPS`)

Chrome, Zen, Firefox, Safari, Edge, Brave, Vivaldi, Arc, Opera, Iridium, Orion — bundle ids in `known_browsers.const.ts`.

---

## Terminal handoff (port `pasteCommand` / `executeCommand`)

**Terminal app name resolution:**

| Condition                 | App name for AppleScript `tell application "{name}"`                  |
| ------------------------- | --------------------------------------------------------------------- |
| `display.terminalApp` set | configured value (must match macOS app name, e.g. `iTerm`, `Ghostty`) |
| unset (kb delta)          | macOS: `Terminal`; Linux: resolved default emulator name              |

arkn **requires** `terminal_app` appPicker; kb falls back to OS default instead of throwing.

**macOS AppleScript helpers (arkn):**

```applescript
-- paste
tell application "{term}" to activate
delay 0.5
tell application "System Events"
  keystroke "v" using {command down}
end tell

-- run: add keystroke return
```

**kb RPC:**

- `pasteInTerminal(cmd)` → terminal-paste
- `runInTerminal(cmd)` → terminal-run (rename route from `executeInTerminal` in tasks)

Both accept `cmd`; main process owns clipboard save/restore (renderer **shall not** duplicate copy for command primary — single owner in main to match arkn).

**Linux:** `xdotool` ctrl+v + Return after raising resolved terminal window. Rationale:
no Electrobun API for external terminal activation — see §Electrobun vs external automation.

**Remove from implementation:** `activateTerminalApp` double-`open -a` nudge; renderer-side clipboard write before `pasteInTerminal` RPC.

---

## Cheat paste (port `Action.Paste`)

Same keystroke path as terminal paste but **without** targeting terminal — activate frontmost app, ⌘V, restore clipboard. Payload: `entry.doc`.

**Linux:** `xdotool key ctrl+v` into the focused application (no terminal window search).
Rationale: same as §Terminal handoff — not replaceable by Electrobun `ApplicationMenu` paste role.

## Editor handoff (port Metadata `Action.Open`)

- With `editorApp`: open file with application (macOS `open -a {editorApp} {path}`; Linux `gtk-launch {desktop-id} {path}` per [platform-parity §Phase 2](../platform-parity/design.md#editor-linux-adapter-normative) — not Electrobun Utils).
- Without: `Utils.openPath(source)`.
- Shortcut **⌘O** wired in `entry_action_shortcuts.util.ts` / window nav.

---

## RPC contract

```ts
openExternal: { url: string }      // → browser handoff
pasteInTerminal: { cmd: string }   // → terminal-paste (clipboard owned by main)
runInTerminal: { cmd: string }      // → terminal-run
openInEditor: { filePath: string }
```

Mirror all routes in `tools/preview/server.script.ts`.

---

## Primary / secondary maps (`entry_action_primary_secondary.util.ts`)

```ts
bookmark: { primary: 'open-url', secondary: null } // no secondary
command:  { primary: 'paste-terminal', secondary: 'run-terminal' }
cheat:    { primary: 'paste-doc', secondary: null }
task:     { primary: 'edit-task', secondary: 'cycle-status' }
shortcut: { primary: 'open-editor', secondary: 'copy' }
```

Use optional secondary in types or omit secondary action when null.

---

## Error messages

| code                    | Toast                             |
| ----------------------- | --------------------------------- |
| `browser-open-failed`   | Failed to open URL                |
| `terminal-paste-failed` | Failed to paste into terminal     |
| `terminal-run-failed`   | Failed to run command in terminal |
| `paste-doc-failed`      | Failed to paste                   |
| `editor-open-failed`    | Failed to open source             |
| `missing-source`        | No source file                    |

Failure toast **may** include action **Copy to Clipboard** (arkn).

---

## Decision log

### Decision: arkn as normative UX base

**Context:** Avoid re-deciding primary/secondary/handoff.
**Decision:** Port arkn ActionPanel + ActionsHelper; kb field mapping only.
**Rationale:** User directive.

### Decision: Hide on success

**Context:** arkn `closeMainWindow`.
**Decision:** `hide()`; show again if handoff fails after hide.

### Decision: Terminal target

**Context:** arkn requires appPicker; kb settings keep optional `terminalApp`.
**Decision:** Same paste/run **mechanics** as arkn; when unset, resolve **OS default terminal name** (not error, not silent no-op).
**Rationale:** User-approved sole delta from arkn (#4).

### Decision: Browser handoff

**Context:** kb had post-open `activateDefaultBrowser` nudges.
**Decision:** **Single** `open(url, bundleId?)` after hide — arkn parity.
**Rationale:** User-approved arkn reproduction (#1).

### Decision: Edit source shortcut

**Context:** Earlier kb spec used ⌘⇧E.
**Decision:** **⌘O** (arkn Metadata).
**Rationale:** arkn reference.

### Decision: Cheat primary

**Context:** Earlier kb spec used Copy Doc.
**Decision:** **Paste Doc** into frontmost app (arkn `Action.Paste`).
**Rationale:** arkn reference.

### Decision: Linux

**Context:** arkn is macOS-only.
**Decision:** Same semantics; `xdotool` / `xdg-open` adapters documented as platform delta.
**Rationale:** Electrobun provides no native Linux substitute for cross-app paste/terminal
automation — full survey in [`platform-parity/design.md` §Electrobun native API survey](../platform-parity/design.md#electrobun-native-api-survey-2026-06-01). Clipboard and default open paths use Utils; external paste/activate remain OS tooling.

## Migration from prior kb spec draft

| Prior kb code                                       | Target                           |
| --------------------------------------------------- | -------------------------------- |
| `activateHttpUrl` + double `activateDefaultBrowser` | hide → single `open -b? url`     |
| `runHandoff` → `minimize()`                         | → `hide()`                       |
| Renderer clipboard before `pasteInTerminal`         | main owns full arkn cycle        |
| `pasteInTerminal` no-op when `!terminalApp`         | OS default terminal + arkn paste |
| `activateTerminalApp` double `open -a`              | AppleScript activate + 0.5s + ⌘V |

---

## E2e acceptance (preview harness)

Normative scenarios: [`entry_action_handoff.feature`](../../features/e2e/entry_action_handoff.feature).

Implementors SHALL **not** rewrite feature prose; add step definitions per [`e2e/step-catalog.md`](../e2e/step-catalog.md#entry-action-handoff-steps-specentry-action-handoff).

| Surface       | Assertion mechanism                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Footer labels | DOM `.cmp-footer-primary` / `.cmp-footer-secondary`                                                                    |
| Handoff RPC   | Playwright intercept on preview `/api/openExternal`, `/api/pasteInTerminal`, `/api/runInTerminal`, `/api/openInEditor` |
| Shortcuts     | ⌘C / ⌘⌥C / ⌘O (platform meta via `press_shortcut.interaction.ts`)                                                      |
| Failure       | Intercept returns 422; error toast + list listbox visible                                                              |
| Native hide   | `@todo @native-handoff` — Electrobun CDP, not preview                                                                  |

Fixture: Release Bookmark YAML **key** = `https://kb.example.dev/release-bookmark`, list title via `desc` — see [`e2e/fixture-manifest.md`](../e2e/fixture-manifest.md#handoff-e2e-entry-action-handoff).
