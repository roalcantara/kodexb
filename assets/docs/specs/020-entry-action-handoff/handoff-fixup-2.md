<!-- markdownlint-disable-file -->

# Entry action handoff — fixup 2 (remaining AC)

**Status:** Fixup 1 landed core wiring (A1–A2, B1–B4, C1–C3); **4 e2e scenarios red**, **A3 native incomplete**, **test/doc gaps**.
**Date:** 2026-05-27
**Prior:** [handoff-fixup.md](handoff-fixup.md) (done items — do not redo)
**Normative:** [requirements.md](requirements.md) R2.5, R10; [handoff-fixup.md](handoff-fixup.md) AC3–AC7

---

## Copy-paste prompt for implementor

```text
Complete entry-action-handoff fixup 2 in /Users/roalcantara/Work/bun/kb.
Fixup 1 is merged in tree: hooks, panel, footer, seed, e2e steps, 7/11 scenarios green.
Do NOT rewrite assets/features/e2e/entry_action_handoff.feature prose.

Read: assets/docs/specs/entry-action-handoff/handoff-fixup-2.md

Load: app-context, app-rpc, app-testing, app-quality-gate

Workstreams E (e2e), F (native failure propagation), G (tests), H (evidence).
Run gate + handoff e2e before claiming done. Do NOT commit unless user asks.
```

---

## Already done (fixup 1 — do not redo)

- `runInTerminal` / `pasteDoc` RPC + hooks + panel + footer secondary
- `execute_entry_action.util.ts` toasts on try/catch
- Gherkin parse fix, bookmark URL seed, `entry_action_handoff.steps.ts`, `RunSecondaryAction`
- E2e green: footer affordances, RPC primary/secondary (bookmark/command/cheat)

---

## Workstream E — E2e (AC4, AC7)

**Evidence target:** `CI=1 bun run e2e:regression --grep entry_action_handoff` → **11 passed, 0 failed** (excludes `@todo @native-handoff`).

### E1. Clipboard permissions (copy shortcut scenarios)

1. Grant Playwright clipboard in harness (fixture or `playwright.config.ts`):
   `clipboard-read`, `clipboard-write` for preview origin.
2. Re-run copy title / copy description scenarios.

### E2. Toast fragment alignment (AC4.4)

1. Toast copy is `"Title copied"` / `"Description copied"` in `execute_entry_action.util.ts`.
2. Either update `ActionToastIsSuccessFor.with(...)` / step-catalog fragments to match,
   **or** change toast strings to match catalog (`copy title` / `copy description`).
3. Pick one; keep step-catalog and implementation in sync.

### E3. Open Source shortcut (AC7 + keyboard handoff)

1. `PressShortcut('Meta+o')` must reach `open-editor` → `/api/openInEditor` (intercept log).
2. Mirror `RunPrimaryAction`: focus listbox before shortcut in step or shared task.
3. If Meta+O is swallowed by Chromium, document and use a stable alternative that still
   exercises global ⌘O per design (e.g. focus listbox + dispatch on `window` — last resort).

### E4. Failure scenario assertion (AC4.3, AC7)

1. Fix `HandoffNoSuccessfulOpenExternal` in `e2e/screenplay/handoff_api.question.ts`:
   intercept **logs** failed requests — assert **422 response / error toast**, not absence of
   `openExternal` in log.
2. Align step-catalog phrase semantics with implementation.
3. Feature expectation: error toast + list visible + handoff did not succeed (422 stub).

---

## Workstream F — Native handoff failure (AC3 partial, AC4.1)

Fixup 1 only fails handoff via HTTP 422 in preview. Desktop still resolves success when
`runEntryHandoff` returns `{ ok: false }`.

### F1. Propagate `HandoffResult` end-to-end

1. `createShellHooks` handoff hooks: check `runEntryHandoff` return; throw or return error
   to caller (pick one pattern for all five: openExternal, pasteInTerminal, runInTerminal,
   pasteDoc, openInEditor).
2. `app_shell_surface.util.ts`: reject `Promise` on failure (mirror `rejectShellNotImplemented`).
3. Elysia routes: return **422** (or agreed error shape) when handoff fails — same for
   preview `createRpcServer` and desktop.
4. Renderer: existing `executePanelAction` catch → error toast; no success toast on reject.

**Measure:** Unit test on surface util with mock hook that simulates failed handoff;
registry re-show remains in main (already implemented).

---

## Workstream G — Tests (AC3.3, D1)

### G1. `shell_hooks.util.spec.ts`

- `runInTerminal` → `runEntryHandoff('terminal-run', { cmd, terminalApp })`
- `pasteDoc` → `runEntryHandoff('paste-frontmost', { doc })`

### G2. `server.spec.ts`

- `POST /api/pasteDoc` — validation + hook forward (mirror `runInTerminal` describe block).

### G3. `handoff_registry.service.spec.ts` (D1)

- Mock failing adapter after hide: assert `show()` called + clipboard restored.

---

## Workstream H — Evidence hygiene (AC7.4, AC8)

1. Uncheck `tasks.md` **7.5** until e2e command output pasted in PR notes or task comment.
2. Update `scenario-scores.json`: only mark **passing** for scenarios verified green.
3. Uncheck **8.2 / 8.3** until dogfood notes exist (or leave unchecked with deferral comment).
4. `bash .agents/skills/app-quality-gate/scripts/gate.sh` green.

---

## Remaining acceptance criteria (all required)

### AC3 — Hook completeness (residual)

1. `shell_hooks.util.spec.ts` SHALL assert `runInTerminal` and `pasteDoc` delegate with correct kind.
2. `POST /api/pasteDoc` SHALL have `server.spec.ts` coverage.

### AC4 — Failure and success feedback (residual)

1. WHEN handoff adapter returns `{ ok: false }` on **desktop** THEN renderer SHALL show **error** toast (not success).
2. WHEN e2e stub returns HTTP 422 THEN failure scenario SHALL pass (error toast + list visible + corrected handoff assertion).
3. WHEN user presses ⌘C / ⌘⌥C THEN success toasts SHALL pass e2e (permissions + fragment alignment).

### AC7 — E2e suite (residual)

1. All non-`@todo` scenarios in `entry_action_handoff.feature` SHALL pass under:
   `CI=1 bun run e2e:regression --grep entry_action_handoff`
2. `scenario-scores.json` SHALL reflect actual pass/fail.

### AC8 — Quality gate

1. `gate.sh` SHALL pass on the fixup tree.

---

## Verification commands

```bash
bash .agents/skills/app-quality-gate/scripts/gate.sh
bun test src/shell/main/shell_hooks.util.spec.ts
bun test src/shell/main/rpc/server.spec.ts
bun test src/shell/main/handoff/handoff_registry.service.spec.ts
bun run e2e:bddgen
CI=1 bun run e2e:regression --grep entry_action_handoff
```

If port 3456 is busy locally: `PREVIEW_PORT=3457 CI=1 bun run e2e:regression --grep entry_action_handoff`

---

## Out of scope

- `@native-handoff` Electrobun CDP scenarios
- Linux xdotool terminal adapter
- [electrobun-utils-adoption](../electrobun-utils-adoption/handoff.md) (separate increment)

---

## Files likely touched

| Area           | Files                                                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E2e            | `playwright.config.ts` or `e2e/support/fixtures.support.ts`, `action_toast.question.ts`, `handoff_api.question.ts`, `entry_action_handoff.steps.ts`, `press_shortcut` / new focus helper |
| Native failure | `shell_hooks.util.ts`, `app_shell_surface.util.ts`, `server.ts`, optional `server.spec.ts`                                                                                               |
| Tests          | `shell_hooks.util.spec.ts`, `server.spec.ts`, `handoff_registry.service.spec.ts`, `app_shell_surface.util.spec.ts` (if new)                                                              |
| Docs           | `tasks.md`, `scenario-scores.json`, `step-catalog.md` (if toast fragments change)                                                                                                        |
