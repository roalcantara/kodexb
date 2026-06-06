<!-- markdownlint-disable-file -->
# Handoff — KB Telemetry MVP

> **Fresh agent: this is a small spec.** ~75–90 minutes of focused work. Decisions are already made; do not re-litigate. Read `design.md` §3 (Decision Log) and §6 (Trip-wires) before touching anything.

---

## Session metadata

| Field | Value |
|---|---|
| Spec slug | `telemetry-mvp` |
| Spec folder | `assets/docs/archive/telemetry-mvp/` |
| Planning agent | Planner + Lean Startup principles |
| Implementor agent | YOU |

---

## 1. Current state

The current state of KB instrumentation:

- `@logtape/logtape` and `@logtape/pretty` already dependencies.
- No analytics SDK installed.
- No error-tracking SDK installed.
- No file sink configured for logtape (it writes to console only).
- Renderer initialises React + `Telemetry` interface does not yet exist.

This spec adds: Sentry + Firebase Analytics + a logtape file sink, plus a thin `Telemetry` interface and a `NoopTelemetry` for tests. **Nothing else.**

---

## 2. Agent bootstrap sequence

### Step 0 — Branch

```bash
cd /Users/roalcantara/Work/bun/kb
git switch -c feat-telemetry-mvp main
```

### Step 1 — Read (in this order)

```
1. assets/docs/archive/telemetry-mvp/requirements.md   (full — ~80 lines)
2. assets/docs/archive/telemetry-mvp/design.md         (FULL — Decision Log §3 is the contract)
3. assets/docs/archive/telemetry-mvp/tasks.md          (full — 4 tasks)
4. CLAUDE.md                                         (project conventions)
5. assets/guides/DoD.md                              (acceptance gate)
6. assets/guides/GIT_COMMITS_GUIDE.md                (commit format)
7. assets/guides/TESTING_GUIDE.md                    (no mocks, Fishery)
8. assets/guides/LOGGING_GUIDE.md                    (logtape patterns)
```

### Step 2 — Load skills

1. **`app-context`** — project architecture, naming, FCIS rules. Always first.
2. **`electrobun-native-ui`** — only for Task 3 (menu item).
3. **`app-testing`** — when writing the new `.spec.ts` files.
4. **`verification-before-completion`** — before declaring any task complete.

Optional companions when blockers appear:

- `systematic-debugging` — if Sentry doesn't receive an induced error.
- `mise-tasks` — if env-var passthrough into the Bun build needs adjusting.

### Step 3 — Execute `tasks.md`

Four tasks. Each ~15–45 min. Stage incrementally on `feat-telemetry-mvp`; **single atomic commit** at Task 4.

### Step 4 — Hand back

When Task 4 completes, report to the user:

- Branch name (`feat-telemetry-mvp`)
- Commit SHA + subject
- Three confirmations:
  - Sentry dashboard received an induced error
  - Firebase real-time view shows `kb.search.executed` (or another seed event)
  - "Copy diagnostic log" places valid JSONL on the clipboard
- Any deviation from the spec (there should be none — see §3 below)

---

## 3. Decisions you must NOT re-litigate

All ten decisions live in `design.md` §3. Quick reference of common temptations and why they're already settled:

| ID | Don't propose | Because |
|---|---|---|
| D-001 | "Let's consolidate to one tool" | Three-tool split is deliberate; consolidation gives zero benefit at N=1 |
| D-002 | "Skip the Telemetry interface" | It's the only "build" that earns its place; ~30 lines for vendor-neutrality |
| D-003 | "Aptabase / PostHog / TelemetryDeck instead" | Familiarity wins at N=1; decision is fully reversible later via D-002 |
| D-004 | "OpenTelemetry from day one" | Premise has a hole (`OTel → Firebase` doesn't compose natively); revisit at Phase 2 |
| D-005 | "Self-Stats page inside KB" | 4–5 days of build for a $0/75-min vendor-dashboard outcome; trip-wire is N ≥ ~50 |
| D-006 | "Leave Enhanced Measurement on" | Adds noise events to the dashboard |
| D-007 | "Mock Firebase in tests" | Violates project no-mocking rule; `NoopTelemetry` exists for exactly this |
| D-008 | "Route Sentry through a logtape sink" | Sentry's auto-capture / perf spans / source maps require the SDK initialised anyway |

If reality *forces* deviation, **STOP** and escalate (do not silently substitute). Document the resolution as an ADR addendum in this folder.

---

## 4. Trip-wires (do NOT fire during this spec)

See `design.md` §6 for the full table. Summary of deliberate non-actions for this phase:

- **Do not** implement a consent UI (only relevant when N ≥ 2 users).
- **Do not** implement the Self-Stats page (only relevant when N ≥ ~50 users).
- **Do not** stand up an OpenTelemetry collector (only relevant when Sync ships).
- **Do not** add privacy nutrition labels or App-Store-shaped disclosure (not in any store).
- **Do not** expand the event taxonomy beyond the 8 in `design.md` §5 (resist until data reveals a question only a new event can answer).

---

## 5. Immediate next steps

1. Branch off `main` (Step 0 above).
2. Read `design.md` §3 (Decision Log) and §6 (Trip-wires) — full.
3. Begin Task 1 (Sentry SaaS init).
4. After Task 4 (atomic commit), hand back to the user.

The spec is small. The decisions behind it are the contract. Build the boring version, ship it, and use it for a month before suggesting anything more.
