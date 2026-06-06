<!-- markdownlint-disable-file -->
<!-- Shipped: catalog key @entry_action_handoff. Normative behaviour: Gherkin + unit specs. -->

# Entry action handoff — requirements

**Spec slug:** `entry-action-handoff`

Normative contract: [design.md](design.md). Action catalog and keyboard surface: [entry-action-panel/requirements.md](../entry-action-panel/requirements.md).

**UX reference (normative):** Raycast extension **arkn** — `entry.actions.component.tsx` and `actions.helper.ts` (design §Reference). kb **shall** reproduce arkn handoff mechanics for **browser open**, **terminal paste/run**, and **dismiss-before-handoff** (§R2, R4, R6).

**Intentional delta from arkn (one only):** when `display.terminalApp` is **unset**, kb **shall** use the **OS default terminal** (§R6.4) instead of arkn’s hard error — paste/run mechanics stay identical.

**Platforms:** macOS behavior **shall** match arkn; Linux **shall** implement the same semantics with documented best-effort adapters. Windows is **out of scope** for v1.

**Electrobun baseline:** [Utils](https://blackboard.sh/electrobun/docs/apis/utils/) (`openExternal`, `openPath`) plus main-process platform adapters in design §4.

---

## Goal

When the user runs an entry action that hands work to an external app, kb **shall** behave like arkn: dismiss kb (`hide()` ≈ `closeMainWindow`), perform the same paste/open/activate sequence, and on failure **stay visible** with an **error toast** (arkn `showFailureToast`).

---

## R1 — Scope and boundaries

1. WHEN an action matches arkn’s type-specific or shared ActionPanel behavior THEN kb **shall** implement the same user-visible outcome (design §3).
2. WHEN an action is in-app only (edit task sheet, cycle status, clipboard-only copy) THEN handoff **shall not** apply.
3. WHEN kb schema fields differ from arkn (`key` vs `title`, `doc` vs `cheat`) THEN handlers **shall** use the mapping in design §Field mapping — no new product decisions.
4. IF the platform is Windows THEN handoff **may** no-op with error toast.

---

## R2 — kb retreat and blur guard

1. WHEN external handoff succeeds THEN kb **shall** `BrowserWindow.hide()` before or as part of activation (arkn: `closeMainWindow({ clearRootSearch: true })`).
2. WHEN Escape is pressed from the list with no detail THEN kb **shall** retain **`minimize()`** (kb-specific; arkn has no exact equivalent).
3. WHEN blur occurs during handoff focus guard THEN kb **shall not** minimize or hide from blur until the guard ends.
4. WHEN summon shortcut runs THEN kb **shall** `show()`, `activate()`, and `unminimize()` if needed.
5. WHEN handoff fails THEN kb **shall remain visible** and show an **error** toast; failure toast **may** offer **Copy to Clipboard** fallback (arkn pattern).

---

## R3 — Main-process handoff registry

1. WHEN handoff-eligible actions run THEN `shell/main` **shall** use **`runEntryHandoff`** + platform adapters (design §Architecture).
2. WHEN terminal or browser handoff runs THEN logic **shall** port arkn `ActionsHelper` semantics (frontmost browser bundle, configured terminal, clipboard restore).

---

## R4 — Browser handoff (arkn `openInBrowser` — reproduce exactly)

1. WHEN bookmark primary runs THEN kb **shall** resolve the **frontmost** application bundle id.
2. WHEN frontmost bundle id ∈ **known browser set** (design §5, arkn `COMMON_APPS`) THEN **shall** open the URL in that browser via `open(url, bundleId)` semantics.
3. WHEN frontmost is not a known browser THEN **shall** open in the **system default browser** (`bundleId` omitted / `open url` / `Utils.openExternal`).
4. WHEN opening THEN kb **shall** **hide before open** (arkn: `closeMainWindow` before `open`) — **shall not** call a separate activate/nudge pass after open (no double `activateDefaultBrowser`, no delayed re-activate).
5. WHEN default browser is needed on Linux THEN adapters **shall** use platform fallbacks only (§design Linux delta).

**Measure:** Adapter test — frontmost Chrome → `open -b com.google.Chrome {url}`; frontmost non-browser → default open; assert no second activation call.

---

## R5 — Action matrix (arkn-aligned)

kb maps arkn's **first type-specific Action** to **Return (primary)** and the **second type-specific Action** to **⌘Return (secondary)** where arkn defines two. Shared arkn actions live in the **Actions** / **Metadata** sections with global shortcuts (not primary/secondary ranks).

> **Cross-reference:** See [entry-action-panel/requirements.md](../entry-action-panel/requirements.md#r5) for the canonical catalog of per-type actions and shared keyboard shortcuts.

### R5.1 — Per-type list shortcuts

| `entry.type` | Primary (↵)                          | Secondary (⌘↵)                   | arkn source               |
| ------------ | ------------------------------------ | -------------------------------- | ------------------------- |
| `bookmark`   | Open In Browser (`open-url`)         | — (none)                         | Single type action        |
| `command`    | Paste in Terminal (`paste-terminal`) | Run in Terminal (`run-terminal`) | Two terminal actions      |
| `cheat`      | Paste Doc (`paste-doc`)              | — (none)                         | `Action.Paste`            |
| `task`       | Edit Task (`edit-task`)              | Cycle Status (`cycle-status`)    | Edit + status action      |
| `shortcut`   | Open in Editor (`open-editor`)       | Copy (`copy`)                    | kb-only type; no arkn row |

### R5.2 — Shared actions (all entry types, palette + global shortcuts)

| id            | Label            | Shortcut         | Payload (kb)                      | arkn                              |
| ------------- | ---------------- | ---------------- | --------------------------------- | --------------------------------- |
| `copy-title`  | Copy Title       | ⌘C / Ctrl+C      | `entry.key`                       | Copy to Clipboard → `entry.title` |
| `copy-desc`   | Copy Description | ⌘⌥C / Ctrl+Alt+C | `entry.desc ?? ''`                | Copy Description → `entry.desc`   |
| `open-editor` | Open Source      | ⌘O / Ctrl+O      | `entry.source` via editor handoff | Metadata → `Action.Open`          |

### R5.3 — Bookmark primary

1. WHEN primary on `bookmark` THEN **shall** run R4 browser handoff for `entry.key` (URL) and hide on success.

### R5.4 — Command primary (Paste in Terminal)

1. WHEN primary on `command` THEN **shall** run the full arkn `pasteCommand` sequence in **main** (design §Terminal handoff): save clipboard → copy `entry.key` → hide kb → activate terminal by **app name** → delay **0.5s** → System Events **⌘V** → restore clipboard.
2. Renderer **shall not** pre-copy before RPC (single owner in main).

### R5.5 — Command secondary (Run in Terminal)

1. WHEN secondary on `command` THEN **shall** follow R5.4 using arkn `executeCommand` (**⌘V** then **Return**).
2. **Shall not** pick frontmost terminal (arkn uses one target app per §R6).

### R5.6 — Cheat primary (Paste Doc)

1. WHEN primary on `cheat` THEN **shall** save clipboard, copy `entry.doc ?? ''`, hide kb, activate frontmost app, simulate **⌘V** paste, restore clipboard (arkn `Action.Paste` equivalent).
2. WHEN `entry.doc` is empty THEN **shall** error toast and **shall not** hide.

### R5.7 — Edit Source (⌘O)

1. WHEN user presses **⌘O** / **Ctrl+O** AND shortcuts allowed AND `entry.source` is set THEN **shall** open source in `editorApp` (configured) or default editor and hide on success (arkn Metadata section).
2. WHEN `entry.source` is missing THEN **shall** omit action from panel / no-op with toast if invoked.

### R5.8 — Task and shortcut

1. **Task:** primary Edit Task, secondary Cycle Status — in-app; no handoff change from entry-action-panel.
2. **Shortcut:** kb-only; primary open editor on `source`, secondary copy key — unchanged from current kb unless arkn gains a fifth type later.

**Measure:** Panel + shortcut specs; manual dogfood matrix in [tasks.md](tasks.md) Phase 8.

---

## R6 — Terminal handoff (arkn `ActionsHelper` — reproduce mechanics)

1. WHEN paste or run runs THEN **shall** use **System Events keystroke** **⌘V** and optional **Return** — **not** `do script` (arkn `activateAndPasteInto` / `activateAndPasteAndRun`).
2. WHEN activating terminal THEN **shall** use AppleScript **`tell application "{name}" to activate`**, **`delay 0.5`**, then keystrokes (arkn verbatim timing).
3. WHEN handoff completes THEN **shall** restore the user’s prior clipboard (arkn lines 66–74, 99–107).
4. WHEN resolving terminal **app name** THEN:
   - IF `display.terminalApp` is set THEN **shall** use it (arkn `terminal_app.name`).
   - IF unset THEN **shall** use **kb OS default** (intentional delta — arkn throws instead):
     - macOS: **`Terminal`** (`Terminal.app`).
     - Linux: `$TERMINAL` → `x-terminal-emulator` → `gnome-terminal` display name for activate.
5. WHEN paste/run fails THEN **shall** stay visible (re-show if already hidden) + error toast; **may** offer Copy to Clipboard (arkn).

---

## R7 — Editor handoff

1. WHEN `open-editor` runs with `editorApp` set THEN **shall** open `entry.source` with that application (arkn `Action.Open` + `preferences.editor_app`).
2. WHEN unset THEN **shall** open path via system default (`Utils.openPath` / `open`).

---

## R8 — Frecency

1. Successful handoff and paste actions **shall** record visits per entry-action-panel R4.
2. New ids: `paste-doc`, `run-terminal`, `copy-title`, `copy-desc` **shall** follow `entryActionRecordsVisit` policy.

---

## R9 — Known limitations

1. macOS fullscreen browser on another Space — same as arkn/Raycast; best effort only.
2. Linux paste/terminal automation **requires** `xdotool` (X11) when Electrobun cannot target external apps — not a Utils gap; see [design §Electrobun vs external automation](design.md#electrobun-vs-external-automation-linux-rationale) and [platform-parity §Electrobun native API survey](../platform-parity/design.md#electrobun-native-api-survey-2026-06-01). Surface actionable install errors when `xdotool` is missing.
3. kb bookmark **key** is URL; arkn **title** is human name — Copy Title copies `key` per field mapping (design §Field mapping).

---

## R10 — Testing and quality gate

1. Core + main adapter tests mirroring arkn scenarios (frontmost Chrome → open with Chrome bundle, paste+restore clipboard).
2. E2e **`@spec:entry-action-handoff`** — scenarios are **authored** in [`assets/features/e2e/entry_action_handoff.feature`](../../../assets/features/e2e/entry_action_handoff.feature); implementor SHALL add step definitions only per [`e2e/step-catalog.md`](../e2e/step-catalog.md#entry-action-handoff-steps-specentry-action-handoff) and [`e2e/fixture-manifest.md`](../e2e/fixture-manifest.md#handoff-e2e-entry-action-handoff).
3. Scenarios tagged `@todo @native-handoff` (window hide after real OS handoff) MAY stay unautomated until a desktop harness exists; all other scenarios in the feature file SHALL pass in preview e2e before merge.
4. **`bash .agents/skills/app-quality-gate/scripts/gate.sh`** before merge.

---

## R11 — Non-goals (v1)

- Undocumented divergence from arkn handoff mechanics (except §R6.4 terminal default).
- Windows parity.
- Frontmost-terminal picking (not in arkn).
- Post-open browser activation nudges (not in arkn).
- Per-browser palette rows (arkn uses frontmost only).
- Shortcut-type execution into other apps ([shortcuts](../shortcuts/requirements.md)).
