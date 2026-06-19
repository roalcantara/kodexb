# Handoff: Relocate Non-Code Assets back to Root `tools/`

You are taking over the final phase of the workspace reorganization and package relocation task (`013-package-relocation`).

## Current Status
- **Rename Packages & CLI Shims (Phases 1-3)**: Completed and verified. Shims successfully delegate execution to `@kb/ops` under `packages/ops/`.
- **Decouple `@kb/dev` (Phase 6.2)**: Completed and verified. Dev utilities (preview server, bundler plugins, etc.) have been decoupled into `@kb/dev` under `packages/dev/`.
- **Non-Code Assets (Phase 6.1)**: The previous agent relocated static configurations, rules, and reports into a temporary intermediate folder `tools/ops/`. To preserve the concept that these are workspace-wide assets and keep package spaces clean, they must be moved back to the root `tools/` directory directly.

---

## Instructions for Execution

### 1. Relocate Non-Code Assets to Root `tools/`
Move all files currently under `tools/ops/` directly to their respective root `tools/` subdirectories:
- Move all files under `tools/ops/governance/` to `tools/governance/` (including `tools/ops/governance/policies/ast-grep/` -> `tools/governance/policies/ast-grep/`).
- Move all files under `tools/ops/inventory/` to `tools/inventory/`.
- Move all files under `tools/ops/metrics/` to `tools/metrics/`.
- Move all files under `tools/ops/orchestration/` to `tools/orchestration/`.
- Delete the now-empty `tools/ops/` directory.

### 2. Update Path Constants in Code
- **Inventory Report**: Modify `packages/ops/src/bin/tools_inventory_report.script.ts` to read/write from `tools/inventory/` instead of `tools/ops/inventory/`.
- **Perf Metrics**: Modify `packages/ops/src/metrics/harnesses/perf/perf.script.ts` to read baseline files from `tools/metrics/baselines/perf/baseline.json` instead of `tools/ops/metrics/baselines/perf/baseline.json`.

### 3. Update Configurations
- **Mise tasks**: Search the codebase (specifically `mise.toml`) for any references to `tools/ops/` and update them to target the direct `tools/` paths.
- **TypeScript Config**: Ensure `tsconfig.json` correctly excludes `tools/**/*` (to treat it as a code-free asset directory) and includes `packages/dev/**/*` and `packages/ops/**/*`.
- **ls-lint Config**: Update `.ls-lint.yml` directories to check file-naming rules for the new layout (ensuring correct suffixes for files in `packages/dev/src/` and `tools/` folder structure rules).
- **Dependency Cruiser**: Update `.dependency-cruiser.cjs` to enforce boundaries:
  - `@kb/ops` must have zero imports from the main application `src/`.
  - `@kb/dev` is allowed to import from `src/` to support dev bundling and preview servers.
  - No ts/tsx code files are allowed inside `tools/`.
- **Biome & Git**: Add new/relocated files to git and ensure formatting is correct by running biome checks.

---

## Verification & Quality Gate Checklist

Run the following validation sequence and ensure all checks pass cleanly:
1. **TypeScript Typecheck**:
   ```bash
   bun run typecheck
   ```
2. **Unit & Integration Tests**:
   ```bash
   bun test
   ```
3. **Static Analysis & Linters**:
   ```bash
   mise run lint check
   ```
4. **App Quality Gate (Full Suite)**:
   ```bash
   bash .agents/skills/app-quality-gate/scripts/gate.sh
   ```
