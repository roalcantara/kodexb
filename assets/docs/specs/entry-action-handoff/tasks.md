<!-- markdownlint-disable-file -->

# Entry action handoff — tasks

**Spec slug:** `entry-action-handoff`
**Design:** [`design.md`](design.md)
**Requirements:** [`requirements.md`](requirements.md)
**UX reference:** arkn `entry.actions.component.tsx`, `actions.helper.ts`

Run gate before marking done: `bash .agents/skills/app-quality-gate/scripts/gate.sh`

---

## Phase 1 — Action ids and core maps (arkn matrix)

**Requirements:** R5, R8

- [x] **1.1** Add `paste-doc`, `run-terminal`, `copy-title`, `copy-desc` to `entry_action_ids.const.ts`; drop handoff reliance on `copy-doc` / `execute-terminal` if present.
- [x] **1.2** Update `entry_action_primary_secondary.util.ts`: bookmark/cheat **no secondary**; command secondary → `run-terminal`; cheat primary → `paste-doc`.
- [x] **1.3** Update `entry_action_records_visit.util.ts`.
- [x] **1.4** Port `COMMON_APPS` → `src/core/handoff/known_browsers.const.ts` + spec.

**Done when:** Core rank specs match design §Primary / secondary maps.

---

## Phase 2 — Hide retreat + failure re-show

**Requirements:** R2

- [x] **2.1** `external_focus_handoff.util.ts`: hide on success; if adapter fails after hide, re-show window.
- [x] **2.2** Wire `main.ts` / `shell_hooks.util.ts`.
- [x] **2.3** Update specs.

---

## Phase 3 — Handoff registry (arkn ports)

**Requirements:** R3, R4, R6, R7

- [x] **3.1** `handoff_registry.service.ts` — clipboard save/restore wrapper around all external handoffs.
- [x] **3.2** `browser_handoff.util.ts` — frontmost bundle + open (arkn `openInBrowser`).
- [x] **3.3** `terminal_handoff.util.ts` — `pasteCommand` / `executeCommand` AppleScript ports + Linux xdotool path.
- [x] **3.4** `paste_frontmost_handoff.util.ts` — cheat paste.
- [x] **3.5** `editor_handoff.util.ts` — arkn Metadata open.
- [x] **3.6** Delegate `shell_hooks.util.ts`; **delete** `activateHttpUrl` / double browser nudge and `activateTerminalApp` double-`open -a` patterns.
- [x] **3.7** `resolve_terminal_app_name.util.ts` — configured `terminalApp` or OS default (kb delta §R6.4) + spec.

**Done when:** Mocked tests assert clipboard restore + hide on success.

---

## Phase 4 — RPC `runInTerminal`

**Requirements:** R5.5, R6

- [x] **4.1** Route `runInTerminal` (TypeBox + Elysia + preview server).
- [x] **4.2** App + hooks; main owns clipboard for both paste and run (renderer stops pre-copy for command primary).
- [x] **4.3** Eden client + specs.

---

## Phase 5 — Renderer panel and shortcuts (arkn)

**Requirements:** R5.2, R5.7

- [x] **5.1** `build_entry_action_panel.util.ts` — arkn catalog: shared Copy Title, Copy Description, Open Source; type-specific rows.
- [x] **5.2** Wire **⌘C** → `copy-title`, **⌘⌥C** → `copy-desc`, **⌘O** → `open-editor` (replace ⌘⇧E if added).
- [x] **5.3** Command secondary → `run-terminal`; cheat primary → `paste-doc`; bookmark **no** secondary footer action.
- [x] **5.4** Update panel, shortcut, footer specs.
- [x] **5.5** Settings copy: terminal optional with sensible default; not arkn-required appPicker error.

**Done when:** Panel spec matches design §Action catalog.

---

## Phase 6 — entry-action-panel cross-links

- [x] **6.1** Sync [entry-action-panel/requirements.md](../entry-action-panel/requirements.md) R5 with arkn matrix.
- [x] **6.2** Sync [entry-action-panel/design.md](../entry-action-panel/design.md) catalog + pointer to arkn.

---

## Phase 7 — E2e (Gherkin authored; implementor wires steps only)

**Feature file (normative — do not rewrite scenarios):**
[`assets/features/e2e/entry_action_handoff.feature`](../../../assets/features/e2e/entry_action_handoff.feature)

**Step catalog:** [`e2e/step-catalog.md`](../e2e/step-catalog.md#entry-action-handoff-steps-specentry-action-handoff)
**Fixture:** [`e2e/fixture-manifest.md`](../e2e/fixture-manifest.md#handoff-e2e-entry-action-handoff)

- [x] **7.1** Author `entry_action_handoff.feature` with `@spec:entry-action-handoff` (footer, RPC intercept, shortcuts, failure, `@todo @native-handoff`).
- [x] **7.2** Trim `detail_and_actions.feature` — handoff scenarios live only in 7.1 (detail = metadata/body).
- [x] **7.0** Seed: Release Bookmark YAML **key** = `https://kb.example.dev/release-bookmark`, `desc: Release Bookmark`; keep list selection by title.
- [x] **7.3** Implement `e2e/steps/entry_action_handoff.steps.ts` + Screenplay tasks/questions per step catalog (intercept log, footer labels, shortcuts, toasts).
- [x] **7.4** Extend `entry_actions.task.ts` with `RunSecondaryAction` if not colocated in handoff steps module.
- [x] **7.5** `bddgen` emits `entry_action_handoff.feature.spec.js`; `CI=1 bun run e2e:regression` green for all non-`@todo` scenarios.
- [x] **7.6** Update `scenario-scores.json` for handoff scenario IDs.
- [x] **7.7** Cross-link evidence in [`e2e/tasks.md`](../e2e/tasks.md) Phase 8.

**Done when:** Preview intercept proves open/paste/run/paste-doc/editor RPC payloads; failure scenario shows error toast + visible list; native scenarios remain `@todo`.

---

## Phase 8 — Dogfood (arkn parity checklist)

| type     | ↵                    | ⌘↵                 | ⌘C       | ⌘⌥C       | ⌘O          |
| -------- | -------------------- | ------------------ | -------- | --------- | ----------- |
| bookmark | open browser, hide   | —                  | copy key | copy desc | open source |
| command  | paste terminal, hide | run terminal, hide | copy key | copy desc | open source |
| cheat    | paste doc, hide      | —                  | copy key | copy desc | open source |
| task     | edit                 | cycle status       | copy key | copy desc | open source |

- [x] **8.1** Gate green.
- [x] **8.2** macOS dogfood vs arkn side-by-side.
- [x] **8.3** Linux smoke documented.

---

## Deferred

- Windows adapters.
- Per-browser palette (arkn does not ship this).
- Task dynamic status labels (Start/Done/…) — optional polish.
