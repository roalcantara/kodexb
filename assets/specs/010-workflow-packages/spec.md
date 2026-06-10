<!-- markdownlint-disable-file -->

# Workflow packages & engine follow-ups

**Feature Branch**: `feature/010-workflow-packages`
**Release**: v0.x
**Status**: Draft

**Input**: [`009-agentic-workflow-orchestrator`](../009-agentic-workflow-orchestrator/) merged on `main`. **010** promotes L1/L2 to Bun workspaces and closes **009 optional engine follow-ups** (profile SDD bindings, orchestrator smoke). **Mise task reorganization** is [`011-mise-sdd-cli`](../011-mise-sdd-cli/) — blocked on 010.

## Introduction

The workflow engine lives at `tools/governance/specs/workflow/` today. 009 delivered the orchestrator program but deferred package extraction and full kb profile wiring. Splitting delivery keeps the **engine boundary** (packages, pure core) separate from **operator CLI** work in 011.

**Baseline:** 009 closeout on `main` before 010 starts. Do **not** re-implement 009 M1–M4 runtime in 010; file a 009 hotfix if merge gaps appear.

**Delivery:** **one PR** on `feature/010-workflow-packages` (packages first, then profile + smoke follow-ups per [`tasks.md`](./tasks.md)).

## Authority

| Topic                      | Authority                                                                       |
| -------------------------- | ------------------------------------------------------------------------------- |
| Engine behavior (AWO-1…13) | [`009` spec](../009-agentic-workflow-orchestrator/spec.md)                      |
| Package layout             | [`plan.md`](./plan.md) § Package boundary                                       |
| Profile shape              | [`assets/catalog/workflows/default.yaml`](../../catalog/workflows/default.yaml) |
| Mise / SDD CLI             | [`011-mise-sdd-cli`](../011-mise-sdd-cli/spec.md) — out of scope here           |

## Out of scope

- Mise task reorganization, `task_runner`, `spec test` hub (→ **011**)
- Process/container isolation (009 OQ-8)
- Renderer imports of workflow packages
- npm publish of `@kb/workflow-*`
- Backward-compatible mise aliases (→ **011**)

## Glossary

| Term               | Meaning                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| **L1 / core**      | Pure schemas, machine, evidence — no spawn, no toolchain strings               |
| **L2 / runtime**   | Orchestrator, invokers, persistence — may spawn; no `src/shell/**`             |
| **PROFILE-SDD-01** | Full per-stage `command:` / `evidence:` bindings in kb `default.yaml`          |
| **SMOKE-01**       | Orchestrator drives a real feature dir through gate evidence (nightly/CI only) |

## Clarifications

### Session 2026-06-10

- Q: Given root `bunfig.toml` sets `[test] root="src"`, how are the new packages' tests discovered? → A: **Per-package `bunfig.toml`.** Each package ships its own `bunfig.toml` (`root="."`); package tests run via `cd packages/<pkg> && bun test` (or `bun test --config packages/<pkg>/bunfig.toml`). The repo-root config is untouched; package evidence (WEP-1…WEP-3) uses this per-package form. Governance tests under `tools/governance/specs/workflow/` keep their existing runner form.
- Q: Which feature dir does the SMOKE-01 orchestrator run drive in CI/nightly? → A: **A committed fixture feature dir** (e.g. `tools/__tests__/fixtures/workflow/smoke-feature/`), honoring the 009 rule "never depend on live `assets/specs/NNN-*`." `.specify/feature.json` resolution remains a manual/local-only convenience, not the CI default.

## REQUIREMENT WEP-1: Workspace packages

**Slice:** MVP

**User story:** As a maintainer, I want workflow L1/L2 as Bun workspace packages so reuse and boundary checks are mechanical.

### Acceptance criteria

1. WHEN the operator runs `bun install` at the repo root, THEN the system SHALL resolve `@kb/workflow-core` and `@kb/workflow-runtime` under `packages/` via a root `workspaces` entry; both manifests SHALL be `private: true` (no npm publish — see [Out of scope](#out-of-scope)).
   - **Measure:** Both package test suites exit 0, discovered via each package's own `bunfig.toml`; neither manifest is publishable.
   - **Evidence:** `cd packages/workflow-core && bun test` and `cd packages/workflow-runtime && bun test` (equivalently `bun test --config packages/<pkg>/bunfig.toml`); manifests show `"private": true`.

---

## REQUIREMENT WEP-2: Core package boundary

**Slice:** MVP

**User story:** As a maintainer, I want L1 free of spawn and toolchain strings so the core stays portable.

### Acceptance criteria

1. WHEN ast-grep scans `packages/workflow-core/`, THEN the system SHALL find no `Bun.spawn`, `child_process`, or kb toolchain string literals in module bodies.
   - **Measure:** `bun run lint:ast-grep` exit 0 on the package tree.
   - **Evidence:** ast-grep rule pass; co-located negative fixture if present.

---

## REQUIREMENT WEP-3: Runtime package boundary

**Slice:** MVP

**User story:** As a maintainer, I want runtime isolated from the app shell so packages can be tested without FCIS violations.

### Acceptance criteria

1. WHEN dependency-cruiser scans `packages/workflow-runtime/`, THEN the system SHALL find no imports of `src/shell/**` or renderer paths; runtime MAY import `@kb/workflow-core` only.
   - **Measure:** `bun run lint:depcruise` exit 0.
   - **Evidence:** depcruise report clean for workflow packages.

---

## REQUIREMENT WEP-4: Governance re-exports

**Slice:** MVP

**User story:** As an agent, I want thin governance shims so kb CLI keeps working after package promotion.

### Acceptance criteria

1. WHEN conformance and `workflow_run` specs run after promotion, THEN the system SHALL pass without duplicating L1/L2 source under `tools/governance/specs/workflow/`.
   - **Measure:** Governance workflow test suite green.
   - **Evidence:** `bun test --config /dev/null tools/governance/specs/workflow/`.

---

## REQUIREMENT WEP-5: Workflow guide pointer

**Slice:** MVP

**User story:** As an agent, I want WORKFLOW_GUIDE to document package layout so I import the right layer.

### Acceptance criteria

1. WHEN an agent reads [`WORKFLOW_GUIDE.md`](../../guides/WORKFLOW_GUIDE.md), THEN the guide SHALL document `@kb/workflow-core` / `@kb/workflow-runtime` and governance CLI seams.
   - **Measure:** Guide section present; spec lint green.
   - **Evidence:** `WORKFLOW_GUIDE.md` diff; `mise run spec lint` on 010 spec.

---

## REQUIREMENT WEP-6: Full kb profile SDD bindings (PROFILE-SDD-01)

**Slice:** Follow-up

**User story:** As an operator, I want `default.yaml` to express real SDD commands per stage so the orchestrator can drive kb workflows.

### Acceptance criteria

1. WHEN the default workflow profile loads, THEN each SDD stage (`specify` through `review`) SHALL have real kb `command:` and/or `evidence:` bindings (`mise run spec …`, `hk check --profile …`) — not stubs except worker-only analyze/plan/tasks stages.
   - **Measure:** Profile validates; conformance filtered-subsequence test passes.
   - **Evidence:** `mise run catalog validate`; `conformance.script.spec.ts`.

---

## REQUIREMENT WEP-7: Orchestrator smoke (SMOKE-01)

**Slice:** Follow-up

**User story:** As a maintainer, I want nightly CI to exercise the orchestrator path, not only a direct gate shell invocation.

### Acceptance criteria

1. WHEN nightly or CI runs workflow smoke, THEN the system SHALL drive a **committed fixture feature dir** (e.g. `tools/__tests__/fixtures/workflow/smoke-feature/`) through the orchestrator so terminal gate evidence executes via the profile (not only a direct `mise run spec gate` shell step). Resolving the live `.specify/feature.json` feature is a manual/local-only convenience, never the CI default.
   - **Measure:** Smoke workflow green and reproducible (no dependence on whichever spec is in flight) in nightly/mainline runs; run log shows stage progression to the terminal gate. This smoke signal is non-blocking for PR merges.
   - **Evidence:** `.github/workflows/smoke.yml`; `CI_GUIDE.md`. MUST NOT block engine unit tests.

---

## REQUIREMENT WEP-8: kb-only profile lint boundary

**Slice:** Follow-up

**User story:** As a maintainer, I want kb conformance lints outside packages so engine extraction stays clean.

### Acceptance criteria

1. WHEN `profile_guide_crossref.script.ts` runs, THEN it SHALL remain kb governance under `tools/governance/specs/workflow/` (or conformance) — not imported by `packages/workflow-core` or `packages/workflow-runtime`.
   - **Measure:** No package → crossref import; optional lint passes.
   - **Evidence:** dependency-cruiser + ast-grep.

---

## REQUIREMENT WEP-9: Single PR delivery

**Slice:** Closeout

**User story:** As a reviewer, I want one atomic PR for package promotion and profile smoke wiring.

### Acceptance criteria

1. WHEN 010 ships, THEN packages + profile bindings + smoke wiring + guide updates SHALL land in one PR (WEP-10 Bun PM follow-up may land as a second commit on the same PR).
   - **Measure:** `mise run spec gate assets/specs/010-workflow-packages` green before merge.
   - **Evidence:** PR description lists WEP-1…WEP-10.

---

## REQUIREMENT WEP-10: Bun package manager conventions

**Slice:** Follow-up (same PR)

**User story:** As a maintainer, I want workspace packages to use Bun PM catalog and monorepo conventions so dependency versions stay single-sourced and CI stays reproducible.

### Acceptance criteria

1. WHEN the root `package.json` defines shared npm dependencies used by workspace packages, THEN versions SHALL live in a root **`catalog`** (or `workspaces.catalog`) and workspace `package.json` files SHALL reference them with `"catalog:"` — not duplicate semver pins (e.g. `xstate`, `@sinclair/typebox`, `yaml` where shared).
   - **Measure:** `packages/workflow-*/package.json` has no literal `^` pins for cataloged deps; `bun install` exit 0.
   - **Evidence:** root `package.json` catalog block; grep shows `catalog:` in workspace manifests.

2. WHEN internal packages depend on each other, THEN they SHALL use `"workspace:*"` (already normative for `@kb/workflow-core` → runtime).
   - **Measure:** `bun install` resolves workspace links.
   - **Evidence:** lockfile workspace entries.

3. WHEN CI installs dependencies, THEN workflows SHALL use **`bun ci`** or `bun install --frozen-lockfile` (not unconstrained `bun install` on release paths).
   - **Measure:** `.github/workflows/smoke.yml` and setup action use frozen install.
   - **Evidence:** workflow diff; `CI_GUIDE.md` note if needed.

4. WHEN package tests run in isolation, THEN each workspace package SHALL ship **`bunfig.toml`** with `[test] root = "."` and handoff Evidence SHALL use `cd packages/<pkg> && bun test` (not `bun test --config <path>` — Bun treats path as filter).
   - **Measure:** handoff AC table matches runnable commands.
   - **Evidence:** `handoff.md` Evidence column; package tests pass from package cwd.

5. WHEN the monorepo uses workspaces, THEN root `workspaces` MAY use the object form `{ "packages": ["packages/*"], "catalog": { … } }` per [Bun catalogs](https://bun.com/docs/pm/catalogs); isolated linker remains default for new workspaces (no override unless documented).
   - **Measure:** `bunfig.toml` / lockfile `configVersion` unchanged or documented.
   - **Evidence:** `plan.md` § Bun package manager.

## Delivery map

| Track              | Requirements |
| ------------------ | ------------ |
| Package promotion  | WEP-1…WEP-5  |
| 009 follow-ups     | WEP-6…WEP-8  |
| Bun PM conventions | WEP-10       |
| Program closeout   | WEP-9        |

Successor: [`011-mise-sdd-cli`](../011-mise-sdd-cli/) (mise hub, `spec test`, `task_runner`).

See [`tasks.md`](./tasks.md).
