<!-- markdownlint-disable-file -->
# KB — Telemetry MVP — Design

**Spec slug:** `telemetry-mvp`
**Reads:** [`requirements.md`](./requirements.md)
**Authoritative for:** every "how" decision in this spec. **Re-litigating decisions documented here is forbidden** — if reality contradicts a decision, STOP and escalate per §6 Trip-wires; do not silently substitute.

---

## 1. Overview

KB at N=1 needs three thin signals:

1. **What features the operator actually uses** (vs. what they think they use)
2. **What crashes / breaks / runs slowly** (vs. what feels fast)
3. **A local diagnostic trail** for when something feels off and a vendor dashboard isn't enough

The lean answer is **three off-the-shelf tools** (none built, none self-hosted), each doing one thing well, glued to KB through a single ~30-line abstraction (`Telemetry`) so the vendor list can be swapped in an afternoon when N grows past 1.

The implementation itself is ~75–90 minutes. This spec exists because the **decisions** behind it have a much longer half-life than the code — they are what protects future-you (or a future collaborator) from re-litigating settled questions or quietly drifting into "let's consolidate / let's self-host / let's add OTel / let's build a Self-Stats page" rabbit holes.

> If you read nothing else in this document, read **§3 Decision Log** and **§6 Trip-wires**. Together they ARE the contract.

---

## 2. Architecture sketch

```
KB renderer (React, WKWebView/CEF)              KB main (Bun + Elysia)
─────────────────────────────────                ───────────────────────
src/shell/renderer/                              src/shell/main/
└── components, pages, hooks                     └── index.ts
       │                                                │
       │ logger.info(...)                               │ logger.error(...)
       │ telemetry.recordEvent(...)                     │ Sentry auto-capture
       ▼                                                ▼
src/shared/                                      src/shared/
├── logging/   (logtape: console + file)         ├── logging/  (logtape: console + file)
└── telemetry/                                   └── (Sentry SDK init at top of index.ts)
    ├── telemetry.interface.ts                          │
    ├── firebase.telemetry.ts                           │
    ├── noop.telemetry.ts        (tests + dev-debug)    │
    └── index.ts                 (env-based selector)   │
       │                                                │
       │ events (HTTP, Measurement Protocol)            │ exceptions + perf spans (HTTP)
       ▼                                                ▼
  Firebase Analytics                                Sentry SaaS
   (web dashboard)                                  (web dashboard)

Local-only:
   ~/Library/Application Support/kb/kb.log         ← logtape file sink (JSONL, rotated)
   "Copy diagnostic log" menu item                 ← reads tail of kb.log → clipboard
```

### 2.1 What changes in the renderer

- `src/shell/renderer/index.ts` initialises `@sentry/browser` and resolves the `Telemetry` singleton.
- Components and hooks call `telemetry.recordEvent(...)` via `@shared/telemetry`.
- **No component directly imports `firebase/*`** (enforced by `dependency-cruiser`).

### 2.2 What changes in main

- `src/shell/main/index.ts` initialises `@sentry/bun` at the very top (before any other import that might throw).
- A new menu item under Help (or Debug) — "Copy diagnostic log" — is added via Electrobun's `ApplicationMenu` API; the handler reads the tail of the file sink and RPCs the contents to the renderer's clipboard utility.

### 2.3 What does NOT change

- Component tree, hook signatures, RPC shape, page routes — **untouched**.
- `BrowserWindow` configuration, drag stripe contract — **untouched**.
- `src/core`, `src/shell/app` (DB + AppService) — **untouched**.
- TypeBox / Elysia / Eden Treaty / `bun:sqlite` / Fishery conventions — **unchanged**.
- ts/tsx file naming (snake_case + suffix) — **unchanged**.

---

## 3. Decision Log (normative)

> **Rule:** Each decision below is binding. If reality requires deviation, STOP and escalate per §6; do not re-litigate.

### D-001 — Three tools, three roles (Firebase Analytics + Sentry SaaS + logtape file sink)

**Context:** Need to capture events, errors+perf, and a local diagnostic trail without building or running infrastructure.

**Options considered:**

1. **Build a Self-Stats page on top of a `telemetry_events` SQLite table** — architecturally attractive (eats own dogfood, $0, no third-party leakage, data co-located with KB entries) but ~4–5 days of focused engineering for instrumentation that gets *replaced* the moment N > 1. **Violates YAGNI for this phase.** Captured as **D-005**.
2. **Single tool covering all three concerns** (PostHog Cloud, Highlight.io) — works, but adds an unfamiliar tool and a richer feature surface than warranted at N=1.
3. **Three-tool split (chosen)** — each tool does one thing well; free tiers comfortable; ~75–90 min total setup; fully revocable.

**Decision:** Firebase Analytics (usage events) + Sentry SaaS (`@sentry/bun` + `@sentry/browser` for errors + perf) + logtape file sink (local diagnostic log).

**Rationale:** Lowest setup time + zero ongoing cost + each component independently swappable. The "consolidation" that single-tool options sell is a benefit only when there's actual cross-tool friction — there isn't at N=1.

---

### D-002 — Thin `Telemetry` interface is the only "build"

**Context:** Need vendor-neutrality at the call site so swapping vendors later doesn't require touching dozens of files. Don't want to build runtime infrastructure (which OpenTelemetry would imply — see **D-004**).

**Decision:** A ~30-line `Telemetry` interface in `src/shared/telemetry/telemetry.interface.ts` is the *only* abstraction built. Production implementation wraps Firebase (`FirebaseTelemetry`); test/dev-debug implementation is `NoopTelemetry`. Crash + perf signals route through Sentry's SDKs directly, not through this interface (see **D-008**).

**Rationale:** Gives ~90% of OpenTelemetry's portability benefit at ~5% of the cost. When swap day comes, it's **one file** changed, not a hunt across instrumented call sites.

---

### D-003 — Firebase Analytics over Aptabase, PostHog, TelemetryDeck

**Context:** Multiple competent options exist. The sole operator has years of Firebase experience.

**Options considered:**

1. **Aptabase** — purpose-built for desktop apps, smaller bundle, EU-friendly. Adds learning curve. *Loses to familiarity at N=1.*
2. **PostHog Cloud** — richer feature surface (cohorts, flags, experiments). Wrong tool for the phase; defers earning its keep until N > ~100 when freemium-cut analysis becomes a real question.
3. **TelemetryDeck** — strongest architectural privacy posture (aggregate-only). Loses on cohort-shaped questions because it's aggregate-only by design.
4. **Firebase Analytics (chosen)** — familiar (operator has years of muscle memory), generous free tier, BigQuery export as escape hatch, optional future leverage (Remote Config, Predictions) if the project ever grows into them.

**Decision:** Firebase Analytics.

**Rationale:** At N=1, familiarity is a measurable engineering-velocity advantage (~2–4 hours saved in the first week) with negligible offsetting cost: +~35 KB renderer bundle (noise at MB-scale binary), ~30 min disabling web defaults (see **D-006**), future privacy-disclosure paperwork *only if* KB ever ships publicly. The other tools' advantages don't materialise at this scale, and the `Telemetry` interface (**D-002**) means this choice is reversible.

**Bias acknowledgement:** the planning conversation surfaced a meta-bias against Google-ecosystem tools that was not justified at N=1 for behavioural telemetry (no user PII ever leaves the device — see KB's local-SQLite architecture). The honest comparison places Firebase Analytics, PostHog Cloud, and Sentry SaaS in the **same Class C** ("third-party SaaS with vendor data access") privacy class; differentiating between them on privacy grounds at N=1 was over-rotation.

---

### D-004 — NOT OpenTelemetry at this phase

**Context:** OTel is intellectually compelling (vendor-neutral, unified pipeline for logs + traces + metrics + events) and the project already has OTel-adjacent skills loaded.

**Options considered:**

1. **`logtape → OTel → Firebase Analytics`** — **premise has a hole**. Firebase Analytics is **not** an OTel sink. No first-party exporter exists in either ecosystem; Google's own OTel story points at Cloud Observability (Stackdriver), which is a different product from Firebase Analytics. Reaching Firebase via OTel would require writing a custom GA4 Measurement Protocol exporter (~1–2 days of Go or Bun-side translator code, plus ongoing maintenance across Tailwind^WTailwind^Wtelemetry-API releases).
2. **Full OTel stack with an OTel-native backend** (Sentry-OTel, Dash0, SigNoz, Grafana stack) — ~4–8 hours setup including collector configuration, backend choice, learning curve. Vendor-neutrality benefit only materialises if vendors are actually swapped.
3. **Skip OTel; use direct SDKs (chosen)** — ~1 hour setup; portability provided by the `Telemetry` interface (**D-002**) at ~5% of the OTel cost.

**Decision:** Direct SDKs, not OpenTelemetry.

**Rationale:** OTel earns its place when (a) multiple backends need fan-out, (b) multiple components (renderer + main + sync server) need unified instrumentation, or (c) self-hosting is required. None apply at Phase 0 with one local desktop app and N=1. The trip-wire in §6 makes the re-evaluation point explicit (Sync ships).

---

### D-005 — NOT building a Self-Stats page inside KB

**Context:** A "Self-Stats" page reading a local `telemetry_events` SQLite table is architecturally beautiful — eats KB's own dogfood, no third-party data exposure, data lives next to KB entries and is queryable with SQL.

**Decision:** Do not build it now. Use vendor dashboards (Firebase + Sentry) instead.

**Rationale:** ~4–5 days vs ~75 minutes for the same operator-facing outcome at N=1. The Self-Stats feature only earns its place if/when it becomes a *user-facing product feature* (KB users want to see their own usage) — re-evaluate at the trip-wire of N ≥ ~50 users (§6).

---

### D-006 — Disable Firebase Enhanced Measurement

**Context:** GA4 / Firebase Analytics auto-tracks website-shaped events (page views, scrolls, file downloads, video engagement, outbound link clicks) that produce noise in a desktop-app context.

**Decision:** In the Firebase console, **disable Enhanced Measurement** on the KB data stream. Send only explicit events via the `Telemetry` interface.

**Rationale:** Saves future-you 30 minutes of "why are these weird events here" — and keeps the dashboard signal-rich rather than diluted by web-shaped noise that doesn't map to KB's interaction model.

---

### D-007 — `NoopTelemetry` ships alongside `FirebaseTelemetry`

**Context:** Project convention (per `CLAUDE.md`): every file in `src/` needs a co-located `.spec.ts(x)`, and the project rule forbids mocking — tests must use real implementations or dependency injection.

**Decision:** Ship `NoopTelemetry` (records calls into an in-memory `recorded[]` array, sends nothing over the wire) alongside `FirebaseTelemetry`. The `Telemetry` selector in `src/shared/telemetry/index.ts` picks `NoopTelemetry` when `NODE_ENV === 'test'` (and may optionally pick it for `LOG_LEVEL=debug` dev sessions, to keep Firebase out of dev traffic). Tests assert on `noop.recorded`.

**Rationale:** Removes the need to mock the Firebase SDK in tests; satisfies the no-mocking project rule; gives a free dev-mode escape hatch.

---

### D-008 — Sentry SDK initialised directly, NOT via a logtape sink

**Context:** Tempting to route everything through logtape with a Sentry sink for "unified logging." Considered explicitly during planning.

**Options considered:**

1. **Logtape → Sentry sink** — one log-init point; errors flow as log records.
2. **Sentry SDK direct + logtape independent (chosen)** — two parallel pipelines, each playing its specific role.

**Decision:** Initialise Sentry SDK directly in main + renderer. Logtape independently writes to console + file. They do not share a pipeline.

**Rationale:** Sentry's value isn't just "receive error records" — it's the SDK's automatic capture of unhandled errors / unhandled promise rejections, source-map symbolication, performance spans, breadcrumb tracking, and release-tagging. **All of those require the SDK to be initialised regardless.** Adding a logtape→Sentry sink on top would be redundant ceremony without changing what Sentry can offer.

---

### D-009 — Single atomic conventional commit

**Decision:** All four implementation tasks land as **one** git commit on the working branch. Subject ≤ 50 chars per `assets/guides/GIT_COMMITS_GUIDE.md`. Body explains WHAT changed + WHY + the spec path. HK pre-commit must pass without `--no-verify`.

**Rationale:** Standard project rule; auditable history; the work is small enough that a single commit accurately reflects "the unit of change."

---

### D-010 — Trip-wires (§6) are part of the contract

**Decision:** The trip-wires in §6 are normative. When one fires, this spec is **revisited** (a new ADR addendum is written re-opening the relevant decision). Without a trip-wire firing, no part of this Decision Log is re-litigated.

**Rationale:** Decisions that don't decay only decay because no one writes down the conditions under which they should be re-examined. Naming the trip-wires is the protection against silent drift.

---

## 4. `Telemetry` interface contract

The only "build" in this spec. Lives at `src/shared/telemetry/telemetry.interface.ts`.

```ts
/**
 * Vendor-neutral telemetry surface.
 *
 * Implementations:
 *  - FirebaseTelemetry (production) — wraps firebase/analytics
 *  - NoopTelemetry    (tests + dev-debug) — records calls in memory
 *
 * Crash + performance signals are NOT routed through this interface; they
 * go via Sentry's SDKs directly (see design.md §3 D-008). This interface is
 * for explicit, in-code event/timing/error reporting only.
 */
export interface Telemetry {
  /**
   * Record a discrete user-behaviour or system event.
   * Properties MUST be JSON-serialisable and SHOULD NOT contain PII.
   */
  recordEvent(name: string, properties?: Record<string, unknown>): void

  /**
   * Record a timing measurement for a named operation.
   * Implementations MAY drop measurements below a per-operation threshold.
   */
  recordTiming(operation: string, durationMs: number): void

  /**
   * Record a non-fatal, handled error.
   * For unhandled errors, the Sentry SDK auto-captures (D-008).
   */
  recordError(area: string, error: Error): void
}
```

Selector (`src/shared/telemetry/index.ts`) returns the right implementation per environment. Renderer and main both consume via `@shared/telemetry`.

---

## 5. Seed event taxonomy

Eight events to start. The taxonomy is owned by this spec; expansions require an ADR-style addendum.

| Event | Properties | Why we log it |
|---|---|---|
| `kb.app.opened` | `{ cold_start: boolean, platform: 'darwin' \| 'linux' }` | Cold-start frequency; platform mix |
| `kb.search.executed` | `{ query_length: integer, result_count: integer, latency_ms: integer }` | Search shape + latency distribution |
| `kb.entry.opened` | `{ entry_type: string, source: 'list' \| 'palette' \| 'shortcut' }` | What is actually opened vs. perception |
| `kb.entry.created` | `{ entry_type: string }` | Creation rate; type mix |
| `kb.entry.action.invoked` | `{ action_name: string, entry_type: string }` | Power-feature usage |
| `kb.command_palette.opened` | `{ result_count: integer }` | Palette engagement |
| `kb.filter.changed` | `{ filter_type: string, has_query: boolean }` | Filter behaviour |
| `kb.detail.opened` | `{ entry_type: string }` | Detail-view engagement |

**Rule:** Resist the urge to add more until the data reveals a question only a new event can answer. Adding events without a question is noise.

---

## 6. Trip-wires (when to revisit this spec)

> Each trip-wire below, when it fires, MUST cause the implementor (or operator) to STOP, escalate, and write an ADR addendum re-opening the relevant decision. **No silent drift.**

| Trigger | Decision(s) re-opened | What changes |
|---|---|---|
| **A second human installs KB** | D-001, D-003 | Add first-run consent dialog (default OFF for analytics, default ON for crash reports). ~30 min. |
| **N ≥ ~50 installs** | D-005 | Self-Stats becomes a candidate *user-facing product feature*; re-evaluate as such. |
| **N ≥ ~100 installs** | D-003 | Aptabase / PostHog Cloud / TelemetryDeck may now justify their switching cost (cohort retention, freemium-cut hypotheses). |
| **Public commitment "your data never leaves your device"** | D-003 | Swap `FirebaseTelemetry` for `TelemetryDeckTelemetry` or `NoopTelemetry` (one file, ~1 hour). |
| **Sync service ships (Phase 2)** | D-004 | OpenTelemetry re-opens — multi-component instrumentation now justifies a collector. New spec under `assets/docs/archive/observability/`. |
| **Firebase free-tier limits bite** | D-003 | Will not happen at < 50k MAU. If it does, revisit vendor or upgrade plan. |
| **Sentry free-tier limits bite** | D-001 | Reduce sample rates, or migrate to GlitchTip (self-host) / upgrade plan. |

---

## 7. Error handling & residual risks

| Risk | Mitigation |
|---|---|
| Firebase / Sentry DSNs accidentally committed | DSNs sourced from env vars only; required vars documented in `README.md` Development section; verify via `grep -r 'sentry.io/' src/` returns nothing. |
| Tests fire real Firebase events | Prevented by **D-007** — `NoopTelemetry` is selected when `NODE_ENV=test`. |
| `Telemetry` interface bypassed (direct Firebase SDK calls from components) | `dependency-cruiser` rule: renderer components MUST NOT import `firebase/*` directly — only `@shared/telemetry`. **AC-008** asserts this passes. |
| Logtape file sink fills disk over time | Configure rotation: max age 7 days OR max size 10 MB, whichever hits first. |
| Firebase Enhanced Measurement silently re-enabled (Google default change) | Quarterly manual check on the data stream config; otherwise reactive when noise appears in the dashboard. |
| Renderer first-paint regression from Firebase SDK init | Initialise lazily (after first render) if measurable; not expected at SDK's ~50 KB gzipped weight. |
| HK pre-commit fails | Fix the underlying issue; never bypass with `--no-verify` (per D-009 and project policy). |

---

## 8. Open items

**None.** All decisions are resolved by D-001…D-010 and the trip-wire table.

If the implementor encounters a situation not covered above, **STOP** and escalate. Do not silently substitute. (Same rule as the design-polishing spec.)
