<!-- markdownlint-disable-file -->

# Entry action handoff — fixup handoff (post-review)

**Status:** Prior agent delivered Phases 1–6 scaffolding; **Phase 7 incomplete**; **functional bugs** in renderer/main wiring.
**Date:** 2026-05-27
**Normative spec:** [requirements.md](requirements.md), [design.md](design.md), [tasks.md](tasks.md)

---

## Copy-paste prompt for fixup agent

```text
Fix the entry-action-handoff increment in /Users/roalcantara/Work/bun/kb.
Prior work landed handoff registry + panel shape but review found blocking gaps.
Do NOT mark tasks.md complete until ALL acceptance criteria below pass with evidence.

MANDATORY process (AGENTS.md):
  Load: app-context, app-rpc, app-testing, app-quality-gate
  Electrobun main: electrobun-best-practices + .cursor/electrobun-skill-routing.md
  Read: assets/docs/archive/entry-action-handoff/handoff-fixup.md (this file)

Do NOT rewrite assets/features/e2e/entry_action_handoff.feature prose.
Implement steps per assets/docs/archive/e2e/step-catalog.md §Entry action handoff steps.

---

## Workstream A — Main shell hooks (blocking)

A1. Wire runInTerminal in createShellHooks (shell_hooks.util.ts):
    runEntryHandoff('terminal-run', { cmd, terminalApp })
    Mirror pasteInTerminal pattern. Add shell_hooks.util.spec.ts coverage.

A2. Wire paste-doc (paste-frontmost) in createShellHooks:
    runEntryHandoff('paste-frontmost', { doc })
    Add App method + TypeBox schema + Elysia route POST /api/pasteDoc { doc }
    + Eden client pasteDoc(doc) + app_shell_hooks.types + app_shell_surface
    + server.spec.ts + preview uses createRpcServer (automatic if route added).

A3. Propagate handoff failure to renderer (R2.5):
    - runEntryHandoff returns HandoffResult; hooks OR App methods MUST surface failure
      (reject Promise / return { error } — pick one pattern, use across openExternal,
      pasteInTerminal, runInTerminal, pasteDoc, openInEditor).
    - On failure: window re-show already in registry; renderer shows error toast via pushToast.
    - On success: renderer shows success toast for handoff actions (feature file expects this).

Do NOT commit unless user asks. Run gate before claiming done.

---

## Workstream B — Renderer panel (blocking)

B1. build_entry_action_panel.util.ts:
    - run-terminal action: deps.runInTerminal(entry.key) — NOT pasteInTerminal
    - paste-doc action: deps.pasteDoc(entry.doc) — NOT pasteInTerminal(entry.key)

B2. entry_action_panel_deps.util.ts: add pasteDoc to deps + defaultEntryActionPanelDeps.

B3. executePanelAction or handoff action runs:
    - catch RPC/rejected promises → ctx.pushToast(message, 'error')
    - success → ctx.pushToast for handoff + copy-title/copy-desc (distinct messages for e2e)
    - copy-title/copy-desc: keep navigator.clipboard; add success toast after write

B4. list_footer.component.tsx + list_footer_primary.util.ts:
    - resolveListFooterSecondary() using secondaryAction(panel)
    - Render .cmp-footer-secondary button for command (label + ⌘↵ hint) when secondary exists
    - Bookmark/cheat: no secondary element (matches feature file)

B5. build_entry_action_panel.util.spec.ts:
    - Assert primary command calls pasteInTerminal with entry.key
    - Assert secondary command calls runInTerminal with entry.key
    - Assert cheat paste-doc calls pasteDoc with entry.doc

---

## Workstream C — E2e Phase 7 (blocking — falsely marked done)

C1. Fix Gherkin parse error in assets/features/e2e/detail_and_actions.feature:
    Lines 7–8 MUST be a comment, e.g.:
    # External handoff covered by @spec:entry-action-handoff in entry_action_handoff.feature.

C2. Seed (e2e/support/seed_fixture.support.ts) per fixture-manifest §Handoff e2e:
    Bookmark YAML key = https://kb.example.dev/release-bookmark
    desc: Release Bookmark
    (List selection by title "Release Bookmark" must still work.)

C3. Implement e2e/steps/entry_action_handoff.steps.ts + Screenplay:
    HandoffIntercept, FooterHandoff, HandoffApi, ActionToast, RunSecondaryAction
    See step-catalog.md §Entry action handoff steps.

C4. e2e/screenplay/entry_actions.task.ts: RunSecondaryAction (Meta+Enter / Control+Enter).

C5. paste-doc RPC contract for HandoffApi.receivedPasteDoc():
    Document chosen route in design if adding /api/pasteDoc; step asserts that path/body.

C6. Evidence:
    bun run e2e:bddgen  # must succeed
    CI=1 bun run e2e:regression --grep entry_action_handoff  # all non-@todo green
    Update assets/docs/archive/e2e/scenario-scores.json for handoff scenario IDs
    Uncheck then re-check tasks.md Phase 7 items with command output in evidence

---

## Workstream D — Tests & docs (required)

D1. handoff_registry.service.spec.ts: clipboard restore + show() on adapter failure (mock adapters).

D2. Uncheck Phase 7/8 in tasks.md until evidence exists; re-check only when AC pass.

D3. ✅ Done (platform-parity Phases 1–3):
    Linux terminal xdotool path in terminal_handoff.util.ts; xdotool_available helper extracted;
    editor gtk-launch added. See [`platform-parity/`](../platform-parity/) for full evidence.

---

## Verification commands

bash .agents/skills/app-quality-gate/scripts/gate.sh
bun test src/shell/main/handoff src/shell/main/shell_hooks.util.spec.ts
bun test src/shell/renderer/actions/build_entry_action_panel.util.spec.ts
CI=1 mise run test e2e --regression  # or: CI=1 bun run e2e:regression --grep entry_action_handoff
```

---

## Acceptance criteria (all required for “done”)

### AC1 — Command run secondary (R5.5)

1. WHEN user presses ⌘↵ on a selected command THEN renderer SHALL call `runInTerminal` RPC with `entry.key` as `cmd`.
2. WHEN main receives `terminal-run` THEN registry SHALL run AppleScript paste+Return (not paste-only).
3. WHEN unit test runs command panel secondary THEN mock `runInTerminal` SHALL be invoked (not `pasteInTerminal`).

### AC2 — Cheat paste doc (R5, design §Cheat paste)

1. WHEN user runs primary on cheat THEN renderer SHALL send `entry.doc` via paste-doc RPC (not `entry.key`, not terminal-paste).
2. WHEN main receives paste-frontmost THEN registry SHALL write doc to clipboard, hide, ⌘V via System Events (no terminal activate).

### AC3 — Main hook completeness (R3)

1. `createShellHooks` SHALL implement `runInTerminal` and `pasteDoc` (or equivalent) delegating to `runEntryHandoff`.
2. `POST /api/runInTerminal` and new paste-doc route SHALL forward to hooks in preview and desktop.
3. `shell_hooks.util.spec.ts` SHALL assert both hooks call `runEntryHandoff` with correct kind.

### AC4 — Failure and success feedback (R2.5)

1. WHEN handoff adapter returns `{ ok: false }` THEN kb window SHALL re-show (registry) AND renderer SHALL show **error** toast.
2. WHEN handoff succeeds THEN renderer SHALL show **success** toast (`.cmp-action-toast--success` visible).
3. WHEN e2e stub returns HTTP 422 on handoff routes THEN failure scenario SHALL pass (error toast + list visible).
4. WHEN user presses ⌘C / ⌘⌥C THEN success toasts SHALL include distinguishable copy for title vs description (e2e steps).

### AC5 — Footer affordances (R5, e2e)

1. WHEN command selected THEN footer SHALL show primary “Paste in Terminal” AND secondary “Run in Terminal” (`.cmp-footer-secondary` or equivalent).
2. WHEN bookmark or cheat selected THEN footer SHALL show primary only; no secondary affordance.

### AC6 — Bookmark open URL (R5.3, fixture)

1. WHEN e2e seed imports Release Bookmark THEN `openExternal` intercept SHALL receive `https://kb.example.dev/release-bookmark` on primary action (URL as YAML key per design §Field mapping).
2. List row title SHALL remain selectable as “Release Bookmark”.

### AC7 — E2e suite (R10)

1. `bun run e2e:bddgen` SHALL exit 0 (no Gherkin parse errors).
2. All scenarios in `entry_action_handoff.feature` WITHOUT `@todo` SHALL pass under `CI=1 bun run e2e:regression --grep entry_action_handoff`.
3. `e2e/steps/entry_action_handoff.steps.ts` SHALL exist and register all phrases in step-catalog.md for that feature.
4. `scenario-scores.json` SHALL list handoff scenario IDs as `passing` with evidence command in tasks.md.

### AC8 — Quality gate

1. `bash .agents/skills/app-quality-gate/scripts/gate.sh` SHALL pass on the fixup tree.
2. No `@todo` scenarios removed to fake green; `@native-handoff` stays `@todo`.

---

## Known-good baseline (keep)

- `src/shell/main/handoff/handoff_registry.service.ts` pipeline order (clipboard → hide → adapter → restore/re-show)
- `src/core/handoff/known_browsers.const.ts` + browser_handoff frontmost bundle logic
- `external_focus_handoff.util.ts` armGuard/disarmGuard; Escape → minimize via hideWindow
- Core action ids + primary/secondary maps
- Global shortcuts ⌘C / ⌘⌥C / ⌘O in use_entry_action_keys.hook.ts

---

## Files likely touched

| Area       | Files                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Main hooks | `shell_hooks.util.ts`, `shell_hooks.util.spec.ts`, `main.ts` (if hook shape changes)                                           |
| RPC        | `schemas.ts`, `server.ts`, `server.spec.ts`, `app.ts`, `app_shell_*.ts`, `client.ts`                                           |
| Renderer   | `build_entry_action_panel.util.ts`, `entry_action_panel_deps.util.ts`, `execute_entry_action.util.ts`, `list_footer*.tsx/ts`   |
| E2e        | `detail_and_actions.feature`, `seed_fixture.support.ts`, `e2e/steps/entry_action_handoff.steps.ts`, screenplay tasks/questions |
| Docs       | `tasks.md` evidence, `scenario-scores.json`, optionally `design.md` pasteDoc route note                                        |

---

## Out of scope for this fixup

- Windows handoff adapters
- `@native-handoff` Electrobun CDP scenarios
- Per-browser palette
- Linux WM_CLASS frontmost browser routing (Phase 6 Could)
