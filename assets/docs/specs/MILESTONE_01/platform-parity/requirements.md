<!-- markdownlint-disable-file -->

# macOS / Linux platform parity — Requirements

## Overview

kb ships as an **Electrobun desktop app on macOS and Linux**. Windows is **out of
scope** for v1 (see [`entry-action-handoff/requirements.md`](../../MILESTONE_01/entry-action-handoff/requirements.md)).

Every **user-visible feature** that works on macOS **shall** have a Linux
implementation with the **same semantics** (best-effort where OS limits apply).
Failures shall surface **actionable error toasts**, not silent no-ops.

This spec is the **cross-cutting parity contract**. Feature-specific behavior
remains normative in [`entry-action-handoff/`](../../MILESTONE_01/entry-action-handoff),
[`shell-window-nav/`](../../MILESTONE_01/shell-window-nav), [`shortcuts/`](../../MILESTONE_01/shortcuts), etc.
This spec **binds gaps** found in code audit (2026-06-01) and defines acceptance
for closing them.

## Non-goals

- Windows adapters.
- Native Electrobun desktop e2e for real OS handoff (`@todo @native-handoff`).
- Perfect pixel parity of shell chrome (title bar style may differ by platform).
- Requiring `xdotool` on Linux without a documented install path and clear error UX.

## Requirement syntax

- **WHEN** event, **THEN** the system **SHALL** response.
- **IF** precondition, **THEN** the system **SHALL** response.

---

## R1 — Parity inventory (maintainer)

1. WHEN this spec is active THEN `design.md` **SHALL** maintain a **parity matrix**
   mapping each user-facing capability → macOS adapter → Linux adapter → status.
2. WHEN a row is **Gap** or **Partial** THEN `tasks.md` **SHALL** contain at least
   one ordered task to reach **Done** or document an explicit **Deferred** trigger.

**Measure:** Matrix reviewed each PR touching `src/shell/main/handoff/` or platform branches.

---

## R2 — Entry action handoff (browser)

**Traceability:** [`entry-action-handoff`](../../MILESTONE_01/entry-action-handoff/requirements.md) R3, design §Browser.

1. WHEN bookmark primary runs on **Linux** THEN browser handoff **SHALL** open the URL
   in the user's default browser via `Utils.openExternal` (or documented Linux delta).
2. WHEN Linux frontmost-window detection is implemented (design §Linux browser delta)
   THEN known-browser routing **SHALL** mirror macOS semantics using WM_CLASS / process
   name — not macOS-only `open -b`.
3. WHEN frontmost detection is unavailable on Linux THEN **SHALL** fall back to
   `Utils.openExternal` with boolean failure handling (no silent success).

**Measure:** `browser_handoff.util.spec.ts` covers Linux path with injected deps;
no unconditional `open -b` on Linux.

---

## R3 — Entry action handoff (terminal paste / run)

**Traceability:** entry-action-handoff R6, design §Terminal handoff.

1. WHEN command primary or secondary runs on **Linux** THEN terminal handoff **SHALL**
   paste (and optionally run) via a Linux adapter — not return a macOS-only error.
2. WHEN `xdotool` is missing on Linux THEN **SHALL** return `{ ok: false, error: … }`
   with install guidance in the message.
3. WHEN terminal window activation fails on Linux THEN **SHALL** return a distinct
   error (not `{ ok: true }`).
4. WHEN `display.terminalApp` is unset on Linux THEN **SHALL** resolve name per
   `resolve_terminal_app_name.util.ts` (`$TERMINAL` → `x-terminal-emulator` chain).

**Measure:** `terminal_handoff.util.spec.ts` asserts Linux success/failure with mocked
spawn; **no** spec expecting `'Terminal handoff requires macOS'` on `platform: 'linux'`.

---

## R4 — Entry action handoff (cheat paste doc)

**Traceability:** entry-action-handoff R5.6, design §Cheat paste.

1. WHEN cheat primary runs on **Linux** THEN paste-frontmost **SHALL** simulate paste
   into the focused application (xdotool or documented equivalent).
2. WHEN `xdotool` is missing THEN **SHALL** fail with actionable error (same contract as R3.2).
3. WHEN paste fails on Linux THEN **SHALL** log at debug and return `{ ok: false, error }`.

**Measure:** `paste_frontmost_handoff.util.spec.ts` Linux branch green with mocks;
no macOS-only error string on `platform: 'linux'`.

---

## R5 — Entry action handoff (editor)

**Traceability:** entry-action-handoff R7.

1. WHEN `editorApp` is **set** and platform is **Linux** THEN **SHALL NOT** call macOS
   `open -a` as the only path.
2. WHEN `editorApp` is set on Linux THEN **SHALL** open the file with that application
   via `xdg-open`, `gtk-launch`, or Electrobun `Utils` documented equivalent.
3. WHEN `editorApp` is unset THEN **SHALL** use `Utils.openPath` on both platforms.

**Measure:** `editor_handoff.util.spec.ts` includes Linux + `editorApp` set case with
injected platform; gate green.

---

## R6 — Handoff test hygiene

1. WHEN a handoff spec runs THEN **SHALL** assert concrete outcomes (`toEqual` /
   `toMatchObject`) — not `typeof`, not disjunctive “ok or error”, not conditional
   `if (!result.ok) expect` without a single-object assertion.
2. WHEN testing platform branches THEN **SHALL** inject `platform` (or deps) — not
   wrap `expect` in `if (process.platform …)`.
3. WHEN production code supports Linux THEN specs **SHALL NOT** assert stale
   macOS-only error messages for `platform: 'linux'`.

**Measure:** `bun test src/shell/main/handoff/`; `lint:spec-guide` clean on touched specs.

---

## R7 — Shell chrome and window (best-effort)

**Traceability:** [`shell-window-nav`](../../MILESTONE_01/shell-window-nav/requirements.md) R2–R3.

1. WHEN app launches on Linux THEN window **SHALL** open centered on cursor display
   (or primary fallback) — same as macOS ([`electrobun-utils-adoption`](../../MILESTONE_01/electrobun-utils-adoption) R3).
2. WHEN frameless/hidden title bar is unsupported on Linux WM THEN **SHALL** use
   documented fallback (`titleBarStyle: 'default'`) without breaking drag or resize.
3. WHEN user drags window via renderer stripe THEN **SHALL** work on Linux best-effort
   (RPC drag path already used where `-webkit-app-region` is insufficient).

**Measure:** Manual dogfood checklist in `tasks.md` §Phase 4; unit specs for placement unchanged green.

---

## R8 — CI and release evidence

1. WHEN parity work completes THEN `tasks.md` **SHALL** record Linux smoke evidence
   (handoff preview e2e + optional native dogfood).
2. WHEN `@regression` e2e is green THEN hard-gate `--metrics-compare` **SHALL** pass
   ([`ci-review-e2e`](../../MILESTONE_01/ci-review-e2e/requirements.md) R4).

**Measure:** `CI=1 mise run test e2e --regression --metrics-report && mise run test e2e --metrics-compare`.

---

## R9 — Documentation cross-links

1. WHEN parity gaps close THEN **SHALL** update [`entry-action-handoff/tasks.md`](../../MILESTONE_01/entry-action-handoff/tasks.md)
   (remove stale “macOS-only” notes), [`entry-action-handoff/handoff-fixup.md`](../../MILESTONE_01/entry-action-handoff/handoff-fixup.md),
   and inventory `electrobun-platform` notes where applicable.

---

## Explicit deferrals (not parity blockers for v1)

| Item                                         | Trigger                                                       |
| -------------------------------------------- | ------------------------------------------------------------- |
| Linux browser frontmost WM_CLASS routing     | Optional enhancement after R2.1 default-browser path verified |
| `@todo @native-handoff` e2e                  | Electrobun CDP desktop harness                                |
| macOS + Linux signed release artifacts in CI | Distribution spec / maintainer decision                       |
| Windows                                      | Product scope exclusion                                       |
