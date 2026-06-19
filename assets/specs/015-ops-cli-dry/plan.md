# Implementation Plan: Ops CLI and Governance DRY Refactoring

Refactor the remaining `mise`-invoked ops scripts and governance modules to adopt standard CLI kernel helpers (`runBinMain`, `usageFlags`, `usageStrings`) and functional safe file reading (`neverthrow` Result wrappers), and scaffold a shared logging workspace package.

## User Review Required

> [!IMPORTANT]
> **Scaffolding `@kb/shared`:** We will introduce a new workspace package `packages/shared/` to act as a low-level shared package for configuration and logging. This resolves package boundary conflicts (preventing `@kb/ops` or `@kb/exec` from importing directly from the main product source `src/`).

## Open Questions

> [!NOTE]
> All design decisions have been aligned during brainstorming.

## Proposed Changes

---

### Component: Shared Primitives and Packages

We will scaffold the `@kb/shared` workspace package, configure TS paths, and move/centralize shared logging.

#### [NEW] [package.json](file:///Users/roalcantara/Work/bun/kb/packages/shared/package.json)
* Initialize as a private workspace package named `@kb/shared` exporting `./logging` and containing `@logtape/logtape` and `neverthrow`.

#### [NEW] [tsconfig.json](file:///Users/roalcantara/Work/bun/kb/packages/shared/tsconfig.json)
* Basic compiler configuration matching workspace standards.

#### [NEW] [index.ts](file:///Users/roalcantara/Work/bun/kb/packages/shared/src/logging/index.ts)
* Move the central `configureOpsLogging` and general LogTape configurations here.

#### [MODIFY] [tsconfig.json](file:///Users/roalcantara/Work/bun/kb/tsconfig.json)
* Add path mappings:
  - `"@kb/shared": ["./packages/shared/src/index.ts"]`
  - `"@kb/shared/*": ["./packages/shared/src/*"]`

#### [MODIFY] [package.json](file:///Users/roalcantara/Work/bun/kb/package.json)
* Include `packages/shared` in the `workspaces` array.

#### [MODIFY] [package.json](file:///Users/roalcantara/Work/bun/kb/packages/ops/package.json)
* Add `@kb/shared` as a workspace dependency.

#### [MODIFY] [package.json](file:///Users/roalcantara/Work/bun/kb/packages/exec/package.json)
* Add `@kb/shared` as a workspace dependency.
* Add `"neverthrow": "catalog:"` to the `dependencies` block.

#### [MODIFY] [ops_logging.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/ops/src/support/lib/cli/ops_logging.script.ts)
* Re-export `configureOpsLogging` from `@kb/shared/logging` to maintain backwards compatibility.

#### [MODIFY] [text_file.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/ops/src/support/lib/shared/text_file.script.ts)
* Implement `readTextFileSync(path: string): Result<string, Error>` using `node:fs`'s `readFileSync` inside a try/catch mapping to `neverthrow`'s `ok`/`err`.
* Implement `readTextLinesSync(path: string, mode: 'first' | 'all'): Result<string | string[], Error>` leveraging `readTextFileSync`.

#### [MODIFY] [text_file.script.spec.ts](file:///Users/roalcantara/Work/bun/kb/packages/ops/src/support/lib/shared/text_file.script.spec.ts)
* Add unit tests for `readTextFileSync` and `readTextLinesSync` covering successful reads, nonexistent files, and correct result typing.

---

### Component: Governance Modules & Core Utilities

Update the core governance modules to use functional file operations, normalize CLI argument parsing, and adopt LogTape logging.

#### [MODIFY] [catalog_paths.util.ts](file:///Users/roalcantara/Work/bun/kb/packages/exec/src/catalog_paths.util.ts)
* Load the YAML file using a functional sync read that returns a `Result<string, Error>`.
* Safely parse the YAML content, propagating any errors as descriptive validation failures or throw a structured error if loading fails.

#### [MODIFY] [audit_core.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/ops/src/governance/specs/audit_core.script.ts)
* Load `handoff.md`, `tasks.md`, and `spec.md` using `readTextFileSync`.
* Replace `fs.existsSync` checks with Result-based branching where a file load error indicates missing files, returning error findings instead of throwing.

#### [MODIFY] [resolve_catalog_key.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/ops/src/governance/specs/resolve_catalog_key.script.ts)
* Read `assets/catalog/catalog.yaml` via `readTextFileSync`.
* Handle missing catalog warnings based on `Result` failure instead of a direct `fs.existsSync` check.
* Replace raw `console.error` with a logger from `@kb/shared/logging`.

#### [MODIFY] [lint.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/ops/src/governance/specs/lint.script.ts)
* Use `usageFlags(process.env, ['strict', 'all'])` and `usageStrings(process.env, ['root'])`.
* Keep a clean fallback to positional argument parsing when env variables are not set.
* Replace raw `console.error` calls for usage diagnostics with a logger from `@kb/shared/logging`.

#### [MODIFY] [trace.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/ops/src/governance/specs/trace.script.ts)
* Use `usageFlags(process.env, ['strict'])` and `usageStrings(process.env, ['features'])`.
* Fall back to standard positional checks if env variables are not set.
* Replace raw `console.error` calls for usage diagnostics with a logger from `@kb/shared/logging`.

---

### Component: Bin Command Dispatchers

Optimize command dispatching stubs to use the kernel-style dispatcher.

#### [MODIFY] [spec_kit.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/ops/src/bin/spec_kit.script.ts)
* Executed via `runBinMain(fn)`.
* Routes subcommands using a declarative `actionMap: Record<string, () => Promise<number | undefined> | number | undefined>`.
* Resolves flags (`--dry-run`, `--approve`, `--loop`, `--json`, `--raw`) and feature directories using `usageFlags` and `usageStrings`.
* Replace raw `console` error messages with a logger from `@kb/shared/logging`.

#### [MODIFY] [macos_app.script.ts](file:///Users/roalcantara/Work/bun/kb/packages/ops/src/bin/macos_app.script.ts)
* Resolve commands via `usageCmd` and flags via `usageStrings`.
* Replace all `console.log`/`console.error` calls with a logger from `@kb/shared/logging`.

---

### Component: Declarative CLI Configuration

#### [MODIFY] [mise.toml](file:///Users/roalcantara/Work/bun/kb/mise.toml)
* Audit and align all commands under `spec` and `catalog` tasks to define declarative `usage` inputs and flags, eliminating hardcoded bash positional arguments where possible.

---

## Verification Plan

### Automated Tests
- Run unit tests for the I/O helpers:
  ```bash
  bun test packages/ops/src/support/lib/shared/text_file.script.spec.ts
  ```
- Run unit tests for the modified governance files:
  ```bash
  bun test packages/ops/src/governance/specs/audit_core.script.spec.ts
  bun test packages/ops/src/governance/specs/resolve_catalog_key.script.spec.ts
  ```
- Run the full quality and spec validation gate:
  ```bash
  mise run spec ready assets/specs/015-ops-cli-dry --key ops_cli_dry
  ```

### Manual Verification
- Test direct invocation of the linter and tracer on a valid spec path:
  ```bash
  bun packages/ops/src/governance/specs/lint.script.ts assets/specs/015-ops-cli-dry --strict
  bun packages/ops/src/governance/specs/trace.script.ts assets/specs/015-ops-cli-dry --strict
  ```
- Verify `spec kit` verbs route and run successfully via the action map:
  ```bash
  mise run spec kit next assets/specs/015-ops-cli-dry --dry-run
  ```
