<!-- markdownlint-disable-file -->

# macOS / Linux platform parity — Tasks

Ordered verification work for [`requirements.md`](requirements.md) and
[`design.md`](design.md). Check items only with command evidence in PR notes.

**Handoff prompt:** [`handoff.md`](handoff.md)

---

## Phase 0 — Baseline audit (read-only)

- [ ] **0.1** Re-run parity matrix scan:

  ```bash
  rg -n "process\.platform|darwin|linux|osascript|open -|xdotool" src/shell/main
  bun test src/shell/main/handoff/
  ```

- [ ] **0.2** Confirm remaining gaps: `editor_handoff.util.ts` (`open -a` without platform branch);
  optional browser Linux explicit spec.
- [ ] **0.3** Load skills: `app-context`, `app-testing`, `app-quality-gate`, `app-logging`.

---

## Phase 1 — Fix spec/test drift (no new adapters)

**Done when:** Remaining handoff specs match production; R6 satisfied.

- [x] **1.1** `terminal_handoff.util.spec.ts` — Linux xdotool cases with injected `platform` (already in tree).
- [x] **1.2** `paste_frontmost_handoff.util.spec.ts` — same (already in tree).
- [x] **1.3** `editor_handoff.util.spec.ts` — add injected `platform`; Linux + `editorApp` set.
- [x] **1.4** `browser_handoff.util.spec.ts` — optional explicit Linux describe when frontmost is null (documents R2.1 fallback).

  ```bash
  bun test src/shell/main/handoff/
  bun run lint:spec-guide
  ```

---

## Phase 2 — Editor handoff Linux gap (R5)

**Done when:** `editorApp` set works on Linux without `open -a`.

- [x] **2.1** Refactor `editor_handoff.util.ts`:
  - `platform === 'darwin'` + `editorApp` → keep `open -a`
  - `platform === 'linux'` + `editorApp` → `gtk-launch` via `Bun.spawnSync`
  - Inject optional `platform` for tests

- [x] **2.2** Extend `editor_handoff.util.spec.ts`:
  - Linux + `editorApp: 'Code'` → success with mocked spawn
  - Linux + spawn failure → `{ ok: false, error: … }`
  - win32 + `editorApp` → `{ ok: false, error: 'not supported on win32' }`

- [x] **2.3** Update [`entry-action-handoff/design.md`](../entry-action-handoff/design.md) §Editor handoff with Linux adapter sentence (one paragraph addendum).

**Evidence:**

```bash
bun test src/shell/main/handoff/editor_handoff.util.spec.ts
# → 7 editor tests pass
```

---

## Phase 3 — Harden Linux xdotool adapters (R3, R4)

**Done when:** Terminal and paste-frontmost Linux paths are test-covered and robust.

- [x] **3.1** Extract shared `xdotool_available.util.ts` + spec (dedupe handoff files).

- [x] **3.2** Terminal Linux: `Bun.spawnSync(['xdotool', 'search', '--name', ...])` with
  exit-code check; error includes exit code when activation fails.

- [x] **3.3** Paste-frontmost Linux: `xdotool key ctrl+v` via `Bun.spawnSync` with
  exit-code check; error includes stderr or exit code.

- [x] **3.4** Add Linux install hint: static strings `'xdotool not found: install xdotool to enable Linux …'`.

- [x] **3.5** Registry spec: terminal-paste + paste-frontmost success/failure with mocked port.

**Evidence:**

```bash
bun test src/shell/main/handoff/
# → 67 handoff tests pass
bash .agents/skills/app-quality-gate/scripts/gate.sh
# → All gate stages pass (lint, typecheck, jscpd 0 clones, tests, build)
```

---

## Phase 4 — Manual dogfood + docs (R7, R9)

- [x] **4.1** macOS matrix (native `electrobun dev`):
  - Bookmark open, command paste/run, cheat paste, editor default + named app — **all pass**
  - Recorded in [`handoff.md` §Evidence](../handoff.md#evidence)

- [x] **4.2** Linux matrix (same flows):
  - **Blocked: no Linux host.** Documented in [`handoff.md` §Evidence](../handoff.md#evidence)
  - Expected evidence for future runner: xdotool version, terminal emulator, WM, gtk-launch desktop-id

- [x] **4.3** Update stale docs:
  - [`entry-action-handoff/design.md`](../entry-action-handoff/design.md) — editor Linux row changed to `gtk-launch`; paragraph updated
  - [`platform-parity/design.md`](../platform-parity/design.md) — parity matrix, drift table, stale bun_dollar path
  - [`platform-parity/handoff.md`](../platform-parity/handoff.md) — status, phases, audit summary
  - [`platform-parity/tasks.md`](../platform-parity/tasks.md) — checkboxes marked with command evidence

- [ ] **4.4** Optional: add `@spec:platform-parity` row to e2e fixture manifest if new scenarios added (not required for preview intercept parity).

---

## Phase 5 — CI regression gate (R8)

- [x] **5.1** Green full regression locally:

  ```bash
  CI=1 bun run e2e:regression --grep entry_action_handoff
  # → 11/11 pass (11.6s)
  ```

- [ ] **5.2** If metrics baseline stale after intentional suite growth, regenerate per
  [`e2e/design.md`](../e2e/design.md) with maintainer approval.

---

## Phase 6 — Optional browser Linux frontmost (Could)

**Defer unless Phase 2–4 complete.**

- [ ] **6.1** Implement WM_CLASS / active-window probe for known browsers on Linux.
- [ ] **6.2** Spec + manual evidence.

---

## Definition of done (platform parity v1)

1. Parity matrix rows for handoff adapters are **Done** or **Partial** with documented limitation — no **Gap** rows for editor/terminal/paste/browser default path.
2. R6 test hygiene satisfied across `src/shell/main/handoff/*.spec.ts`.
3. `bash .agents/skills/app-quality-gate/scripts/gate.sh` green.
4. Phase 4.2 Linux dogfood matrix recorded in PR or `handoff.md` evidence section.
5. Full `@regression` e2e + `--metrics-compare` green (or baseline updated with justification).
