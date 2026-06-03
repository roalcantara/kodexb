<!-- markdownlint-disable-file -->
# KB — Telemetry MVP — Requirements

**Spec slug:** `telemetry-mvp`
**Status:** Ready for implementation
**Reads:** [`design.md`](./design.md) for the Decision Log and rationale.

> Lean spec by design. KB is at N=1 (personal tool, single user, single developer); the implementation is ~75–90 minutes of focused work. The artefact with the longest half-life is the **Decision Log** in `design.md` §3 — this `requirements.md` exists to anchor the binary acceptance criteria a fresh agent can verify against.

---

## Goal Statement

| Field | Value |
|-------|-------|
| **Goal** | Stand up minimum-viable telemetry for KB at N=1 — usage events, crash + performance tracking, and a local diagnostic log — using **Firebase Analytics** + **Sentry SaaS** + **logtape file sink**, behind a thin **`Telemetry`** interface that keeps vendors swappable without touching call sites. |
| **Success metrics** | (1) Setup completed in ≤ 90 minutes of focused work. (2) $0 ongoing cost on all three tools' free tiers. (3) Single atomic conventional commit. (4) Both Sentry SDKs initialise cleanly in main + renderer. (5) ≥ 5 instrumented events fire from real call sites and appear in the Firebase real-time view. (6) A deliberately induced unhandled error appears in the Sentry dashboard within ≤ 60 seconds with a usable stack trace. (7) "Copy diagnostic log" menu item places valid JSONL on the clipboard. (8) `bun run test`, `mise run lint`, `bun run build`, `bun run build:prod` all stay green. |
| **In scope** | Sentry SaaS (`@sentry/bun` + `@sentry/browser`); Firebase Analytics SDK + `Telemetry` interface + `FirebaseTelemetry` + `NoopTelemetry`; logtape file sink + "Copy diagnostic log" menu item; disabling Firebase Enhanced Measurement in the console; co-located `.spec.ts(x)` for every new `src/` file; one `dependency-cruiser` rule preventing direct `firebase/*` imports from renderer components. |
| **Out of scope** | Binary optimisation (separate micro-spec if/when relevant); Phase-2 observability (Sync-era OpenTelemetry pipeline); multi-user consent UI; privacy nutrition labels / App-Store-shaped disclosure; self-hosting any of the three tools; building a Self-Stats page inside KB (deferred per **D-005**); event-taxonomy expansion beyond the seed set in `design.md` §5; CI changes; release-process changes. |
| **Definition of Done** | Every checkbox in [`assets/guides/DoD.md`](../../../guides/DoD.md) satisfied; single conventional commit ≤ 50 chars per [`assets/guides/GIT_COMMITS_GUIDE.md`](../../../guides/GIT_COMMITS_GUIDE.md); trip-wires from `design.md` §6 referenced from `CLAUDE.md` (one line + link is enough). |
| **Verification** | `bun run test` • `mise run lint` • `bun run build` • `bun run build:prod` • Manual smoke: throw a deliberate error → see it in Sentry; perform a search → see `kb.search.executed` in Firebase real-time view; click "Copy diagnostic log" → paste valid JSONL into a scratch file. |

---

## Acceptance criteria

Eight binary, observable criteria. Full design rationale lives in `design.md` §3 Decision Log.

- **AC-001** WHEN the main process boots THEN `@sentry/bun` SHALL be initialised with a project DSN sourced from an environment variable (`SENTRY_DSN_MAIN`); the DSN SHALL NOT be hard-coded in source.
- **AC-002** WHEN the renderer boots THEN `@sentry/browser` SHALL be initialised with a project DSN sourced from an environment variable (`SENTRY_DSN_RENDERER`) AND SHALL automatically capture unhandled errors and unhandled promise rejections without further per-call instrumentation.
- **AC-003** WHEN the renderer boots THEN Firebase Analytics SHALL be initialised by `FirebaseTelemetry` (the implementation of the `Telemetry` interface) — never via direct `firebase/analytics` imports from components.
- **AC-004** WHEN any caller invokes `telemetry.recordEvent('kb.search.executed', { … })` in production mode THEN the event SHALL appear in the Firebase Analytics real-time view within ≤ 1 minute, with the supplied properties intact.
- **AC-005** WHEN a `.spec.ts(x)` file resolves a `Telemetry` instance THEN it SHALL receive a `NoopTelemetry` that records calls into an in-memory array and emits **zero** network traffic. No mocking of the Firebase SDK is permitted (project no-mocking rule).
- **AC-006** WHEN the user invokes the "Copy diagnostic log" menu item THEN the most-recent ≤ 500 entries from the logtape file sink SHALL be placed on the system clipboard as valid JSONL (newline-delimited JSON).
- **AC-007** WHEN Firebase Analytics is configured in the Firebase console for KB's data stream THEN **Enhanced Measurement SHALL be disabled** (no auto-tracked page views, scrolls, file downloads, video engagement, outbound clicks).
- **AC-008** WHEN `mise run lint` runs after the implementation lands THEN it SHALL pass with **0 errors and 0 warnings**, including: `knip` not flagging the new `@shared/telemetry` module as unused, and `dependency-cruiser` blocking any renderer-component import of `firebase/*` directly (only `@shared/telemetry` is allowed).

---

## Traceability (acceptance criterion ↔ decision)

| AC | Decisions that justify it (`design.md` §3) |
|----|--------------------------------------------|
| AC-001 | D-001 (three-tool split), D-008 (Sentry SDK direct) |
| AC-002 | D-001, D-008 |
| AC-003 | D-002 (Telemetry interface), D-003 (Firebase choice) |
| AC-004 | D-003, D-006 (Enhanced Measurement disabled — keeps signal clean) |
| AC-005 | D-007 (NoopTelemetry for tests), project no-mocking rule |
| AC-006 | D-001 (logtape file sink role) |
| AC-007 | D-006 |
| AC-008 | D-002 (interface enforced by cruiser rule), project quality gates |
