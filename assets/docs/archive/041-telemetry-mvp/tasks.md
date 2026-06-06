<!-- markdownlint-disable-file -->
# KB — Telemetry MVP — Tasks

**Spec slug:** `telemetry-mvp`
**Reads:** [`requirements.md`](./requirements.md), [`design.md`](./design.md)
**Execution mode:** single working branch (`feat-telemetry-mvp`); ~75–90 minutes total focused work; **one atomic conventional commit** at Task 4 (per **D-009**).

---

## How to use this file

- Tasks are **ordered**. Do not parallelise.
- Each task is ~15–45 minutes.
- Do **NOT** create intermediate git commits; stage incrementally; single atomic commit at Task 4.
- After each task, run the per-task verification before advancing.
- If a check fails, do not advance — diagnose first (`systematic-debugging` skill).

---

## Task 1 — Sentry SaaS init (main + renderer)

| Field | Value |
|---|---|
| Estimated time | ~30 min |
| Satisfies | AC-001, AC-002 |
| Decision refs | D-001, D-008 |

### Steps

1. Create a Sentry account (free tier) + two projects: **Bun** (for `main`) and **Browser** (for `renderer`). Copy the two DSNs.
2. Document required env vars in `README.md` Development section: `SENTRY_DSN_MAIN`, `SENTRY_DSN_RENDERER`. Note: never commit the DSN values.
3. `bun add @sentry/bun @sentry/browser`.
4. Initialise `@sentry/bun` once at the very top of `src/shell/main/index.ts`, reading the DSN from `process.env.SENTRY_DSN_MAIN`. Bail early (no init) if the env var is missing — log a single info-level message via `logtape`.
5. Initialise `@sentry/browser` once at the very top of `src/shell/renderer/index.ts`, reading the DSN from `process.env.SENTRY_DSN_RENDERER` (or the appropriate Bun-bundled-env mechanism). Same bail-early behaviour.
6. Verify automatic capture: temporarily wire a `throw new Error('sentry-smoke')` to a dev-only keyboard shortcut; trigger it; confirm it appears in the Sentry dashboard within ≤ 60 s.
7. **Remove the temporary throw** before staging.

### Completion conditions

- [ ] Both SDKs init without errors in dev + prod builds.
- [ ] Induced error reaches Sentry with a usable stack trace.
- [ ] `SENTRY_DSN_MAIN` and `SENTRY_DSN_RENDERER` documented in `README.md`.
- [ ] No DSN literal anywhere in source (`grep -r 'sentry.io/' src/` returns nothing).
- [ ] No temporary smoke `throw` remains in source.

---

## Task 2 — `Telemetry` interface + `FirebaseTelemetry` + `NoopTelemetry`

| Field | Value |
|---|---|
| Estimated time | ~45 min |
| Satisfies | AC-003, AC-004, AC-005, AC-007 |
| Decision refs | D-002, D-003, D-006, D-007 |

### Steps

1. In the Firebase console, create a project, add a Web App, copy the config JSON. Store as a single env var `FIREBASE_CONFIG_JSON` (stringified).
2. In the Firebase console → Data Stream settings → **disable Enhanced Measurement** (per **D-006**).
3. `bun add firebase` (tree-shakes; only `firebase/app` + `firebase/analytics` end up in the bundle).
4. Author `src/shared/telemetry/telemetry.interface.ts` — copy verbatim from `design.md` §4.
5. Author `src/shared/telemetry/firebase.telemetry.ts` — `FirebaseTelemetry implements Telemetry`. `recordEvent` calls `logEvent(analytics, name, properties)`. `recordTiming` calls `logEvent(analytics, 'kb.perf.span', { operation, duration_ms })`. `recordError` calls `logEvent(analytics, 'kb.error.handled', { area, message: error.message })`.
6. Author `src/shared/telemetry/noop.telemetry.ts` — `NoopTelemetry implements Telemetry`. Methods push into a public `recorded: Array<{ kind, args }>` for test assertions.
7. Author `src/shared/telemetry/index.ts` — exports a singleton `telemetry: Telemetry` selected by env: `NoopTelemetry` when `NODE_ENV === 'test'`, `FirebaseTelemetry` otherwise. Guard `FirebaseTelemetry` construction against a missing/invalid `FIREBASE_CONFIG_JSON` — fall back to `NoopTelemetry` with an info-level logtape message.
8. Co-located `.spec.ts` for each new file (project convention). Tests assert on `NoopTelemetry.recorded` for the selector spec; assert on the `Telemetry` shape for the interface spec; smoke-test `FirebaseTelemetry` with a stub `analytics` object (avoid network).
9. Wire **at least five** instrumentation points from the seed taxonomy (`design.md` §5):
   - `kb.app.opened` — in `app.tsx` mount effect
   - `kb.search.executed` — in the search submission path
   - `kb.entry.opened` — in `entry_row.component.tsx` open handler
   - `kb.command_palette.opened` — in the palette mount effect
   - `kb.entry.created` — in the entry-create completion handler
10. Add a `dependency-cruiser` rule (`.dependency-cruiser.cjs`): renderer components MUST NOT import `firebase/*` directly — only via `@shared/telemetry`.
11. Smoke: build + run dev; open the app; perform a search; confirm `kb.search.executed` appears in Firebase **real-time view** within ~1 minute.

### Completion conditions

- [ ] `telemetry.interface.ts`, `firebase.telemetry.ts`, `noop.telemetry.ts`, `index.ts` exist under `src/shared/telemetry/` with co-located `.spec.ts`.
- [ ] Enhanced Measurement disabled in Firebase console (screenshot or note in the commit body).
- [ ] At least one real event arrives in the Firebase real-time view.
- [ ] `dependency-cruiser` rule passes; verified by attempting to add a `firebase/analytics` import to a renderer component (must fail lint).
- [ ] `bun run test` passes; `NoopTelemetry` is used in tests (verified by `noop.recorded.length > 0` in a smoke spec).

---

## Task 3 — Logtape file sink + "Copy diagnostic log" menu item

| Field | Value |
|---|---|
| Estimated time | ~30 min |
| Satisfies | AC-006 |
| Decision refs | D-001, D-008 |

### Steps

1. Configure logtape with a file sink: writes JSONL to `~/Library/Application Support/kb/kb.log` (macOS) or `$XDG_DATA_HOME/kb/kb.log` (Linux; default `~/.local/share/kb/kb.log`). Use a rotation policy: max age 7 days OR max size 10 MB.
2. Resolve the platform-correct path in `src/shell/main/` (file I/O lives in main; renderer cannot write to disk directly). Document the path in `README.md` Troubleshooting section.
3. Add a "Copy diagnostic log" menu item under **Help** (or **Debug**) via Electrobun's `ApplicationMenu` API (per the `electrobun-native-ui` skill). The accelerator is your choice.
4. Handler logic: main reads the tail (last 500 lines or 64 KB, whichever is smaller) of `kb.log` and sends the contents to the renderer via the existing Elysia+Eden RPC bridge; the renderer writes to the system clipboard.
5. Co-located `.spec.ts` for the new menu handler and any helper (tail-reader). Tests use temp files (per `assets/guides/TESTING_GUIDE.md`).
6. Smoke: launch dev build; trigger the menu item; paste into a text editor; confirm valid JSONL log entries.

### Completion conditions

- [ ] Logtape file sink writes structured JSONL to the documented platform path.
- [ ] Rotation policy active (verify with a synthetic test that ages the file).
- [ ] Menu item exists under Help/Debug; visible at runtime; keyboard-accessible.
- [ ] Clipboard contains valid JSONL after invocation.
- [ ] All new `.spec.ts` files pass.

---

## Task 4 — Quality gate + atomic conventional commit

| Field | Value |
|---|---|
| Estimated time | ~15 min |
| Satisfies | AC-008, D-009 |
| Decision refs | D-009, D-010 |

### Steps

1. `bun run lint:fix` — autofix what's autofixable.
2. `bun run lint` — must succeed with **0 errors and 0 warnings**.
3. `bun run test` — must pass 100% with 0 skipped tests.
4. `bun run build` — must succeed.
5. `bun run build:prod` — must succeed.
6. Update `CLAUDE.md` with a short line + link to `assets/docs/archive/telemetry-mvp/` under a new (or existing) "Observability" section. **One line and a link is enough**; do not duplicate the Decision Log.
7. Stage **only** the spec-related paths: `src/shared/telemetry/**`, `src/shell/main/index.ts`, `src/shell/renderer/index.ts`, instrumented component files, `src/shell/main/<menu-handler>`, `package.json`, `bun.lock`, `.dependency-cruiser.cjs`, `README.md`, `CLAUDE.md`. No `.env`, no DSN literals, no unrelated changes.
8. Commit using the template below (HEREDOC body, subject ≤ 50 chars).
9. Confirm HK pre-commit passes without `--no-verify`.
10. `git status` clean; `git log -1` shows the commit.

### Commit message template

```
feat(telemetry): Add Phase-0 instrumentation

Wire Sentry (errors+perf), Firebase Analytics (events), and a
logtape file sink (local diagnostic log) behind a thin Telemetry
interface. Disable Firebase Enhanced Measurement. Ship NoopTelemetry
for tests; add dependency-cruiser rule preventing direct firebase/*
imports from renderer components.

WHY
- N=1 personal-tool phase: cheapest meaningful instrumentation
- Three off-the-shelf tools, each doing one thing well; no build,
  no self-host, no consent-UI ceremony
- Telemetry interface keeps the vendor list swappable when N>1

Spec: assets/docs/archive/telemetry-mvp/

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Completion conditions

- [ ] All quality gates pass cleanly.
- [ ] Single conventional commit on the working branch; subject ≤ 50 chars; Conventional Commits format.
- [ ] HK pre-commit passed without bypass.
- [ ] `git status` clean; `git log -1` shows the expected commit.
- [ ] `CLAUDE.md` references the spec folder (one line + link).

---

## Definition of Done (whole spec)

Cross-reference with [`assets/guides/DoD.md`](../../../guides/DoD.md). Every box there must be ticked.

Higher-level summary:

- [ ] Tasks 1–4 each report all completion conditions met.
- [ ] All 8 acceptance criteria in `requirements.md` are observably satisfied.
- [ ] Single atomic conventional commit on `feat-telemetry-mvp`.
- [ ] Implementor reports back to user with: branch name, commit SHA, links to the four spec docs, confirmation Sentry receives errors and Firebase receives events, and any deviation from the spec (escalation rule per `design.md` §6 — there should be none).
