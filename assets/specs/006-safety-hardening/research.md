# Research: Safety Hardening (006)

## Decision: Delegate Raw Secret Scanning to `hk` Gitleaks Builtin
- **Decision**: Instead of building a bespoke entropy scanner for raw secrets, we will use the industry-standard Gitleaks via the `hk` builtin.
- **Rationale**: Gitleaks is highly optimized, widely used, and already supported as a builtin in our hook manager (`hk`). This reduces project maintenance while increasing detection accuracy for standard secrets (API keys, tokens).
- **Alternatives considered**: Custom Shannon-entropy scanner (kept as a secondary heuristic for project-specific patterns but dropped for raw secrets).

## Decision: Use `ts-morph` for Electrobun Config AST Parsing
- **Decision**: Use `ts-morph` to parse and validate `electrobun.config.ts`.
- **Rationale**: `ts-morph` provides a robust, high-level API for navigating TypeScript source files. It allows us to reliably detect Electrobun view declarations and verify security settings (`sandbox`, `partition`, `navigation`) without fragile regex.
- **Alternatives considered**: `@babel/parser` (too low-level), simple regex (unreliable for nested config objects).

## Decision: Parse Lockfile Deltas via `git diff`
- **Decision**: To identify dependency changes, we will parse the output of `git diff --name-only --staged bun.lock`.
- **Rationale**: This allows the dependency check to focus only on added or version-bumped packages in the current commit/PR, rather than scanning the entire lockfile every time.
- **Alternatives considered**: Full lockfile parse and object comparison.

## Decision: Atomic NDJSON Append for Run Events
- **Decision**: Use `O_APPEND` flag for all security event logging.
- **Rationale**: This ensures that even if multiple security runs occur concurrently (e.g. parallel CI jobs or hooks), individual JSON lines remain intact and uncorrupted.
- **Alternatives considered**: Database logging (too heavy for local-first tooling).

## Decision: Consolidate Verification into `mise run spec ready`
- **Decision**: Create a single command that chains tag tests, catalog validation, hooks, and the spec gate.
- **Rationale**: This provides a "single source of truth" for what it means to be "ready" to claim a feature done, reducing the cognitive load on developers and ensuring no gate is accidentally skipped.
- **Alternatives considered**: Listing individual commands in documentation (error-prone).
