<!-- markdownlint-disable-file -->
# Codebase best-practices audit report

## Overview

This report records the completed best-practices audit follow-up for kb. The
audit started as a review against the project guide stack, `kb-context`, and
`electrobun-best-practices`; the implementation now turns the main findings
into executable guards, focused tests, documentation, and task-runner support.

The codebase remains healthy overall. The implementation preserves the existing
quality stack and keeps suppression cleanup delegated to
[`../codebase-quality-audit/`](../codebase-quality-audit/), which remains the
single source of truth for inline-suppression removal.

## Closure evidence

| Check | Result |
| --- | --- |
| Focused list-section tests | Passed: 11 tests, 0 failures for `list_results_body`, `list_search_filter_chrome`, `list_overlay_hosts`, and `list_footer`. |
| Focused app/RPC/renderer audit tests | Passed: 104 tests, 0 failures across RPC, preview fetch, tag suggestion, task YAML, sync modal, and stats sync. |
| Typecheck | Passed with `bun run typecheck`. |
| Mise task lint | Passed with `bun run lint:mise` after the root `perf` task migration. |
| Spec audit | Passed: `mise run test:spec-audit --strict` reports zero missing non-exempt co-located specs. |
| Performance thresholds | Passed: `mise run perf run --port 3457` reported 0 threshold violations. |
| Performance comparison | `mise run perf compare` is expected to fail until the committed baseline is refreshed; latest threshold run passes, but the older baseline reports P1/P4 regressions. |
| Full quality gate | Reached Stage 1 with typecheck, Biome, knip, dependency-cruiser, mise, jscpd, and ast-grep clean; blocked at `bunx @ls-lint/ls-lint` because this sandbox reports `bun is unable to write files to tempdir: PermissionDenied`. |

## Completed findings

### Architecture guard coverage

Dependency-cruiser now enforces the FCIS graph boundaries that the project docs
describe:

- `src/shell/renderer/` cannot import `src/shell/app/`.
- `src/shared/` cannot import `src/shell/`.
- main RPC route modules cannot import repositories directly.

Ast-grep remains a complementary literal-pattern guard.

### Desktop RPC bridge validation

The Electrobun `rpcCall` bridge now validates its request envelope before
forwarding to `RpcApp.handle()`. It accepts only `/api/` paths, accepts only
`POST` or an omitted method that defaults to `POST`, always forwards
`content-type: application/json`, and forwards only caller-provided `accept`.

Host tests cover valid forwarding, rejected paths, rejected methods, malformed
or invalid bodies, and header filtering.

### Build TLS posture

The default `bun run build` no longer disables TLS verification. The old
behavior is isolated behind `bun run build:insecure-local` and documented as a
local troubleshooting fallback in `assets/guides/ELECTROBUN.md`.

### RPC schema consistency

Route contract tests now cover representative valid and invalid TypeBox bodies
for list filters, config patches, task payloads, shell-surface routes, and
empty-body routes. Layer-safe local types derive from TypeBox where possible,
and shared renderer-imported RPC types remain separate to preserve FCIS.

### Preview image protocol safety

`fetchPreviewImageFromUrl()` now returns `null` for malformed URLs and
unsupported protocols such as `file:`, `data:`, and `ftp:` without calling
`fetch`. Tests preserve the existing HTTP, HTTPS, YouTube, failed-fetch, and
Open Graph behavior.

### Focused coverage pockets

Focused tests were added for tag suggestion, task YAML serialization, RPC host
bridge behavior, sync modal states, and stats-sync refresh behavior. These
tests protect the low-coverage seams identified by the original audit.

### Co-located spec audit

The root `mise.toml` now includes `test:spec-audit`, which reports production
files under `src/` that lack co-located specs after applying explicit
exemptions. Default mode is report-only; `--strict` exits non-zero when missing
non-exempt specs exist.

At closure, strict mode reports zero missing non-exempt specs.

### Electrobun trust-boundary docs

`assets/guides/ELECTROBUN.md` and the main window bootstrap now document that
kb's primary renderer is trusted packaged app content. Future external content
must use sandboxing, partition isolation, and navigation allowlists, with
`electrobun-best-practices` and skill routing as the required reference.

### Preview e2e workflow

`assets/guides/TESTING_GUIDE.md` and `README.md` now state when to run
`mise run e2e:preview` and how to report blockers. Preview e2e remains outside
the default gate for speed and portability.

### Renderer list-shell cohesion

`ListMain` was reduced from 375 lines to 250 lines. The list shell now delegates
to focused components for search/filter chrome, results body, footer, and
overlay hosts. Each extracted non-exempt component has a co-located spec.

Remaining list and hook suppressions stay tracked in
[`../codebase-quality-audit/tasks.md`](../codebase-quality-audit/tasks.md).

## Remaining follow-ups

1. Refresh or intentionally keep the committed performance baseline. The latest
   threshold run passes, but `perf compare` reports regressions against the
   older April 26, 2026 baseline.
2. Continue the suppression-removal work in
   [`../codebase-quality-audit/`](../codebase-quality-audit/). In particular,
   `list_main.component.tsx` is smaller but still has complexity suppressions,
   so its quality-audit row remains open.
3. Run `mise run e2e:preview` on a machine with Chromium and meaningful preview
   data before shipping future renderer-risky list/navigation changes.

## Handoff summary

The best-practices audit requirements are implemented and the audit records are
closed except for the intentionally delegated suppression cleanup and the stale
performance baseline decision. Future agents should start from
[`tasks.md`](tasks.md), then continue suppression work in
[`../codebase-quality-audit/`](../codebase-quality-audit/) instead of creating
a second suppression inventory.
