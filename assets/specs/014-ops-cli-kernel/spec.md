<!-- markdownlint-disable-file -->

# Ops CLI kernel (mise-trusted dispatch)

**Feature Branch**: `014-ops-cli-kernel`
**Release**: v0.x
**Status**: Draft

**Input**: Reduce maintenance surface in `@kb/ops` code that `mise run` invokes — `packages/ops/src/bin/**` and selected `governance/**` CLIs — without adding a second CLI parser. Mise `usage` specs remain the sole argument contract; Bun scripts read `usage_*` env and dispatch only.

## Introduction

`@kb/ops` is supporting infrastructure, not product domain. Today, bin stubs duplicate `envBool`, hand-parse `process.argv`, and embed domain logic (for example ~220 lines of spec-audit/style inside `test.script.ts`). Governance entrypoints (`skill_registry`, `perf`, `scan`, `spec_kit`) repeat the same patterns.

This spec delivers one pass: a **thin ops CLI kernel** (shared env readers, subprocess env hygiene, text-file helpers, ops logging), migration of **bin stubs and governance CLIs** that mise invokes, and **removal of the redundant npm `yaml` dependency** in favour of `Bun.YAML`. Single PR scope; no follow-up spec.

## Clarifications

### Session 2026-06-19
- Q: How should the bin scripts behave when executed directly (e.g. `bun bin/test.script.ts`) without `mise` providing `usage_*` variables? → A: Fall back to parsing the subcommand from `process.argv[2]` as `usage_cmd`, with flags defaulting to undefined or empty.
- Q: When replacing the `yaml` package with `Bun.YAML.parse`, how strictly should the parser error messages match the previous npm `yaml` error message strings in `HandoffAllowlistError`? → A: Wrap the thrown native `Error` into `HandoffAllowlistError` and preserve the message body containing the parse error text, but do not strictly match npm-specific error fields/formats.
- Q: How should `routeByUsageCmd` handle an unknown or missing `usage_cmd`? → A: Log a structured error to stderr using `getLogger(['kb', 'ops', 'cli'])` and exit the process with status 1.


## Authority

| Topic                       | Authority                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| Mise task + `usage` shape   | [`MISE_GUIDE.md`](../../guides/MISE_GUIDE.md), `mise.toml`                                     |
| Usage lint / JSON           | `packages/ops/src/bin/policy.script.ts` (`usage lint`, `usage generate json`)                  |
| Planner pattern             | `packages/ops/src/bin/spec.script.ts` (`planSpec`, `cleanEnv`)                                 |
| TypeBox for domain payloads | [`CLAUDE.md`](../../../CLAUDE.md) — not Zod                                                    |
| Logging                     | [`LOGGING_GUIDE.md`](../../guides/LOGGING_GUIDE.md) (extend to `packages/ops` stderr)          |
| YAML parse/stringify        | [`BUN_RUNTIME.md`](../../guides/BUN_RUNTIME.md) — `Bun.YAML.parse` / `Bun.YAML.stringify` only |

## Out of scope

- Re-validating `usage` `choices` enums or boolean flags that mise already enforced on `mise run …`
- Adding Commander, citty, clap-ts, or yargs for mise-invoked paths
- Changing product behaviour of catalog validate, spec audit, e2e, or gates
- Usage codegen (`policy codegen-usage`) — future spec (OCK-6); not in 014
- `workflow_run.script.ts` deep refactor — read-only `usage_*` pass only if not already mise-backed

## Glossary

| Term                    | Meaning                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mise-trusted**        | Values present in `usage_*` after `mise run` are treated as already parsed/validated; scripts coerce shape only, do not re-lint the usage spec |
| **Ops CLI kernel**      | `usage_env`, `stripUsageEnv`, `configureOpsLogging`, `text_file` helpers under `packages/ops/src/support/lib/`                                 |
| **Dispatch-only bin**   | `bin/*.script.ts` files that read env, branch on `usage_cmd`, call governance modules or `spawnInherit` — no domain algorithms                 |
| **Semantic validation** | TypeBox checks for **domain** data (YAML files, JSON payloads, cross-flag rules mise cannot express)                                           |

---

## REQUIREMENT OCK-1: Mise-trusted `usage_*` reading

**Slice:** MVP

**User story:** As a maintainer, I want bin stubs to read mise output without re-implementing the usage parser so I maintain one CLI contract.

### Acceptance criteria

1. WHEN a task is invoked via `mise run <task> …`, THEN bin dispatch code SHALL read flags and subcommands from `usage_*` environment variables and SHALL NOT scan `process.argv` for flags already declared in that task's `usage` spec.
   - **Measure:** No `--strict` / `--json` / `--smoke` argv loops in phase-1 bin files except `spec` nested subcommand routing (011 contract).
   - **Evidence:** `rg 'process\.argv.*--' packages/ops/src/bin/{app,catalog,skill,test}.script.ts` returns no matches; `spec.script.ts` retains argv chain only.

2. WHEN a boolean `usage_*` variable is read, THEN the kernel SHALL map `=== 'true'` only and SHALL NOT run TypeBox `Value.Check` on individual flags mise already types.
   - **Measure:** `usage_env.script.ts` exports `usageFlag` without per-flag schemas.
   - **Evidence:** Co-located `usage_env.script.spec.ts`.

3. WHEN `usage` declares `choices` for a flag or positional, THEN dispatch code SHALL NOT duplicate the allowed set for `mise run` invocations.
   - **Measure:** Invalid enum rejected by `mise run test e2e --scope bogus` before script runs (where applicable); script does not re-list choices.
   - **Evidence:** Manual `mise run … --help` + negative CLI attempt documented in tasks.

4. WHEN subprocesses are spawned from bin/planners, THEN `usage_*` keys SHALL be stripped from the child environment (generalize `cleanEnv` from `spec.script.ts`).
   - **Measure:** `stripUsageEnv` used in `spawnInherit` / planner spawn paths touched in phase 1.
   - **Evidence:** `usage_env.script.spec.ts` asserts stripped keys.

5. WHEN executed directly without `mise` (no `usage_*` env vars), THEN the script SHALL fall back to using `process.argv[2]` as `usage_cmd` for subcommand routing, with all flags defaulting to undefined or empty.
   - **Measure:** Direct debug execution routes subcommands successfully using argv.
   - **Evidence:** Tested in `usage_env.script.spec.ts` and verified by manual run.

6. WHEN multiple `usage_*` variables need to be read, THEN the kernel SHALL support batch retrieval helpers (`usageFlags` and `usageStrings`) to reduce duplication.
   - **Measure:** Helper functions present in `usage_env.script.ts`.
   - **Evidence:** Co-located tests in `usage_env.script.spec.ts`.

---

## REQUIREMENT OCK-2: Dispatch-only `packages/ops/src/bin`

**Slice:** MVP

**User story:** As a maintainer, I want thin bin files so domain logic lives in one governance module per concern.

### Acceptance criteria

1. WHEN `test.script.ts` handles `spec-audit` or `spec-style`, THEN it SHALL delegate to modules under `packages/ops/src/governance/specs/` and the bin file SHALL shrink by at least 150 LOC net.
   - **Measure:** `wc -l packages/ops/src/bin/test.script.ts` decreases; new governance modules have co-located specs.
   - **Evidence:** `bun test` green; `mise run test spec-audit` / `spec-style` unchanged behaviour.

2. WHEN `app`, `catalog`, and `skill` bin stubs are migrated, THEN each SHALL use the ops CLI kernel and contain at most 80 LOC excluding license/header comments.
   - **Measure:** Line count per file.
   - **Evidence:** `app.script.spec.ts`, `catalog.script.spec.ts` updated.

3. WHEN `planSpec` pattern applies, THEN new planners (`planCatalog`, `planTest` env sections) SHALL be pure functions testable without spawning processes.
   - **Measure:** Co-located specs pass with fixture `usage_*` objects only.
   - **Evidence:** `*.script.spec.ts` for planners.

4. WHEN routing subcommands in bin scripts, THEN the dispatch flow SHOULD use declarative action maps of type `Record<string, () => Promise<number | void> | number | void>` instead of nested `switch` blocks.
   - **Measure:** Switch blocks for subcommands removed in `catalog.script.ts` and `test.script.ts`.
   - **Evidence:** Clean code verification and successful test runs.

---

## REQUIREMENT OCK-3: Shared text-file I/O (TypeScript DRY)

**Slice:** MVP

**User story:** As a maintainer, I want one text-read API so governance scripts do not duplicate `Bun.file().text()` + `split('\n')` pairs.

### Acceptance criteria

1. WHEN code needs the first line or all lines of a text file, THEN it SHALL call `readTextLines` from `packages/ops/src/support/lib/shared/text_file.script.ts` with overloads or a conditional return type (`'first' → string`, `'all' → string[]`).
   - **Measure:** `readFirstLine` / `readAllLines` removed from `catalog_validate.script.ts`; callers use shared helper.
   - **Evidence:** `text_file.script.spec.ts`; `catalog_validate.script.spec.ts` still green.

2. WHEN the same file is read for both first-line and full-line scans in one function, THEN callers SHALL use a single `readTextFile` + pure `firstLine` / `lines` helpers to avoid double I/O.
   - **Measure:** `validateTagPlacement` / `collectMembershipTagsInFile` refactored to one read per path where both modes were used in one call chain.
   - **Evidence:** Code review + tests.

3. WHEN migrating duplicate patterns in phase 1, THEN at minimum `tag.script.ts` and `e2e_metrics.script.ts` first-line reads SHALL adopt the shared helper.
   - **Measure:** `rg 'split\\('\\\\n'\\)\\[0\\]' packages/ops/src/governance/registries/catalog` count drops.
   - **Evidence:** Grep + tests.

4. WHEN loading text files or allowlists, THEN operations SHALL return `neverthrow`'s `Result` type to enforce functional error boundary contracts rather than throwing raw exceptions.
   - **Measure:** `readTextFile` and `loadAllowlist` return `Result` wrappers.
   - **Evidence:** Co-located unit specs test success and failure result paths.

---

## REQUIREMENT OCK-4: Ops logging (stderr only)

**Slice:** MVP

**User story:** As an operator, I want structured ops logs on stderr without breaking `--json` stdout contracts.

### Acceptance criteria

1. WHEN bin or governance code logs diagnostics, THEN it SHALL use `getLogger(['kb', 'ops', …])` after `configureOpsLogging()` and SHALL NOT use `console.*` in migrated phase-1 files.
   - **Measure:** `rg 'console\\.' packages/ops/src/bin/{app,catalog,skill,test}.script.ts` → 0 after migration (except re-export shims if any).
   - **Evidence:** [`LOGGING_GUIDE.md`](../../guides/LOGGING_GUIDE.md) cross-link in plan; gate green.

2. WHEN `renderValidate`, `task_runner`, or `--json` paths emit machine output, THEN they SHALL continue writing only to **stdout** unchanged.
   - **Measure:** Existing specs for raw/json output still pass.
   - **Evidence:** `catalog_validate.script.spec.ts`, `task_runner.script.spec.ts`.

3. WHEN bin stubs execute main blocks, THEN `runBinMain` SHALL support async functions returning promises and catch rejections automatically.
   - **Measure:** `runBinMain` signature handles both sync execution and Promise returns.
   - **Evidence:** Clean async crash handling verified in `dispatch.script.spec.ts`.

---

## REQUIREMENT OCK-5: Governance CLI migration (merged scope)

**Slice:** MVP

**User story:** As a maintainer, I want governance scripts that mise calls to use the same kernel so `parseCli` / `envBool` copies disappear.

### Acceptance criteria

1. WHEN `skill_registry.script.ts` runs via `mise run skill …`, THEN it SHALL read flags from `usage_*` via the kernel and SHALL NOT contain a hand-rolled `parseCli` argv loop for flags declared in the `skill` task usage spec.
   - **Measure:** `parseCli` removed or reduced to debug-only fallback; `function envBool` removed from file.
   - **Evidence:** `skill_registry.script.spec.ts`; `mise run skill list` exit 0.

2. WHEN `perf.script.ts` runs via `mise run perf …`, THEN it SHALL use `usage_env` instead of local `envBool`.
   - **Measure:** No `function envBool` in `perf.script.ts`.
   - **Evidence:** `mise run perf workflow-observability` exit 0.

3. WHEN `scan.script.ts` runs via `mise run spec audit security`, THEN argv parsing SHALL be limited to flags **not** in the mise usage spec; mise-backed flags use `usage_*`.
   - **Measure:** Local `parseArgs` shrinks or delegates to kernel readers.
   - **Evidence:** Co-located spec + `mise run spec audit security --changed-only`.

4. WHEN `spec_kit.script.ts` runs, THEN `hasCliFlag` / duplicate env reads for flags in usage SHALL be replaced by `usage_env` (argv only for kit verbs not flattened to `usage_cmd`).
   - **Measure:** `hasCliFlag` count in file → 0 for flags declared in mise `spec kit` usage.
   - **Evidence:** `spec_kit.script.spec.ts` green.

---

## REQUIREMENT OCK-7: Remove npm `yaml` dependency (Bun-native YAML)

**Slice:** MVP

**User story:** As a maintainer, I want one YAML parser (`Bun.YAML`) across the repo so ops governance does not depend on the redundant `yaml` npm package.

### Acceptance criteria

1. WHEN any file under `packages/ops/src` parses YAML text, THEN it SHALL use `Bun.YAML.parse` (or static `import … with { type: 'yaml' }`) and SHALL NOT import the `yaml` npm package.
   - **Measure:** `rg "from 'yaml'|from \"yaml\"" packages/ops/src` → **0** matches.
   - **Evidence:** Grep + `bun test` on touched modules.

2. WHEN `package.json` dependencies are installed, THEN the root `"yaml"` entry SHALL be absent.
   - **Measure:** `rg '"yaml"' package.json` inside `"dependencies"` block → **0**; `test ! -d node_modules/yaml` after `bun install`.
   - **Evidence:** `knip` / quality gate dependency audit.

3. WHEN `loadAllowlist` or `resolveCatalogKey` run against real repo YAML (`assets/catalog/catalog.yaml` and a handoff allowlist fixture), THEN behaviour SHALL be unchanged (same keys / same validation errors).
   - **Measure:** `allowlist.loader.script.spec.ts` and `resolve_catalog_key.script.spec.ts` exit **0**.
   - **Evidence:** Spec output + `mise run spec ready` (if catalog key resolution is on path) unchanged exit code.

4. WHEN YAML parsing fails, THEN callers SHALL surface the same error class shape as before (wrapping the error in `HandoffAllowlistError` for the allowlist, containing the parse error text, but without strictly matching npm-specific error fields or formats; derived-key warnings for catalog resolution).
   - **Measure:** Negative allowlist spec asserts `HandoffAllowlistError` wrapping the parser's native parse error message on invalid YAML text.
   - **Evidence:** `allowlist.loader.script.spec.ts`.

---

## Explicitly NOT in 014

| Item                                                  | Owner                 |
| ----------------------------------------------------- | --------------------- |
| `policy codegen-usage` / `usage generate sdk` (OCK-6) | Future spec           |
| `workflow_run.script.ts` argv refactor                | Out of scope per spec |
| Commander / citty / yargs on mise path                | Forbidden             |

---

## Cross-requirement rules

### Trust mise — validate only what mise cannot

| Validate in script                                                 | Do not validate (mise owns)     |
| ------------------------------------------------------------------ | ------------------------------- |
| `raw` + `json` both true (global mutex)                            | `usage_strict === 'true'` shape |
| `smoke` + `regression` both true (e2e mutex unless usage prevents) | `choices` enum membership       |
| Domain files (catalog.yaml, scan_paths.yml)                        | `usage_cmd` subcommand spelling |
| Path safety for `usage_feature` (exists, under repo)               | Boolean flags declared in usage |

### TypeScript patterns (from review)

- **Overload / conditional return** for `readTextLines(path, mode)` — prefer over duplicate async functions.
- **Discriminated unions** for planner results (`kind: 'spawn' \| 'runner' \| 'error'`) — keep `spec.script.ts` pattern.
- **Generics** for `usageSection<T extends Record<string, boolean>>` only when codegen lands; avoid premature abstraction in MVP.
- **No `any`**; prefer `Record<string, string | undefined>` for env bags in planners.
