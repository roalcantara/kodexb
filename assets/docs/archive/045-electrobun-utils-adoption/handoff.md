<!-- markdownlint-disable-file -->

# Electrobun Utils Adoption — completion handoff

**Status:** Phases 1–3 complete (v0.10.0)
**Date:** 2026-06-01
**Prior:** [v0.10.0-scope.md](../v0.10.0-scope.md), [inventory.yml](../elysia-electrobun-capability-inventory/inventory.yml)

---

## What was done

### Phase 1 — Utils.openExternal / openPath boolean handling

- `ShellHooksUtils.openExternal` return type changed from `void` to `boolean`
- `ShellHooksUtils.openPath: (path: string) => boolean` added to type
- `main.ts` utils object includes `openPath: path => Utils.openPath(path)`
- Fallback handlers in `shell_hooks.util.ts` propagate `false` returns as throws:
  - `openExternalWithFallback` throws when `utils.openExternal` returns `false`
  - `terminalHandoffWithFallback` throws when `utils.openExternal` returns `false`
  - `openInEditorWithFallback` throws when `utils.openPath` returns `false`; throws when `editorApp` provided without handoffServices
- Specs updated with boolean-return mocks and fallback-error tests

### Phase 2 — Screen API for cursor-aware placement

- `main.ts` passes `Screen.getCursorScreenPoint()` and `Screen.getAllDisplays()` alongside `Screen.getPrimaryDisplay()` to window placement logic
- `resolveDisplayForPlacement` in `main.ts` uses all three Screen APIs

### Phase 3 — Event-driven shortcut teardown

- `registerBeforeQuitShortcutTeardown` replaces old `registerBeforeQuitShortcuts` / `createQuitHandler`
- Event-driven via `Electrobun.events.on('before-quit')` — no Cmd+Q registration in code
- `shellHooks.quit` simplified to `() => Utils.quit()` (teardown owned by event)
- Types file created: `register_before_quit_shortcut_teardown.types.ts`
- Spec rewritten without `mock.module`, using plain-object mocks

## Files touched

| File | Change |
| ---- | ------ |
| `src/shell/main/main.ts` | `openPath` in utils; event-driven teardown; simplified quit |
| `src/shell/main/utils/shell_hooks.util.ts` | `boolean` return, `openPath` field, fallback throws |
| `src/shell/main/utils/shell_hooks.util.spec.ts` | Boolean mocks, `openPath`, fallback-error tests |
| `src/shell/main/utils/register_before_quit_shortcuts.util.ts` | Replaced with `registerBeforeQuitShortcutTeardown` |
| `src/shell/main/utils/register_before_quit_shortcuts.util.spec.ts` | Rewritten (no `mock.module`) |
| `src/shell/main/utils/register_before_quit_shortcut_teardown.types.ts` | New types file |
| `assets/docs/archive/elysia-electrobun-capability-inventory/inventory.yml` | Updated usage notes |

## Out of scope for this handoff

- Phase 4+ of electrobun-utils-adoption (future increments)
- `@native-handoff` Electrobun CDP scenarios
- `App.closeDb()` in before-quit handler
- Electronbun PATHS usage
- Native notifications, Session, moveToTrash, dock helpers

## Verification

```bash
bash .agents/skills/app-quality-gate/scripts/gate.sh
bun test src/shell/main/utils/shell_hooks.util.spec.ts
bun test src/shell/main/utils/register_before_quit_shortcuts.util.spec.ts
CI=1 bun run e2e:regression --grep entry_action_handoff
```
