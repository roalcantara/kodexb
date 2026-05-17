<!-- markdownlint-disable-file -->
# Codebase best-practices audit — Requirements

## Overview

This spec converts the best-practices audit report into implementation-ready
requirements. The work improves guard coverage, Electrobun/RPC boundary safety,
build security, TypeBox contract consistency, test coverage, and follow-up
automation without weakening kb's existing quality stack.

Source audit:
[`report.md`](report.md).

## Scope

The implementation must preserve existing behavior unless a requirement
explicitly calls for a stricter rejection path. Each change must stay aligned
with `kb-context`, `kb-rpc`, `kb-testing`, `kb-quality-gate`, and the routed
Electrobun skills.

The existing suppression-removal effort remains tracked by
[`../codebase-quality-audit/`](../codebase-quality-audit/). This spec may
reference that work, but it must not duplicate or replace that inventory.

## Requirements

### R1 — FCIS architecture guard coverage

**User story:** As a maintainer, I want the documented FCIS import boundaries
encoded in tooling, so that future changes cannot bypass layer rules by
accident.

#### Acceptance criteria

1. WHEN `bun run lint:depcruise` runs
   THEN dependency-cruiser SHALL fail on imports from `src/shell/renderer/` to
   `src/shell/app/`.
2. WHEN `bun run lint:depcruise` runs
   THEN dependency-cruiser SHALL fail on imports from `src/shared/` to
   `src/shell/`.
3. WHEN a route module imports a repository directly
   THEN the architecture checks SHALL fail unless that route module is the
   approved `App` orchestration layer.
4. WHEN the architecture checks are updated
   THEN existing valid imports SHALL continue to pass without weakening
   dependency-cruiser, ast-grep, TypeScript, Biome, knip, ls-lint, or jscpd.

### R2 — Desktop RPC bridge envelope validation

**User story:** As a maintainer, I want the Electrobun `rpcCall` bridge to
accept only kb's intended RPC envelope, so that the native/webview boundary
does not become a generic request proxy.

#### Acceptance criteria

1. WHEN `createKbWebviewRpc()` receives an RPC payload
   THEN it SHALL validate the payload shape before forwarding it to
   `RpcApp.handle()`.
2. WHEN the payload path does not start with `/api/`
   THEN the bridge SHALL reject the request without calling `RpcApp.handle()`.
3. WHEN the payload method is present and is not `POST`
   THEN the bridge SHALL reject the request without calling `RpcApp.handle()`.
4. WHEN the payload includes headers
   THEN the bridge SHALL forward only the explicitly allowed headers needed by
   Eden and Elysia.
5. WHEN the bridge rejects a payload
   THEN the renderer-facing error SHALL be testable and deterministic.

### R3 — Build TLS security decision

**User story:** As a maintainer, I want the default build command to keep TLS
verification enabled, so that the normal build path does not rely on a broad
security exception.

#### Acceptance criteria

1. WHEN `bun run build` runs
   THEN it SHALL NOT set `NODE_TLS_REJECT_UNAUTHORIZED=0` by default.
2. IF Electrobun build still requires disabled TLS in a local environment
   THEN the exception SHALL live behind a clearly named escape-hatch command.
3. IF an escape-hatch command is kept
   THEN its rationale SHALL be documented in an Electrobun-facing guide or spec.
4. WHEN the build command changes
   THEN `bun run build` SHALL still produce the expected app artifact on a
   supported macOS development host.

### R4 — RPC TypeBox contract consistency

**User story:** As a maintainer, I want RPC payload types and TypeBox schemas
to derive from one contract source where possible, so that TypeScript types and
runtime validation do not drift.

#### Acceptance criteria

1. WHEN an RPC request body schema has a corresponding exported TypeScript type
   THEN the implementation SHALL either derive the type from TypeBox or
   document why deriving it would violate the current layer boundaries.
2. WHEN deriving a type is possible inside the allowed layer
   THEN the implementation SHALL use `Static<typeof schema>` or an equivalent
   TypeBox-derived type.
3. WHEN a route body schema is changed
   THEN route-contract tests SHALL cover representative valid and invalid
   payloads.
4. WHEN TypeBox and shared RPC types intentionally remain separate
   THEN the reason SHALL be documented near the contract or in this spec.

### R5 — Suppression cleanup coordination

**User story:** As a maintainer, I want this audit to reuse the existing
codebase-quality-audit plan, so that suppression cleanup has one source of
truth.

#### Acceptance criteria

1. WHEN suppression cleanup begins
   THEN the agent SHALL refresh
   `assets/docs/specs/codebase-quality-audit/design.md` against the current
   branch before changing source files.
2. WHEN a suppression is removed
   THEN the related task in
   `assets/docs/specs/codebase-quality-audit/tasks.md` SHALL be updated.
3. IF a suppression cannot be removed by code changes
   THEN it SHALL remain only with explicit maintainer approval as defined in
   `assets/docs/specs/codebase-quality-audit/requirements.md`.
4. WHEN this best-practices audit references suppression cleanup
   THEN it SHALL point to the existing codebase-quality-audit spec rather than
   creating a competing inventory.

### R6 — Co-located spec coverage policy

**User story:** As a maintainer, I want a machine-checkable report for source
files without co-located specs, so that the project's testing rule is visible
and actionable.

#### Acceptance criteria

1. WHEN the spec-audit task runs
   THEN it SHALL report production files under `src/` that lack a co-located
   `.spec.ts` or `.spec.tsx`.
2. WHEN the spec-audit task runs
   THEN it SHALL apply explicit exemptions for barrels, pure type files,
   schema-only modules, constants, and generated data.
3. WHEN the spec-audit task finds missing specs
   THEN it SHALL print the missing files and exit according to the chosen mode
   documented by the task.
4. WHEN a new non-exempt production file is added without a spec
   THEN maintainers SHALL have a repeatable command to detect it before
   completion.

### R7 — Focused coverage improvements

**User story:** As a maintainer, I want tests around low-coverage boundary
modules, so that important app, native, and renderer seams are safer to change.

#### Acceptance criteria

1. WHEN tests are added for tag suggestion behavior
   THEN they SHALL cover `app_tag_rank` and `app_tag_suggest` directly.
2. WHEN tests are added for task YAML behavior
   THEN they SHALL cover task create, update, and remove serialization paths.
3. WHEN tests are added for the Electrobun RPC host
   THEN they SHALL cover rejected bridge payloads and successful forwarding.
4. WHEN tests are added for sync UI behavior
   THEN they SHALL cover sync modal and stats-sync state transitions without
   requiring a real Electrobun runtime.
5. WHEN `bun test --coverage` runs
   THEN the touched files SHALL meet or improve the existing coverage signal.

### R8 — Preview image protocol allowlist

**User story:** As a user, I want preview image fetching to use only expected
web protocols, so that imported knowledge entries cannot trigger unsupported
local or data URL fetch behavior.

#### Acceptance criteria

1. WHEN `fetchPreviewImageFromUrl()` receives an `http:` or `https:` URL
   THEN it SHALL preserve the current preview-image behavior.
2. WHEN it receives a `file:`, `data:`, or other unsupported protocol
   THEN it SHALL return `null` without calling `fetch`.
3. WHEN it receives a malformed URL
   THEN it SHALL fail safely according to the existing app error contract.
4. WHEN protocol handling changes
   THEN tests SHALL cover valid HTTPS, YouTube, unsupported protocols, and
   malformed input.

### R9 — Renderer list-shell cohesion

**User story:** As a maintainer, I want the list shell split into focused view
components over time, so that list, detail, filter, task, settings, palette,
sync, and toast concerns do not keep accumulating in one component.

#### Acceptance criteria

1. WHEN `ListMain` is refactored
   THEN it SHALL remain the composition shell for `ListPageShell`.
2. WHEN search/filter chrome is extracted
   THEN keyboard behavior and focus restoration SHALL remain covered by tests.
3. WHEN list body or empty states are extracted
   THEN virtual list padding, selection, sentinel, and empty-state behavior
   SHALL remain unchanged.
4. WHEN footer or overlay hosts are extracted
   THEN command palette, filter, task sheet, settings, sync modal, and toast
   behavior SHALL remain unchanged.
5. WHEN renderer list-shell changes are made
   THEN the agent SHALL run the focused renderer tests and, when available,
   `mise run e2e:preview`.

### R10 — Electrobun trust-boundary documentation

**User story:** As an agent working on desktop code, I want the trusted-renderer
assumption documented near the window bootstrap, so that future external
content uses the secure defaults from `electrobun-best-practices`.

#### Acceptance criteria

1. WHEN an agent reads the main `BrowserWindow` bootstrap
   THEN the trusted packaged renderer assumption SHALL be visible nearby.
2. WHEN future work adds external content or third-party webviews
   THEN the documentation SHALL direct the agent to sandbox, partition
   isolation, and navigation allowlists.
3. WHEN Electrobun desktop guidance is updated
   THEN it SHALL reference `.agents/skills/electrobun-best-practices/SKILL.md`
   and `.cursor/electrobun-skill-routing.md`.

### R11 — Preview e2e workflow visibility

**User story:** As a maintainer, I want preview e2e validation to be easy to
run for renderer-risky changes, so that navigation regressions are caught even
though Playwright is not part of the default gate.

#### Acceptance criteria

1. WHEN a change touches list navigation, filters, task sheet, or preview
   tooling
   THEN the implementation notes SHALL say whether `mise run e2e:preview` was
   run or why it was skipped.
2. IF a CI or maintainer-triggered preview e2e workflow is added
   THEN it SHALL remain separate from the default fast quality gate.
3. WHEN preview e2e cannot run because Chromium or preview data is missing
   THEN the agent SHALL report the blocker rather than treating the default
   gate as equivalent coverage.

### R12 — Quality gate preservation

**User story:** As a maintainer, I want every implementation slice to preserve
the existing quality stack, so that hardening work does not weaken the project.

#### Acceptance criteria

1. WHEN any task in this spec is completed
   THEN `bash .agents/skills/kb-quality-gate/scripts/gate.sh` SHALL pass or
   the remaining blocker SHALL be reported with exact command output.
2. IF a task changes `mise.toml`
   THEN `bun run lint:mise` SHALL pass.
3. IF a task changes Electrobun desktop code
   THEN the agent SHALL load `electrobun-best-practices` and the routed
   Electrobun skill before implementation.
4. IF a task changes RPC code
   THEN the agent SHALL load `kb-rpc` before implementation.
5. IF a task changes tests
   THEN the agent SHALL load `kb-testing` before implementation.
