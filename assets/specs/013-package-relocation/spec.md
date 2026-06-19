<!-- markdownlint-disable-file -->

# Package Relocation & Workspace Reorganization

**Feature Branch**: `013-package-relocation`
**Release**: v0.15.8 (target)
**Status**: Draft

**Input**: Reorganize the codebase's package structure to rename the existing packages to `@kb/flow` and `@kb/exec`, and relocate the repository automation code under `tools/` to a new workspace package named `@kb/ops` under `packages/ops/` using root-level shims under `bin/` for CLI compatibility.

## Introduction

Currently, this repository features supporting packages under `packages/` with long names (`workflow-core` and `workflow-runtime`) and maintains repository-wide automation code in a separate root directory `tools/` that does not follow the Bun workspace package layout.

This spec defines a reorganization strategy that does the following:
1. Renames the workflow packages to `@kb/flow` and `@kb/exec` for brevity.
2. Packages the entire tooling and automation infrastructure under `packages/ops` as the `@kb/ops` package.
3. Preserves simple root-level commands by placing thin, zero-logic TypeScript dispatch stubs under a root `/bin/` folder.
4. Updates all configurations (workspaces, tsconfig paths, linters, and quality gates) to reflect and enforce the new architecture.

## Out of scope

- Moving the main product source code under `src/` to a workspace package.
- Modifying the underlying behavior or features of the tooling scripts (e.g. changing how `spec lint` or `e2e` metrics work).
- Upgrading Bun, Electrobun, or other core dependencies as part of this PR.

## Glossary

| Term | Meaning |
| ---- | ------- |
| **`@kb/flow`** | Workspace package representing the pure workflow specification (formerly `@kb/workflow-core`). |
| **`@kb/exec`** | Workspace package representing the imperative workflow execution runtime (formerly `@kb/workflow-runtime`). |
| **`@kb/ops`** | New workspace package representing repository operations and automation (formerly `tools/` directory). |
| **Root shubs / stubs** | Lightweight TypeScript files under `/bin/` at the root that immediately import and execute logic from `@kb/ops`. |

---

## REQUIREMENT PR-1: Rename existing packages to `@kb/flow` and `@kb/exec`

**User story:** As a developer working on the codebase, I want package names to be short, single-word nouns so that imports are brief and easy to write.

### Acceptance criteria

1. WHEN importing workflow core modules, THEN they SHALL be imported from `@kb/flow` (physical folder: `packages/flow`).
   - **Measure:** Search of the codebase confirms no remaining imports of `@kb/workflow-core`.
   - **Evidence:** `bun test` passes and `bun run typecheck` exits 0.

2. WHEN importing workflow runtime modules, THEN they SHALL be imported from `@kb/exec` (physical folder: `packages/exec`).
   - **Measure:** Search of the codebase confirms no remaining imports of `@kb/workflow-runtime`.
   - **Evidence:** `bun test` passes and `bun run typecheck` exits 0.

3. WHEN `@kb/exec` declares dependencies, THEN it SHALL depend on `@kb/flow` using workspace protocol in its `package.json`.
   - **Measure:** `packages/exec/package.json` contains `"@kb/flow": "workspace:*"`.
   - **Evidence:** `bun run lint:biome` and `bun install` complete successfully.

---

## REQUIREMENT PR-2: Relocate `tools/` directory to `@kb/ops`

**User story:** As a maintainer, I want all repository tooling and automation code to reside in a standard workspace package `@kb/ops` so that all shared logic is cleanly packaged.

### Acceptance criteria

1. WHEN running repository operations, THEN the underlying domain logic (governance, orchestration, metrics, dev utilities) SHALL reside in the `packages/ops/` package (package name: `@kb/ops`).
   - **Measure:** The `tools/` root directory is removed, and files are relocated under `packages/ops/src/`.
   - **Evidence:** Files are present under `packages/ops/src/` and verified by layout check.

2. WHEN tools script modules import from one another, THEN they SHALL import via relative paths inside `@kb/ops` or via the `@kb/ops` namespace.
   - **Measure:** Dependency analysis confirms no legacy circular or invalid path references.
   - **Evidence:** `bun run lint:depcruise` completes without violations.

---

## REQUIREMENT PR-3: Root `bin/` dispatch shims

**User story:** As an operator running `mise` or package tasks, I want to execute command-line tools without typing long workspace package paths.

### Acceptance criteria

1. WHEN running command-line tooling, THEN the commands SHALL be dispatched via thin TypeScript stubs under `bin/` at the root.
   - **Measure:** `bin/test.script.ts`, `bin/app.script.ts`, `bin/catalog.script.ts`, and `bin/spec.script.ts` exist under the root `bin/` folder.
   - **Evidence:** File presence checks.

2. WHEN a root stub is executed, THEN it SHALL immediately delegate the execution to its corresponding runner in the `@kb/ops` package.
   - **Measure:** The root stubs contain no domain logic and only perform a direct dynamic or static import + execution call.
   - **Evidence:** `bun bin/spec.script.ts lint assets/specs/013-package-relocation --strict` exits with 0.

---

## REQUIREMENT PR-4: Update workspace and quality configurations

**User story:** As a maintainer, I want the codebase's validation, linting, and path configurations to adapt to the new package layout so that our quality gates enforce it.

### Acceptance criteria

1. WHEN path resolution runs, THEN the compiler and bundler SHALL resolve `@kb/flow`, `@kb/exec`, and `@kb/ops` to their respective workspace locations.
   - **Measure:** `tsconfig.json` at root maps these packages correctly.
   - **Evidence:** `bun run typecheck` exits 0.

2. WHEN dependency boundaries are checked, THEN `packages/ops/` non-dev files SHALL NOT import from `src/`, and `src/` SHALL NOT import from `packages/ops/`.
   - **Measure:** `.dependency-cruiser.cjs` is updated with forbidden rules mapping `@kb/ops` to the same constraints previously applied to `tools/`.
   - **Evidence:** `bun run lint:depcruise` exits 0.

3. WHEN file naming is checked, THEN suffix rules (.script.ts, etc.) SHALL continue to be enforced under `packages/ops/`.
   - **Measure:** `.ls-lint.yml` and ast-grep rules are updated to target `packages/ops/` instead of `tools/`.
   - **Evidence:** `bun run lint:ls` and `bun run lint:ast-grep` exit 0.

---

---

## Future Follow-up Requirements (Out of Scope for current branch)

The following requirements are identified for subsequent execution (Phase 2 Reorganization):

### REQUIREMENT PR-5: Relocate Non-Code Assets back to root-level `tools/`
**User story:** As a developer, I want rules, reports, and expectations to reside in a dedicated, workspace-wide `tools/` directory outside the TypeScript package sources to clarify their scope and prevent TS compiler clutter.
1. WHEN files are static rules, reports, or test expectations, THEN they SHALL be placed in a dedicated subdirectory under `tools/` at the root (e.g. `tools/governance/policies/`, `tools/inventory/`, `tools/metrics/baselines/`, `tools/orchestration/fixtures/`).
   - **Measure:** No `.yml`, `.csv`, `.md` specs, or `.json` baseline files remain inside `packages/ops/src/` or `tools/ops/`.
   - **Evidence:** `tools/` contains `governance/`, `inventory/`, `metrics/`, and `orchestration/` directories, and all scripts resolve paths correctly.

### REQUIREMENT PR-6: Isolate dev-time utility code as `@kb/dev`
**User story:** As a maintainer, I want build, preview, and development tools isolated in their own package `@kb/dev` so that `@kb/ops` is entirely decoupled from the product source code.
1. WHEN code supports the development, preview, or compilation of the application, THEN it SHALL reside in `@kb/dev` (physical directory: `packages/dev/`).
   - **Measure:** All code in `packages/ops/src/dev/` is moved to `packages/dev/src/`.
   - **Evidence:** `@kb/ops` has zero imports of `@core`, `@shared`, `@shell`, `@rpc`, or relative `src/` paths, and the dependency cruiser enforces this boundary.

---

## E2e declaration

No user-facing feature additions or UI changes occur in this release. Therefore, E2E Gherkin acceptance criteria are out of scope. The release will be validated via the automated spec gates, quality gates, and typechecks.
