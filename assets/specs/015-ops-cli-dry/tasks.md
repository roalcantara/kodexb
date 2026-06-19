# Tasks: Ops CLI and Governance DRY Refactoring

## Phase 0: Baseline & Dependency Verification
- [x] **T010: Add dependencies to packages/exec**
  - Add `"neverthrow": "catalog:"` to `packages/exec/package.json`
  - Success Metric: `bun test packages/exec/src/catalog_paths.util.spec.ts` passes.
- [x] **T020: Verify feature branch state**
  - Ensure spec folder structure and current branch match `015-ops-cli-dry`
  - Success Metric: Git branch is `015-ops-cli-dry`.
- [x] **T030: Scaffold @kb/shared workspace package**
  - Create `packages/shared/package.json` and `packages/shared/tsconfig.json`
  - Include `packages/shared` in root `package.json` workspaces
  - Add TS paths `@kb/shared` and `@kb/shared/*` mapping to `packages/shared/src/` in root `tsconfig.json`
  - Move logging setup logic to `packages/shared/src/logging/index.ts` and re-export in `packages/ops/src/support/lib/cli/ops_logging.script.ts`
  - Add `@kb/shared` to `dependencies` of `packages/ops/package.json` and `packages/exec/package.json`
  - Run `bun install`
  - Success Metric: Workspace packages compile cleanly and can import `@kb/shared/logging`.

## Phase 1: Shared Functional I/O Helpers
- [x] **T110: Implement synchronous text_file helpers**
  - Open `packages/ops/src/support/lib/shared/text_file.script.ts`
  - Implement `readTextFileSync(path: string): Result<string, Error>`
  - Implement `readTextLinesSync(path: string, mode: 'first' | 'all'): Result<string | string[], Error>`
  - Success Metric: TypeScript compilation succeeds with strict typings.
- [x] **T120: Create unit test coverage**
  - Add tests to `packages/ops/src/support/lib/shared/text_file.script.spec.ts`
  - Cover successful reads, nonexistent files, line parsing, and exception boundaries
  - Success Metric: `bun test packages/ops/src/support/lib/shared/text_file.script.spec.ts` runs and passes.

## Phase 2: Refactoring Governance Files to Functional I/O
- [x] **T210: Refactor catalog_paths.util.ts**
  - Modify `packages/exec/src/catalog_paths.util.ts` to load paths via a safe Result wrapper
  - Eliminate direct uses of `fs.readFileSync`
  - Success Metric: `bun test packages/exec/src/catalog_paths.util.spec.ts` passes.
- [x] **T220: Refactor audit_core.script.ts**
  - Open `packages/ops/src/governance/specs/audit_core.script.ts`
  - Replace direct file reads and presence checks with `readTextFileSync` and `readTextLinesSync` Result-based logic
  - Success Metric: `bun test packages/ops/src/governance/specs/audit_core.script.spec.ts` passes.
- [x] **T230: Refactor resolve_catalog_key.script.ts**
  - Open `packages/ops/src/governance/specs/resolve_catalog_key.script.ts`
  - Load the catalog YAML text using `readTextFileSync`
  - Success Metric: `bun test packages/ops/src/governance/specs/resolve_catalog_key.script.spec.ts` passes.

## Phase 3: CLI Argument Parsing Normalization
- [x] **T310: Refactor lint.script.ts argument parsing**
  - Replace manual `process.argv` checks inside `lint.script.ts` with `usageFlags` and `usageStrings`
  - Retain fallback logic to support direct terminal command runs
  - Success Metric: Linter runs successfully via `bun packages/ops/src/governance/specs/lint.script.ts assets/specs/015-ops-cli-dry --strict`.
- [x] **T320: Refactor trace.script.ts argument parsing**
  - Replace manual `process.argv` checks inside `trace.script.ts` with `usageFlags` and `usageStrings`
  - Retain fallback logic to support direct terminal command runs
  - Success Metric: Tracer runs successfully via `bun packages/ops/src/governance/specs/trace.script.ts assets/specs/015-ops-cli-dry --strict`.
- [x] **T330: Refactor macos_app.script.ts argument parsing**
  - Parse actions and modes via `usageCmd` and `usageStrings`
  - Success Metric: `bun packages/ops/src/bin/macos_app.script.ts help` exits cleanly.

## Phase 4: Spec Kit Action Mapping
- [x] **T410: Refactor spec_kit.script.ts dispatcher**
  - Wrap script in `runBinMain`
  - Reorganize verb routing from switch cases to a declarative `actionMap`
  - Extract `--dry-run`, `--approve`, `--loop`, `--json`, `--raw`, and feature path using `usageFlags` and `usageStrings`
  - Success Metric: `mise run spec kit next --dry-run` outputs the planned verb.

## Phase 5: Declarative Mise Task Definitions & Logging Migration
- [x] **T510: Refactor spec and catalog tasks in mise.toml**
  - Audit tasks in `mise.toml` to remove positional arguments ($1, $@) where they can be resolved via standard usage specs
  - Success Metric: `mise run spec lint` and `mise run catalog ship` run correctly under the consolidated schema.
- [x] **T520: LogTape Migration (OCD-5)**
  - Relocate raw `console.log` / `console.error` calls for diagnostics and operational errors in `lint.script.ts`, `trace.script.ts`, `resolve_catalog_key.script.ts`, `macos_app.script.ts`, and `spec_kit.script.ts` to use `@kb/shared/logging`.
  - Success Metric: Running commands with `LOG_LEVEL=info` outputs logs correctly to standard error.

## Phase 6: Final Verification & Audit Gate
- [x] **T610: Validate full suite and gate checks**
  - Run the full spec gate:
    ```bash
    mise run spec ready assets/specs/015-ops-cli-dry --key ops_cli_dry
    ```
  - Verify that no linter rules are bypassed or disabled (0 `biome-ignore`)
  - Success Metric: Output of quality gate command exits 0.
