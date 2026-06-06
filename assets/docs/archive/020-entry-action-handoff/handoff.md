<!-- markdownlint-disable-file -->

# Entry action handoff — implementation handoff

**Status:** Spec complete — **no production implementation started** (SDD only).
**Date:** 2026-05-27
**Branch:** implement on current working branch; verify with `git status` before starting.

---

## Copy-paste prompt for a new agent

```text
Implement assets/docs/archive/entry-action-handoff/ per requirements.md, design.md, and tasks.md (phases 1–8 in order).

MANDATORY process (AGENTS.md):
  Claude → load skills → code → gate
  Load: app-context, app-rpc, app-testing, app-quality-gate
  Electrobun: electrobun-best-practices + .cursor/electrobun-skill-routing.md if touching main/shell

Normative UX reference — port from arkn (sibling repo):
  ~/Work/raycast/arkn/src/ui/helpers/actions.helper.ts
  ~/Work/raycast/arkn/src/ui/components/entry.actions.component.tsx

Reproduce arkn for:
  1) Browser: frontmost known bundle → open(url, bundleId); else default; hide BEFORE open; NO post-open activate nudge
  2) Terminal: main owns clipboard save → copy cmd → hide → activate by app name → delay 0.5s → System Events ⌘V (+ Return for run) → restore clipboard
  3) Retreat: hide() on handoff (not minimize); re-show + error toast on failure

ONLY intentional delta from arkn:
  4) terminalApp optional — if display.terminalApp unset, use OS default (macOS: "Terminal"; Linux: $TERMINAL chain), NOT arkn's throw

Do NOT:
  - Re-decide product behavior or skip spec phases
  - Use minimize() for successful external handoff
  - Keep activateHttpUrl / activateDefaultBrowser double-nudge or activateTerminalApp double open -a
  - Pre-copy command in renderer before pasteInTerminal RPC
  - Add src/ changes without co-located .spec.ts
  - Skip tools/preview/server.script.ts route mirror (uses createRpcServer — add route in src/shell/main/rpc/server.ts)
  - Rewrite assets/features/e2e/entry_action_handoff.feature (frozen — implement steps only per e2e/step-catalog.md)
  - Weaken quality gate or commit unless user asks

E2e (Phase 7): Gherkin is authored. Wire e2e/steps/entry_action_handoff.steps.ts + seed URL-key bookmark per e2e/fixture-manifest.md. @todo @native-handoff stays optional.

Done when: bash .agents/skills/app-quality-gate/scripts/gate.sh passes; tasks.md phases checked off; Phase 8 dogfood matrix attempted on macOS.
```

---

## Spec artifacts (read first)

| File                                                                                                 | Role                                                |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [requirements.md](requirements.md)                                                                   | EARS — acceptance criteria                          |
| [design.md](design.md)                                                                               | Normative contract, arkn port details               |
| [tasks.md](tasks.md)                                                                                 | Ordered implementation phases                       |
| [../../features/e2e/entry_action_handoff.feature](../../features/e2e/entry_action_handoff.feature)   | Frozen BDD scenarios (`@spec:entry-action-handoff`) |
| [../e2e/step-catalog.md](../e2e/step-catalog.md#entry-action-handoff-steps-specentry-action-handoff) | Step phrases + Screenplay mapping                   |
| [../e2e/fixture-manifest.md](../e2e/fixture-manifest.md#handoff-e2e-entry-action-handoff)            | Seed + intercept contract                           |
| [../entry-action-panel/requirements.md](../entry-action-panel/requirements.md)                       | Action matrix R5 (already synced)                   |

---

## Decisions already made (do not re-litigate)

| Topic                    | Decision                                                               |
| ------------------------ | ---------------------------------------------------------------------- |
| UX source                | **arkn** Raycast extension                                             |
| Architecture             | Main-process **handoff registry** (design §Architecture)               |
| Success retreat          | `BrowserWindow.hide()`                                                 |
| Escape blur              | Keep **`minimize()`** (kb-only)                                        |
| Handoff failure          | Stay visible + error toast; re-show if already hidden                  |
| Browser                  | Frontmost-if-known-browser + single `open`; no double activate         |
| Terminal mechanics       | AppleScript activate + 0.5s + ⌘V (+ Return for run); clipboard restore |
| Terminal app             | **Optional** `terminalApp`; OS default when unset (**kb delta #4**)    |
| Cheat primary            | **Paste doc** (not copy)                                               |
| Command secondary        | **Run in Terminal** (`run-terminal`)                                   |
| Bookmark/cheat secondary | **None** (no ⌘Return action)                                           |
| Edit source              | **⌘O** global (not ⌘⇧E)                                                |
| Shared copies            | ⌘C copy-title (`key`); ⌘⌥C copy-desc (`desc`)                          |
| Platforms                | macOS = arkn parity; Linux = same semantics, best-effort adapters      |
| Windows                  | Out of scope                                                           |

---

## arkn reference (read before coding handoff)

**Browser** (`openInBrowser`):

1. `getFrontmostApplication()` → bundle id
2. Match against `COMMON_APPS` values
3. `closeMainWindow` then `open(url, bundleID | undefined)`

**Terminal** (`pasteCommand` / `executeCommand`):

1. Require terminal preference in arkn; kb uses configured name or OS default
2. Save clipboard → copy cmd → close window → AppleScript activate terminal **by name** → delay 0.5 → ⌘V → (Return for run) → restore clipboard

**Field mapping:** arkn `title` → kb `key`; arkn `cheat` → kb `doc`; bookmark URL → kb `key`.

---

## Current code vs target (starting point)

### Main process — replace / remove

| File                                                   | Current (wrong for spec)                                                                                                     | Target                                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/shell/main/window/external_focus_handoff.util.ts` | `runHandoff` → **minimize**; `activateHttpUrl` double browser nudge; `activateTerminalApp` double `open -a`                  | Hide retreat; delete nudge helpers or move logic into handoff adapters     |
| `src/shell/main/shell_hooks.util.ts`                   | Uses `activateHttpUrl` / `activateTerminalApp`; `pasteInTerminal` **no-op** when `!terminalApp`; `hideWindow` → **minimize** | Delegate to handoff registry; real paste/run; distinguish hide vs minimize |
| `src/shell/main/main.ts`                               | `createExternalFocusHandoff({ minimize })`                                                                                   | Pass `hide`; blur guard unchanged                                          |

### Renderer — replace / extend

| File                                                                   | Current                                                           | Target                                                                           |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/core/helpers/entry_action/entry_action_ids.const.ts`              | No `paste-doc`, `run-terminal`, `copy-title`, `copy-desc`         | Add ids per tasks Phase 1                                                        |
| `src/core/helpers/entry_action/entry_action_primary_secondary.util.ts` | cheat→copy; command secondary→copy                                | arkn matrix (bookmark/cheat no secondary; command→run-terminal; cheat→paste-doc) |
| `src/shell/renderer/actions/build_entry_action_panel.util.ts`          | Command pre-copies clipboard; cheat copy; bookmark secondary copy | arkn catalog; command RPC only; paste-doc; shared copy-title/copy-desc           |
| `src/shell/renderer/actions/entry_action_shortcuts.util.ts`            | Return / ⌘Return only                                             | Add ⌘O, ⌘⌥C; handle null secondary                                               |
| `src/shell/renderer/hooks/list/use_view_navigation.hook.ts`            | ⌘C may use `copyTextForEntry`                                     | ⌘C → `copy-title` per spec                                                       |

### RPC — add

| Route                       | Status                                                        |
| --------------------------- | ------------------------------------------------------------- |
| `POST /api/openExternal`    | Exists — change handler only                                  |
| `POST /api/pasteInTerminal` | Exists — change handler only                                  |
| `POST /api/runInTerminal`   | **Add** (TypeBox schema, App method, Eden client, `.spec.ts`) |

Preview server (`tools/preview/server.script.ts`) uses `createRpcServer` — new routes in `server.ts` automatically appear in preview.

---

## Implementation phases (from tasks.md)

Execute **in order**. Mark tasks in [tasks.md](tasks.md) as you complete them.

### Phase 1 — Core ids and browser list

- Add action ids; update primary/secondary maps (**support `secondary: null`** for bookmark/cheat if types require it).
- Port `COMMON_APPS` → `src/core/handoff/known_browsers.const.ts` + spec.

### Phase 2 — Hide retreat

- Refactor `external_focus_handoff.util.ts`: success → `hide()`; failure → re-show.
- Fix `hideWindow` vs handoff hide vs Escape minimize (three distinct behaviors).

### Phase 3 — Handoff registry (core deliverable)

Create under `src/shell/main/handoff/` (one artifact per file, `.util.ts` or `.service.ts`):

- `handoff_registry.service.ts`
- `browser_handoff.util.ts`
- `terminal_handoff.util.ts` (paste + run)
- `paste_frontmost_handoff.util.ts`
- `editor_handoff.util.ts`
- `resolve_terminal_app_name.util.ts`

Wire from `createShellHooks`; **delete** old nudge paths.

**Clipboard on macOS:** main process must read/write system clipboard for terminal handoff (research Electrobun/Bun API or small native bridge — document choice in code if no existing helper).

### Phase 4 — RPC `runInTerminal`

- Mirror `pasteInTerminal` shape in `schemas.ts`, `server.ts`, `app.ts`, `client.ts`, `app_shell_hooks.types.ts`.

### Phase 5 — Renderer panel + shortcuts

- Rebuild panel per design §Action catalog.
- Footer: no secondary label for bookmark/cheat when selected.
- Update all co-located specs.

### Phase 6 — Spec sync

- Verify entry-action-panel docs still match (likely done).

### Phase 7 — E2e (feature file frozen)

**Do not edit** [`assets/features/e2e/entry_action_handoff.feature`](../../../assets/features/e2e/entry_action_handoff.feature) except for requirement-driven fixes. Implement:

1. Seed change (Release Bookmark URL key) — [`fixture-manifest.md`](../e2e/fixture-manifest.md#handoff-e2e-entry-action-handoff).
2. `e2e/steps/entry_action_handoff.steps.ts` + Screenplay — [`step-catalog.md`](../e2e/step-catalog.md#entry-action-handoff-steps-specentry-action-handoff).
3. Playwright route intercept on preview `/api/*` handoff routes; assert `handoffInterceptLog`.
4. Footer primary/secondary labels; command secondary visible or `data-footer-secondary-label` until footer UI ships.
5. `CI=1 bun run e2e:regression` green for scenarios without `@todo`.

Native hide scenarios stay `@todo @native-handoff`.

### Phase 8 — Verification

```bash
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

Manual matrix: [tasks.md Phase 8](tasks.md#phase-8--dogfood-arkn-parity-checklist).

---

## FCIS and naming reminders

- Handoff logic: **`shell/main`** only (I/O). Pure policy: **`core/handoff/`**.
- Renderer → main via **`@rpc/client`** only.
- Every new file under `src/` needs **co-located `.spec.ts`**.
- File suffixes: `.util.ts`, `.service.ts`, `.component.tsx`, `.routes.ts` per [CODESTYLE_GUIDE.md](../../../guides/CODESTYLE_GUIDE.md).
- Logging: `getLogger(['kb', 'handoff', ...])` — never `console.*` in `src/`.

---

## Testing focus

| Layer                       | Assert                                                                       |
| --------------------------- | ---------------------------------------------------------------------------- |
| `known_browsers`            | Bundle ids match arkn                                                        |
| `browser_handoff`           | Frontmost Chrome → `open -b com.google.Chrome`; no second activate call      |
| `terminal_handoff`          | Clipboard restore; AppleScript contains `delay 0.5` and `keystroke "v"`      |
| `resolve_terminal_app_name` | unset → `Terminal` on darwin                                                 |
| Registry                    | success → hide once; failure → hide not called or window re-shown            |
| Renderer panel              | command primary does **not** call `navigator.clipboard.writeText` before RPC |

---

## Git / commit note

**Do not commit** unless the user explicitly requests. Prior related work (shell-chrome, pointer selection, external focus spike) may exist unstaged — scope commits to entry-action-handoff only.

---

## Out of scope (v1)

- Windows handoff
- Per-browser palette actions
- Frontmost terminal picking
- Post-open browser activation nudges
- Shortcut chord execution into other apps

---

## Questions / blockers

If clipboard access from Electrobun main is unclear, read `assets/guides/ELECTROBUN.md` and `.agents/skills/electrobun-best-practices/SKILL.md` before inventing APIs. Escalate only if arkn behavior cannot be reproduced on Linux with documented fallback.
