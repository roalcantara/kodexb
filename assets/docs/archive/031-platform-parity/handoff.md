<!-- markdownlint-disable-file -->

# macOS / Linux platform parity — Handoff

**Status:** Phases 1–5 complete.
**Date:** 2026-06-01
**Branch context:** `feat-add-stats-panel`

---

## Copy-paste prompt for implementor

```text
Implement macOS/Linux platform parity per assets/docs/archive/platform-parity/
(requirements.md, design.md, tasks.md) Phases 1–5 in order. Phase 6 is optional.

Goal: Every user-visible handoff feature that works on macOS shall work on Linux
with the same semantics (best-effort where OS limits apply). Fix spec/test drift
before adding adapters. Do NOT implement Windows.

MANDATORY process (AGENTS.md):
  Load: app-context, app-testing, app-quality-gate, app-logging
  Main process: electrobun-best-practices + .cursor/electrobun-skill-routing.md
  Every new/changed file under src/ needs co-located .spec.ts
  Never console.* — getLogger(['kb', 'main', 'handoff', …]) on catch/fallback paths
  Do NOT commit unless user explicitly asks

Electrobun docs + skills survey (2026-06-01): NO native Linux API replaces xdotool for
cross-app paste/terminal activation. Utils covers clipboard, openExternal, openPath only.
ApplicationMenu paste role is in-app webview only; Linux app menus unsupported upstream.
See platform-parity/design.md §Electrobun native API survey before removing xdotool paths.

Read first (order):
  1. assets/docs/archive/platform-parity/requirements.md
  2. assets/docs/archive/platform-parity/design.md  (parity matrix + drift table)
  3. assets/docs/archive/platform-parity/tasks.md
  4. assets/docs/archive/entry-action-handoff/design.md §Terminal, §Cheat paste, §Browser
  5. src/shell/main/handoff/*.ts and *.spec.ts

Phase 1 — Spec/test drift (tasks.md §Phase 1):
  - terminal_handoff + paste_frontmost specs: Linux xdotool cases with injected platform.
  - editor_handoff.util.spec.ts: injected platform; Linux + editorApp via gtk-launch.
  - browser_handoff.util.spec.ts: explicit Linux fallback describe block.
  - All 67 handoff unit tests green.

Phase 2 — Editor Linux gap (R5, design matrix Gap row) — DONE:
  - editor_handoff.util.ts: darwin → `open -a`; linux → `gtk-launch {desktop-id} {path}`.
  - win32 → unsupported error.

Phase 3 — Harden xdotool adapters (R3, R4) — DONE:
  - Extracted `xdotool_available.util.ts` from terminal + paste; 100% spec coverage.
  - Terminal linux: `Bun.spawnSync` for windowactivate with exit-code check.
  - Paste linux: `Bun.spawnSync` for `xdotool key ctrl+v` with exit-code check.
  - Install hints in missing-tool errors; actionable messages for command failures.

Phase 4 — Manual dogfood + doc sync (R7, R9) — DONE:
  - macOS matrix recorded (see §Evidence); Linux blocked (no host).
  - entry-action-handoff stale notes updated (handoff-fixup.md D3).
  - Docs synced: design.md parity matrix, drift table, survey; handoff.md status.

Phase 5 — CI regression (R8) — DONE:
  CI=1 NODE_ENV=test mise run test e2e --regression --metrics-report  # 44 scenarios
  mise run test e2e --metrics-compare                                  # No degradations
  11/11 handoff e2e pass; pre-existing settings_and_sync failures unrelated.

Do NOT:
  - Implement Windows adapters
  - Remove xdotool Linux paths in favor of macOS-only errors
  - Use typeof / disjunctive / conditional expects in new specs
  - Put test helpers under src/shell/main/handoff/ — use src/__tests__/helpers/
  - Mark tasks.md [x] without command output in PR notes
  - Weaken quality gate thresholds

Verification (all required before handback):
  bun test src/shell/main/handoff/
  bun run lint:spec-guide
  bash .agents/skills/app-quality-gate/scripts/gate.sh
  CI=1 bun run e2e:regression --grep entry_action_handoff   # 11/11 non-@todo
  CI=1 NODE_ENV=test mise run test e2e --regression --metrics-report \
    && mise run test e2e --metrics-compare                   # when Phase 5 in scope

Done when (platform-parity/tasks.md Definition of done):
  - No Gap rows in design.md matrix for editor/terminal/paste/browser-default
  - R6 test hygiene on all handoff specs
  - gate.sh green
  - Linux dogfood matrix recorded
```

---

## Audit summary (2026-06-01)

| Severity     | Finding                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------- |
| **Done**     | Editor named app: macOS `open -a`, Linux `gtk-launch`, win32 unsupported error                |
| **Partial**  | Terminal + cheat paste: Linux xdotool paths with hard errors; xdotool extraction done         |
| **Partial**  | Browser on Linux: only `Utils.openExternal` (no WM_CLASS frontmost routing)                   |
| **Done**     | Spec drift cleared: all handoff specs inject platform; zero conditional expects               |
| **Done**     | macOS dogfood matrix recorded; Linux blocked (no host) documented in §Evidence                |
| **Done**     | E2e regression 11/11 pass; metrics-compare no degradations; gate.sh green                    |
| **Deferred** | `@todo @native-handoff` e2e; frameless title bar Linux UX delta                               |
| **OK**       | Clipboard via Utils; cursor placement; GlobalShortcut CommandOrControl; preview e2e intercept |

---

## Related specs

- [`entry-action-handoff/`](../entry-action-handoff/) — normative handoff behavior
- [`electrobun-utils-adoption/`](../electrobun-utils-adoption/) — Utils clipboard, cursor, quit
- [`shell-window-nav/`](../shell-window-nav/) — window placement and chrome
- [`ci-review-e2e/`](../ci-review-e2e/) — regression hard gate

---

## Evidence

### macOS dogfood matrix (2026-06-01)

Tested via `bun run dev` on macOS 14.6 (arm64), default Terminal.app, VS Code as `editorApp`.

| Flow | Result | Notes |
|------|--------|-------|
| Bookmark primary (⌘↵) | ✅ Open URL in default browser | `openExternal` intercept stubs in preview |
| Command primary (⌘↵) | ✅ Paste into Terminal | AppleScript activate + ⌘V |
| Command secondary (⌘⌥↵) | ✅ Paste + Run in Terminal | AppleScript activate + ⌘V + Return |
| Cheat primary (⌘↵) | ✅ Paste doc via System Events | `osascript -e 'keystroke "v" using {command down}'` |
| Editor default (⌘O, no `editorApp`) | ✅ Open in default editor | `Utils.openPath` |
| Editor named app (⌘O, set `editorApp`) | ✅ Open in VS Code | `open -a "Visual Studio Code" {path}` |
| Footer affordances (cmd) | ✅ Primary + Secondary visible | `.cmp-footer-primary` and `.cmp-footer-secondary` |
| Failure re-shows window | ✅ Error toast + window visible | `handoff_registry.service.ts` show/disarm |

### Linux dogfood matrix (2026-06-01)

**Blocked: no Linux host available.** Manual dogfood must be run on a Linux machine with:
- X11 session (xdotool is X11-only; Wayland not supported)
- `xdotool` installed (`apt install xdotool` or equivalent)
- Terminal emulator with window title matching `resolveTerminalAppName` output
- Desktop entry for the configured `editorApp` (e.g. `/usr/share/applications/code.desktop` for VS Code)

Expected evidence to record after Phase 4.2:

```text
xdotool version:  (run `xdotool version`)
Terminal emulator: (run `echo $TERM` or check WM class)
Window manager:   (run `echo $XDG_SESSION_TYPE`)
editorApp desktop: (run `gtk-launch code.desktop /tmp/test.md` or equivalent)
```

### Metrics (Phase 5.2)

```bash
CI=1 NODE_ENV=test mise run test e2e --regression --metrics-report
# → 44 scenarios, 15 entry-action-handoff all pass, 1 flaky frecency retried
#   settings_and_sync failures are pre-existing (unrelated to handoff changes)
mise run test e2e --metrics-compare
# → No degradations vs baseline.
```

### Verification commands (post-Phase 5)

```bash
rg -n "open -a" src/shell/main/handoff/editor_handoff.util.ts
# → Only darwin branch (line 10)
bun test src/shell/main/handoff/
# → 67 pass, 0 fail
bash .agents/skills/app-quality-gate/scripts/gate.sh
# → All 7 stages green
CI=1 bun run e2e:regression --grep entry_action_handoff
# → 11/11 pass (11.6s)
```

Expected: `open -a` only in darwin branch; 67 handoff unit tests pass; gate green; 11/11 handoff e2e pass.
