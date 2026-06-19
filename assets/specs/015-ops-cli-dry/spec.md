<!-- markdownlint-disable-file -->

# DRY Refactoring of Ops CLI and Governance I/O

**Feature Branch**: `015-ops-cli-dry`
**Release**: v0.10.0
**Status**: Draft

**Input**: assets/specs/014-ops-cli-kernel refactoring patterns applied to remaining mise-invoked scripts.

## Introduction

This feature aims to propagate the DRY (Don't Repeat Yourself), normalization, and safety patterns established in the `014-ops-cli-kernel` feature to all remaining `mise`-invoked scripts and governance modules. This includes:
1. Converting `spec_kit.script.ts` to use `runBinMain` and a declarative `actionMap`.
2. Normalizing linter, trace, and macos installer scripts to parse CLI arguments using the `usage_env` module.
3. Aligning catalog/spec command arguments in `mise.toml` to trust Mise environment variables.
4. Adopting safe functional file read/parse patterns (`neverthrow` Result wrappers) in `audit_core.script.ts`, `resolve_catalog_key.script.ts`, and `catalog_paths.util.ts`.
5. Scaffolding a `@kb/shared` workspace package to relocate shared logging and utilities, eliminating boundary violations and raw console logging across all ops files.

## Out of scope

- Changing the underlying behavior/logic of the linter, tracer, installer, or audit rules (strictly structural and interface refactoring).
- Re-architecting the Electrobun client application logic.

## Glossary

| Term | Meaning |
| ---- | ------- |
| `runBinMain` | Shared entry point for ops scripts that configures logging and safely handles sync/async execution. |
| `usage_env`  | Kernel module that parses CLI options passed by Mise via standard `usage_*` environment variables. |
| `Result`     | Safe functional container from `neverthrow` representing success (`ok`) or failure (`err`). |
| `@kb/shared` | A low-level workspace package that contains shared logging and foundational utilities, accessible by all packages. |

---

## REQUIREMENT OCD-1: Spec Kit Refactoring

**User story:** As a developer running Spec Kit verbs, I want `spec_kit.script.ts` to run through `runBinMain` and route subcommands declaratively so that the script is resilient, standard, and easy to maintain.

### Acceptance criteria

1. WHEN `spec kit` commands are run, THEN `spec_kit.script.ts` SHALL execute via `runBinMain` and configure logging.
   - **Measure:** Logging configured before subcommand execution, no direct `process.argv` parsing.
   - **Evidence:** `bun packages/ops/src/bin/spec_kit.script.ts --help`

2. WHEN subcommands are routed, THEN `spec_kit.script.ts` SHALL use a declarative `actionMap` mapping verb names to runner functions.
   - **Measure:** Zero manual `switch` blocks for routing subcommands.
   - **Evidence:** Code verification of `actionMap` in `spec_kit.script.ts`.

3. WHEN variables like `--dry-run`, `--approve`, `--loop`, `--json`, and `--raw` are parsed, THEN `spec_kit.script.ts` SHALL use `usageFlags` and `usageStrings` to extract them from the environment.
   - **Measure:** No manual string indexing checks on `process.argv` or `Bun.argv`.
   - **Evidence:** Code verification.

---

## REQUIREMENT OCD-2: Linter, Tracer, and Installer Argument Normalization

**User story:** As a Spec Kit user, I want the linter, tracer, and macOS installer scripts to parse parameters via `usage_env` so that command execution is consistent across all entry points.

### Acceptance criteria

1. WHEN `lint.script.ts`, `trace.script.ts`, and `macos_app.script.ts` run, THEN they SHALL parse flags and parameters via `usageFlags` and `usageStrings`.
   - **Measure:** 0 references to manual `process.argv` indices (e.g. `args.indexOf('--root')` or `args.includes('--strict')`) for flag resolution.
   - **Evidence:** `bun packages/ops/src/governance/specs/lint.script.ts --help`

2. WHEN invoked directly in a terminal without Mise, THEN the scripts SHALL fall back gracefully to parsing positional arguments via custom fallback extraction.
   - **Measure:** Ability to run the scripts both with and without Mise environment variables.
   - **Evidence:** `bun packages/ops/src/governance/specs/lint.script.ts assets/specs/015-ops-cli-dry`

3. WHEN logging messages or errors inside `macos_app.script.ts`, THEN it SHALL use `getLogger(['kb', 'ops', 'macos_app'])` instead of raw `console.log` or `console.error`.
   - **Measure:** 0 raw `console.*` outputs in the runtime script.
   - **Evidence:** Code verification.

---

## REQUIREMENT OCD-3: Mise Catalog Argument Consolidation

**User story:** As an operator, I want all tasks in `mise.toml` to specify standard `usage` definitions and let Mise handle argument mapping, so that command-line interfaces are fully declarative.

### Acceptance criteria

1. WHEN spec/catalog tasks run via Mise, THEN all positional arguments SHALL be resolved using `usage_strings` and `usage_flags` where possible.
   - **Measure:** 0 tasks using manual bash positional arguments (`$1`, `$@`) in `mise.toml` for spec/catalog commands.
   - **Evidence:** Code verification of `mise.toml`.

---

## REQUIREMENT OCD-4: Functional I/O in Governance Modules

**User story:** As a governance reviewer, I want file operations in core modules to use typed `neverthrow` Result wrappers so that missing or malformed files fail gracefully without throwing unhandled exceptions.

### Acceptance criteria

1. WHEN synchronous file reads are needed, THEN the shared utility `text_file.script.ts` SHALL export `readTextFileSync` and `readTextLinesSync` returning typed `neverthrow` Results.
   - **Measure:** Safe, functional typed interface for synchronous file I/O operations.
   - **Evidence:** `bun test packages/ops/src/support/lib/shared/text_file.script.spec.ts`

2. WHEN checking spec/handoff files in `audit_core.script.ts`, `resolve_catalog_key.script.ts`, and `catalog_paths.util.ts`, THEN they SHALL read content using `readTextFileSync` or `readTextLinesSync`.
   - **Measure:** 0 references to raw `fs.readFileSync` or unchecked `fs.existsSync` inside these files.
   - **Evidence:** Code verification.

---

## REQUIREMENT OCD-5: Shared Package Scaffolding & Logging Migration

**User story:** As a developer, I want a dedicated `@kb/shared` workspace package to house logging configuration and basic primitives so that they can be reused across all workspace packages (`@kb/flow`, `@kb/exec`, `@kb/ops`) without violating architectural boundaries.

### Acceptance criteria

1. WHEN `@kb/shared` is initialized, THEN it SHALL exist under `packages/shared/` as a private workspace package with standard package configuration and compiler exports.
   - **Measure:** `packages/shared/package.json` contains name `@kb/shared` and exports `./logging`.
   - **Evidence:** Package is recognized by Bun workspaces and compiles successfully.

2. WHEN executing logging configuration in `@kb/ops` or `@kb/exec`, THEN they SHALL import shared logging utilities from `@kb/shared/logging` instead of local copies or raw dependencies.
   - **Measure:** Configuration and main logger retrieval are centralized.
   - **Evidence:** Code verification.

3. WHEN logging messages, warnings, or operational errors in `lint.script.ts`, `trace.script.ts`, `macos_app.script.ts`, and `spec_kit.script.ts`, THEN they SHALL use LogTape `getLogger` instead of raw `console.log` or `console.error` (except for piping-safe report stdout).
   - **Measure:** Zero raw `console.error` calls for diagnostic output or warnings.
   - **Evidence:** Running the scripts with `LOG_LEVEL=info` prints messages through configured sinks.

---

## E2e declaration (optional — pointers only)

Not applicable. This feature refactors internal ops CLI scripts and governance
I/O; acceptance is covered by unit/integration specs (see Evidence column), not
by Playwright e2e. Predecessor ops/CLI features (e.g. `011-mise-sdd-cli`) follow
the same convention and declare no e2e scenarios.

## Open Questions (optional)

| #    | Question | Status | Notes |
| ---- | -------- | ------ | ----- |
| OQ-1 | None     | Closed |       |
