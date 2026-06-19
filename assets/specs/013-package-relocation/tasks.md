# Tasks — package-relocation

## Phase 1: Rename Workspace Packages

- [x] Move `packages/workflow-core` to `packages/flow`
- [x] Update `packages/flow/package.json` package name and exports to `@kb/flow`
- [x] Update `packages/flow/tsconfig.json`
- [x] Move `packages/workflow-runtime` to `packages/exec`
- [x] Update `packages/exec/package.json` package name, dependencies, and exports to `@kb/exec`
- [x] Update `packages/exec/tsconfig.json`
- [x] Search-and-replace all codebase references and imports from `@kb/workflow-core` to `@kb/flow`
- [x] Search-and-replace all codebase references and imports from `@kb/workflow-runtime` to `@kb/exec`

## Phase 2: Relocate Tools Directory

- [x] Create `packages/ops` directory structure
- [x] Relocate contents of `tools/` to `packages/ops/src/`
- [x] Create `packages/ops/package.json` and `packages/ops/tsconfig.json`
- [x] Relocate `tools.manifest.toml` to `packages/ops/tools.manifest.toml`
- [x] Update internal tooling imports within `packages/ops/src/` to use relative paths or `@kb/ops` imports
- [x] Update `packages/ops/src/governance/policies/layout_validate.script.ts` to inspect `packages/ops/src/` instead of `tools/`

## Phase 3: Root `bin/` CLI Shims

- [x] Create root `bin/` directory
- [x] Create `bin/test.script.ts` shim forwarding to `@kb/ops`
- [x] Create `bin/app.script.ts` shim forwarding to `@kb/ops`
- [x] Create `bin/spec.script.ts` shim forwarding to `@kb/ops`
- [x] Create `bin/catalog.script.ts` shim forwarding to `@kb/ops`
- [x] Create `bin/skill.script.ts` shim forwarding to `@kb/ops`
- [x] Create `bin/hooks.script.ts` shim forwarding to `@kb/ops`
- [x] Create `bin/macos_app.script.ts` shim forwarding to `@kb/ops`
- [x] Create `bin/tools_inventory_report.script.ts` shim forwarding to `@kb/ops`

## Phase 4: Global Configurations

- [x] Update root `package.json` scripts
- [x] Update root `tsconfig.json` path mappings and includes
- [x] Update `mise.toml` tasks to reference `bin/` and new `@kb/ops` paths
- [x] Update `.ls-lint.yml` to reflect new directory paths and rules
- [x] Update `.dependency-cruiser.cjs` to enforce rules on `@kb/ops`
- [x] Update `biome.jsonc` to target `packages/ops/src/`
- [x] Update internal spawns inside package code (e.g. `packages/exec/src/orchestrated_handoff.script.ts`) to use `bin/` path
- [x] Clean up and delete original legacy `tools/` and package folders

## Phase 5: Verification & Quality Gate (Phase 1)

- [x] Run `bun run typecheck` to verify TypeScript compilation
- [x] Run `bun test` to execute all unit/integration tests
- [x] Run `mise run lint check` to verify formatting and linting
- [x] Run `mise run spec gate assets/specs/013-package-relocation --strict`

---

## Phase 6: Workspace Reorganization Follow-ups (Phase 2 Layout Improvements)

### 6.1. Relocate Non-Code Workspace-Wide Assets directly to Root `tools/`
*This task moves files out of the temporary intermediate `tools/ops/` directory directly into root `tools/`.*
- [x] Relocate ast-grep rules (`tools/ops/governance/policies/ast-grep/*.rule.yml`) directly to `tools/governance/policies/ast-grep/`
  - **Acceptance Criteria**: All 21 ast-grep rules are present under `tools/governance/policies/ast-grep/`.
- [x] Relocate container structure test config (`tools/ops/governance/policies/container-structure-test.yml`) directly to `tools/governance/policies/container-structure-test.yml`
  - **Acceptance Criteria**: Config exists at that path.
- [x] Relocate CSV inventory reports (`tools/ops/inventory/*.csv`) directly to `tools/inventory/`
  - **Acceptance Criteria**: Both inventory CSVs exist under `tools/inventory/`.
- [x] Relocate baseline metrics (`tools/ops/metrics/baselines/` recursively) directly to `tools/metrics/baselines/`
  - **Acceptance Criteria**: All baseline and fixture JSON files exist under `tools/metrics/baselines/` and `tools/metrics/fixtures/`.
- [x] Relocate act event fixtures (`tools/ops/orchestration/fixtures/act/event.json`) directly to `tools/orchestration/fixtures/act/event.json`
  - **Acceptance Criteria**: Act fixture exists at that path.
- [x] Relocate backlog and spec files (`tools/ops/governance/dependency_upgrade_backlog.yaml`, `tools/ops/governance/specs/PLAN_PUNCHLIST.md`, `tools/ops/governance/specs/mise-tasks.snippet.toml`) directly to `tools/governance/` and `tools/governance/specs/`
  - **Acceptance Criteria**: Files exist at their new root-level tools locations.
- [x] Update paths in `packages/ops/src/bin/tools_inventory_report.script.ts` to read/write `tools/inventory/` paths
  - **Acceptance Criteria**: Inventory report script correctly writes to `tools/inventory/tools_file_inventory.csv`.
- [x] Update paths in `packages/ops/src/metrics/harnesses/perf/perf.script.ts` to read baseline from `tools/metrics/baselines/perf/baseline.json`
  - **Acceptance Criteria**: Baseline script correctly reads baseline from `tools/metrics/baselines/perf/baseline.json`.
- [x] Adjust global configurations (`biome.jsonc`, `tsconfig.json`, `.dependency-cruiser.cjs`, `.ls-lint.yml`) to allow the root `tools/` directory and exclude it from TypeScript compiler passes (purely declarative asset folder)
  - **Acceptance Criteria**: Global configs target `tools/` instead of `tools/ops/`, and do not compile any assets under `tools/`.
- [x] Delete temporary `tools/ops/` directory
  - **Acceptance Criteria**: `tools/ops/` is completely removed.

### 6.2. Decouple Dev-Time Utilities to `@kb/dev`
*This task has been initially implemented but requires verification and clean updates.*
- [x] Create workspace package directory `packages/dev/`
- [x] Create `packages/dev/package.json` defining `@kb/dev` and dependencies on `@kb/flow` and `@kb/exec`
- [x] Create `packages/dev/tsconfig.json` for compilation scope
- [x] Move `packages/ops/src/dev/` directory contents to `packages/dev/src/`
- [x] Delete legacy directory `packages/ops/src/dev/`
- [x] Update root `package.json` to declare `packages/dev` in workspaces
- [x] Update root `tsconfig.json` path mappings for `@kb/dev`
- [x] Update imports of `rendererLogEnvPlugin` and `tsconfigPathsPlugin` in `electrobun.config.ts` to import from `@kb/dev`
- [x] Update imports of preview server in `bdd/e2e/support/preview_with_fixture.support.ts` and `perf.script.ts`
- [x] Update preview server smoke test path inside `.agents/skills/app-quality-gate/scripts/gate.sh`
- [x] Update `.ls-lint.yml` to support naming rules under `packages/dev/src/`
- [x] Update `.dependency-cruiser.cjs` rules:
  - Strict boundary: `@kb/ops` must have **zero** imports from `src/` (completely decoupled)
  - Allow `@kb/dev` to import from `src/` (coupling allowed specifically for bundling plugins/preview servers)

### 6.3. Verification & Quality Gate
- [x] Run `bun run typecheck` to verify all packages compile cleanly
  - **Acceptance Criteria**: Compilation completes with zero errors.
- [x] Run `bun test` to ensure all tests pass (1321 + any new dev package tests)
  - **Acceptance Criteria**: Tests pass cleanly.
- [x] Run `mise run lint check` to verify all static analysis checks pass
  - **Acceptance Criteria**: Static analysis exits with 0 (Biome, knip, ls-lint, depcruise, jscpd, ast-grep).
- [x] Run `bash .agents/skills/app-quality-gate/scripts/gate.sh` to confirm the full quality gate passes
  - **Acceptance Criteria**: The quality gate runner exits 0.
