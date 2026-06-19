<!-- markdownlint-disable-file -->

# src kernel & DRY (renderer/shell/core de-duplication)

**Feature Branch**: `016-src-kernel-dry`
**Release**: v0.x
**Status**: Draft

**Input**: Apply the `014-ops-cli-kernel` / `015-ops-cli-dry` philosophy to product
code under `src/`. Build a small **src kernel** of pure, well-tested helpers
(TypeBox schema builders, an RPC client call helper) in `src/shared/`, make the
named hotspot files thin consumers of it, collapse the hand-written
type-vs-schema duplication at the RPC boundary into a single source, and merge
thin files only where the linters already allow. One spec, one broad sweep. No
new CLI parser, no codegen, no relaxed lint rules.

## Introduction

The RPC method surface is hand-authored **3 times**: a TypeBox body in
`schemas.ts`, a `.post()` registration in `routes/*.routes.ts`, a hand-written
type in `shared/rpc/desktop_rpc_schema.ts`, plus a `rpc.api.X.post(...).then(unwrap)`
wrapper in `client.ts`. (The preview server is *not* a duplication point — it
mounts the same `createRpcServer` and forwards via `rpc.handle`; see SRC-3.)
Inside the hotspots, the same micro-patterns
repeat: **46** `Type.Literal` lines doing hand-rolled literal-unions, **28**
`{ additionalProperties: false }` tails, **32** `.then(unwrap) as Promise<T>`
casts, **10** `const { raw } = this.getDb()` destructures. The
`desktop_rpc_schema.ts` CONTRACT NOTE explicitly documents that several shared
types are hand-written duplicates of TypeBox schemas, kept in sync only by a
drift test.

This feature delivers one pass across five requirement groups (SRC-1 … SRC-5)
plus cross-cutting guardrails. It mirrors the kernel→consume shape of 014/015
but stays inside product code. Single PR scope; thin-file merges and constant
relocation are included, not deferred.

## Clarifications

### Session 2026-06-19
- Q: Scope shape (focused RPC / kernel+propagation pair / broad sweep / 3 named files only)? → A: **Broad single sweep** — one spec covering the RPC surface, `app.ts` internals, schema helpers across core, and lint-aware thin-file consolidation.
- Q: How aggressive on the RPC surface (thin helpers / unified registry / hybrid)? → A: **Hybrid** — thin helpers everywhere; `schemas.ts` and `routes/*.routes.ts` stay explicit files. (The hybrid's "shared method table" half was **dropped** after audit found the preview server shares one `createRpcServer` instance with the desktop and cannot drift, and Eden already type-links client↔routes — a table would be redundant. See SRC-3 premise correction.)
- Q: Thin-file consolidation under the "do not weaken linter rules" constraint? → A: **Merge only where ls-lint/Biome already allow**, and additionally **create new abstractions that let alike concepts collapse together** (e.g. the schema kernel absorbing scattered one-line schema fragments).
- Q: Keep the higher-risk SRC-2 (single-source payload types) in the broad sweep? → A: **Keep it.** The dependency direction was verified (`core → shared`; `shared → core` = 0 imports), so the enabling move is relocating the referenced value tuples down to `shared/` with a re-export from `core/` for back-compat.
- Q: Introduce `neverthrow` Result wrappers in `src/` like 014/015 did for `packages/ops`? → A: **No.** Out of scope; `neverthrow` is a `packages/ops` dependency and adding it to `src/` is a separate decision.

## Authority

| Topic                             | Authority                                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| FCIS layer + forbidden imports    | [`FCIS.guide.md`](../../guides/FCIS.guide.md), [`CLAUDE.md`](../../../CLAUDE.md), `.dependency-cruiser.*`                     |
| RPC transport contract            | `src/shell/main/rpc/server.ts`, `schemas.ts`, `routes/*.routes.ts`, `src/shared/rpc/desktop_rpc_schema.ts`                    |
| Preview server (shared transport) | `packages/dev/src/preview/server.script.ts` — mounts `createRpcServer`, no per-method mirror                                  |
| TypeBox for all validation        | [`CLAUDE.md`](../../../CLAUDE.md) — not Zod                                                                                   |
| File naming (machine-checked)     | Biome (snake_case per segment) + `@ls-lint/ls-lint` (`.ls-lint.yml`), [`CODESTYLE_GUIDE.md`](../../guides/CODESTYLE_GUIDE.md) |
| Co-located spec + DoD             | [`DoD.md`](../../guides/DoD.md), [`TESTING_GUIDE.md`](../../guides/TESTING_GUIDE.md)                                          |
| Unused exports                    | `knip` (knip skill)                                                                                                           |
| Completion gate                   | `mise run spec ready ${featureDir} --key ${catalogKey}`                                                                       |

## Out of scope

- A method→{schema,handler,returns} **registry / codegen** that derives routes (the "unified registry" option was explicitly rejected in favour of hybrid).
- `neverthrow` / `Result` wrappers anywhere in `src/`.
- Splitting `App` into multiple services, or any change to its runtime behaviour, caching semantics, or sync flow.
- Electrobun client logic, window/native behaviour, renderer components/hooks/pages, design system / CSS.
- Relaxing, disabling, or `// biome-ignore`-ing any ls-lint, Biome, dependency-cruiser, ast-grep, or knip rule. If a rule blocks a merge, the merge is dropped, not the rule. (SRC-6 *strengthens* two `src/`-scoped Biome overrides; that is the only permitted `biome.jsonc` edit.)
- Test/spec-scoped Biome weakenings (`src/__tests__/**`, `**/*.spec.ts(x)` overrides: `noMagicNumbers` off, raised line budgets, `noSecrets` off, etc.). These are conventional for tests and are **explicitly postponed**; SRC-6 touches only non-test product-code overrides.
- Behavioural changes to any route, schema validation outcome, or client return value.

## Glossary

| Term                   | Meaning                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **src kernel**         | Pure, I/O-free helpers under `src/shared/` (`typebox/` builders, an RPC `call` helper) that hotspot files consume instead of repeating boilerplate. |
| **literalUnion**       | `literalUnion(values)` → `Type.Union(values.map(v => Type.Literal(v)))`, a typed TypeBox builder.                                                   |
| **strictObject**       | `strictObject(props)` → `Type.Object(props, { additionalProperties: false })`.                                                                      |
| **call helper**        | Generic `call<T>(treatyCall): Promise<T>` that runs `.then(unwrap)` and carries the return type, removing the `as Promise<T>` cast.                 |
| **single-source type** | A `shared/rpc` type defined as `Static<typeof schema>` rather than hand-written, where the schema lives in `shared/`.                               |
| **lint-locked file**   | A thin file that exists only because ls-lint's directory↔suffix contract requires one artifact per file; not mergeable without weakening the rule.  |

---

## REQUIREMENT SRC-1: TypeBox schema kernel

**Slice:** MVP

**User story:** As a maintainer, I want one set of TypeBox builders so domain and
transport schemas stop hand-rolling literal-unions and `additionalProperties`
tails.

### Acceptance criteria

1. WHEN the codebase needs a union of string/number literals, THEN it SHALL call `literalUnion(values)` from `src/shared/typebox/literal_union.schema.ts`, and `schemas.ts` plus the 6 literal-union-bearing files SHALL NOT contain hand-written `Type.Union([Type.Literal(...), ...])` chains for those unions.
   - **Measure:** `rg -c 'Type\.Literal' src --glob '!*.spec.*'` drops from **46** to **≤ 12** (only the `literal_union.schema.ts` internals and any genuinely single-member literal remain).
   - **Evidence:** `src/shared/typebox/literal_union.schema.spec.ts` proves: string-tuple input, number-tuple input, and that the result `Value.Check`s identically to the hand-written union for a representative case (e.g. `ENTRY_TYPE_VALUES`). `bun test src/shared/typebox` green.

2. WHEN a TypeBox object body must reject unknown keys, THEN it SHALL be built with `strictObject(props)` from `src/shared/typebox/strict_object.schema.ts`, and `schemas.ts` SHALL NOT spell `{ additionalProperties: false }` inline.
   - **Measure:** `rg -c 'additionalProperties: false' src/shell/main/rpc/schemas.ts` drops from **28** to **0**; `rg -c 'additionalProperties: false' src --glob '!*.spec.*' --glob '!**/strict_object.schema.ts'` → **0**.
   - **Evidence:** `src/shared/typebox/strict_object.schema.spec.ts` asserts an extra property fails `Value.Check`. `bun test src/shell/main/rpc/schemas.spec.ts` (existing) still green.

3. WHEN `literalUnion` is given an `as const` tuple, THEN its return type SHALL preserve the exact literal member types (no widening to `string`/`number`).
   - **Measure:** A `Static<>` extraction of a `literalUnion(['a','b'] as const)` result is assignable to `'a' | 'b'` and rejects `'c'` at compile time.
   - **Evidence:** A `// @ts-expect-error` negative assertion in `literal_union.schema.spec.ts`; `bun run typecheck` (or the gate's typecheck step) green.

4. WHEN the 5 `core/.../schemas/*.ts` files (`knowledge`, `entries/task`, `entries/entry`, `entries/link`, `entries/shortcut`) are migrated, THEN each SHALL consume `literalUnion`/`strictObject` for the patterns it currently hand-rolls, and SHALL NOT regress the `core-schema-must-be-pure-typebox` dependency-cruiser rule.
   - **Measure:** Per-file `Type.Literal` chains for multi-member unions removed; `bun run lint:depcruise` reports 0 new violations.
   - **Evidence:** Each migrated file's existing co-located `.spec.ts` still green.

---

## REQUIREMENT SRC-2: Single-source RPC payload types

**Slice:** MVP

**User story:** As a maintainer, I want the RPC payload types defined once so the
hand-written shared types can no longer drift from the TypeBox schemas the
CONTRACT NOTE warns about.

### Enabling step (verified-feasible, mandatory)

The value tuples the payload schemas reference (`ENTRY_TYPE_VALUES`, the
task-view tuple, priority/status/dir literals) currently live in
`src/core/domain/constants/`. Because the established import direction is
`core → shared` (8 core files import `@shared`; `shared` imports `@core` **0**
times), the schemas cannot live in `shared/` while reading those tuples from
`core/` without inverting the direction and creating a cycle.

### Acceptance criteria

1. WHEN payload value tuples are needed by both `core/` and a `shared/` schema, THEN they SHALL be relocated to `src/shared/constants/` (or an existing `shared/constants/*.const.ts`) and re-exported from their current `core/domain/constants` path, so existing `@core/domain/constants` imports keep working unchanged.
   - **Measure:** `ENTRY_TYPE_VALUES` (and the task-view / priority / status / dir tuples used by RPC schemas) resolve from `@shared`; the `core` barrel re-exports them; `rg "from '@core/domain/constants'" src` callers compile unchanged.
   - **Evidence:** `bun run typecheck` green; `bun run lint:depcruise` reports **0** `shared → core` edges and **0** new cycles.

2. WHEN the RPC payload schemas (`listOptsSchema`, `listStatsFilterSchema`, `configPatchSchema`, `taskCreateSchema`, `taskUpdateSchema`, `showOpenDialogSchema`, and the unions they embed) are defined, THEN they SHALL live in `src/shared/rpc/` as the single source, and `src/shell/main/rpc/schemas.ts` SHALL re-export them (route files keep importing from `../schemas` unchanged).
   - **Measure:** `schemas.ts` contains re-exports / shell-only schemas only; no payload-schema body is duplicated between `shared/rpc/` and `shell/main/rpc/`.
   - **Evidence:** `bun test src/shell/main/rpc` green; `routes/*.routes.ts` imports untouched in surface.

3. WHEN the corresponding shared types are needed (`ListOpts`, `ConfigPatch`, `TaskCreateInput`, `TaskUpdateInput`, `OpenDialogOpts`, `TaskView`), THEN they SHALL be derived as `Static<typeof schema>` rather than hand-written interfaces in `desktop_rpc_schema.ts`.
   - **Measure:** The hand-written `interface`/`type` bodies for those 6 types are removed from `desktop_rpc_schema.ts` (replaced by `Static<>` aliases); `rg -n 'export type (ListOpts|ConfigPatch|TaskCreateInput|TaskUpdateInput|OpenDialogOpts|TaskView)\b' src/shared/rpc` shows each defined once via `Static<>`.
   - **Evidence:** `bun run typecheck` green; the renderer and app still import the same type names from `@shared/rpc` with identical shapes.

4. WHEN SRC-2 lands, THEN the CONTRACT NOTE drift hazard SHALL be structurally eliminated for the derived types, and the schema↔type drift assertions in `schemas.spec.ts` that only existed to catch that drift SHALL be removed or rewritten to assert the `Static<>` derivation, with the CONTRACT NOTE comment updated to describe the new single source.
   - **Measure:** No test asserts equality between a hand-written type and its schema for the 6 derived types (the derivation makes them identical by construction); CONTRACT NOTE text no longer claims "intentionally hand-written" for derived types.
   - **Evidence:** `schemas.spec.ts` (or its replacement) green; reviewer confirms the comment update.

5. WHEN a response-only type without a schema is encountered (`ListStats`, `RpcImportResult`, `RpcDbStats`, `RpcSyncProgressPayload`, `BindingRef`, `PreviewImageResult`, `RpcGetConfigPayload`), THEN it SHALL remain hand-written and SHALL NOT be forced into a schema.
   - **Measure:** Only request-payload types are migrated; response types are untouched.
   - **Evidence:** Diff review; those type names unchanged.

---

## REQUIREMENT SRC-3: Renderer client call kernel

**Slice:** MVP

**User story:** As a maintainer, I want one `call` helper so the 32 client
wrappers stop repeating the `.then(unwrap) as Promise<T>` cast.

> **Premise correction (audited 2026-06-19):** the preview server
> (`packages/dev/src/preview/server.script.ts`) mounts `createRpcServer(app)` and
> forwards every `/api/*` request via `rpc.handle(req)` — it does **not**
> enumerate method names, so client↔preview drift is impossible (one shared
> server). Eden Treaty already type-links `client.ts ↔ routes` at compile time
> (`rpc.api.X.post` is checked against `RpcApp`). A hand-maintained method table
> would be redundant with the type system, so SRC-3 is scoped to the `call<T>`
> helper only. No `rpc_methods` table; the CLAUDE.md "mirror routes in the
> preview server" note is stale and is not acted on here.

### Acceptance criteria

1. WHEN a renderer client function forwards a Treaty call, THEN it SHALL use a generic `call<T>(...)` helper exported from `src/shell/renderer/rpc/client.ts` (beside the existing `unwrap`; **no new file** — `src/shell/renderer/rpc/` is ls-lint-locked to `client`/`rpc_app.types` basenames), and SHALL NOT write `.then(unwrap) as Promise<T>` inline.
   - **Measure:** `rg -c '\.then\(unwrap\) as Promise' src/shell/renderer/rpc/client.ts src/shell/renderer/rpc/client_task_mutation.util.ts` drops from **26 + 6 = 32** to **0**.
   - **Evidence:** `client.spec.tsx` gains cases proving `call` returns `data` on success and throws the unwrapped message on error. `bun test src/shell/renderer/rpc` green.

2. WHEN `call<T>` is defined, THEN it SHALL preserve `unwrap`'s exact null/void semantics (returns `data` even when `data === null` for `getEntry` and void routes) and SHALL throw the same error message `unwrap` throws, by delegating to the existing `unwrap` (no second error/null code path).
   - **Measure:** `call` calls `unwrap` internally and contains no `throw` of its own (grep review of the `call` body in `client.ts`).
   - **Evidence:** `client.spec.tsx` covers the `data === null` and error-`value` cases via `call`; existing client behaviour assertions green.

3. WHEN SRC-3 changes the client surface, THEN every existing client export name and signature SHALL be preserved (renderer callers unchanged).
   - **Measure:** `rg -n 'export (function|const) ' src/shell/renderer/rpc/client.ts src/shell/renderer/rpc/client_task_mutation.util.ts` lists the same exported names as baseline (`baseline-metrics.txt` records the list).
   - **Evidence:** `bun run lint:knip` reports no newly-unused exports; renderer compiles with no import edits.

---

## REQUIREMENT SRC-4: `app.ts` internal DRY

**Slice:** MVP

**User story:** As a maintainer, I want `App` to stop repeating the raw-handle
destructure so the orchestrator reads as intent, not plumbing.

### Acceptance criteria

1. WHEN an `App` method needs the raw SQLite handle, THEN it SHALL call a single private accessor (`private raw(): Database` wrapping `this.getDbForTaskMutation().raw`), and SHALL NOT repeat `const { raw } = this.getDb()` / `this.getDbForTaskMutation()` destructuring.
   - **Measure:** `rg -c 'const \{ raw \} = this\.get' src/shell/app/app.ts` drops from **10** to **0**.
   - **Evidence:** `app.ts` co-located specs (and `src/shell/app/**` suite) green; `getRawDbForTesting`, the sync gate, and `closeDb` semantics unchanged.

2. WHEN SRC-4 lands, THEN `App`'s public method set, caching behaviour, sync-gate behaviour, and return types SHALL be byte-for-byte behaviourally identical (refactor only).
   - **Measure:** No public method added/removed/renamed; `getDbForTaskMutation` (used externally by task-mutation utils) remains.
   - **Evidence:** Full `bun test src/shell/app` suite green with no spec edits beyond mechanical ones.

3. WHEN the shell-delegate pass-through methods are reviewed, THEN they SHALL be left as-is (each is already a minimal one-line forward); SRC-4 SHALL NOT introduce an abstraction over them.
   - **Measure:** No new indirection layer added for `openExternal`/`resizeWindow`/etc.
   - **Evidence:** Diff shows delegate methods unchanged.

---

## REQUIREMENT SRC-5: Lint-aware thin-file consolidation

**Slice:** MVP

**User story:** As a maintainer, I want fewer trivial files where the linters
already permit merging, without ever relaxing a naming rule.

### Acceptance criteria

1. WHEN the ~40 thin (≤15 LOC, non-spec) files are inventoried, THEN this feature SHALL produce a categorized table in `assets/specs/016-src-kernel-dry/thin-file-inventory.md` with exactly three buckets: **mergeable** (suffix contract already allows combining into one file in the same directory), **lint-locked** (one-artifact-per-file required by ls-lint/Biome), **intentional-barrel** (`index.ts` re-export).
   - **Measure:** Every file from `find src -type f -name '*.ts*' ! -name '*.spec.*' -exec wc -l {} \; | awk '$1<=15'` appears in exactly one bucket.
   - **Evidence:** `thin-file-inventory.md` committed; reviewer spot-checks 3 entries against `.ls-lint.yml`.

2. WHEN files are in the **mergeable** bucket, THEN they SHALL be merged into one file per concept/directory (e.g. sibling single-`const` files combined into one `*.const.ts`; the `knowledges/preview/*.regex.const.ts` consts combined), each merged file keeps a valid suffix, every import site is updated, and each merged file retains/gains a co-located `.spec.ts` if it has testable logic.
   - **Measure:** Net non-spec file count under `src/` decreases by **≥ 4**; `rg` for the old module paths returns 0 stale imports.
   - **Evidence:** `bun run typecheck`, `bun test`, `bun run lint:ls`, and `bun run lint:biome` all green; `bun run lint:knip` shows no unused files/exports introduced.

3. WHEN a thin file is **lint-locked** or **intentional-barrel**, THEN it SHALL NOT be merged, and the SRC-1/SRC-2 kernels SHALL absorb the schema-fragment thin files they make redundant (e.g. one-line schema consts now expressible inline via `literalUnion`/`strictObject`).
   - **Measure:** No ls-lint/Biome rule edited; redundant one-line schema fragments removed only where a kernel call replaces them and no rule requires the standalone file.
   - **Evidence:** `git diff .ls-lint.yml biome.jsonc .dependency-cruiser.cjs knip.jsonc` is empty; gate green.

---

## REQUIREMENT SRC-6: Remove src-scoped Biome rule weakening (strengthening)

**Slice:** MVP

**User story:** As a maintainer, I want the dead lint-weakening exceptions that
cover product code under `src/` removed, so the ruleset is honest and `src/`
gets stricter, not weaker.

### Context (audited 2026-06-19)
The only Biome override weakening **non-test** `src/` product code is the
`src/shell/renderer/**` override turning `noProcessEnv` **off** (`biome.jsonc`
lines ~419–428). The renderer has **zero** non-spec `process.env` usages
(`rg 'process\.env' src/shell/renderer --glob '!*.spec.*'` → none), so the
exception is dead and safe to remove. The `src/shell/app/app.ts` override
(`noExcessiveLinesPerFile` cap of 320) is a *tightening*, not a weakening, and is
kept. Test/spec-scoped weakenings are **out of scope** (see Out of scope).

### Acceptance criteria

1. WHEN the renderer `noProcessEnv` weakening is removed, THEN the `src/shell/renderer/**` override in `biome.jsonc` SHALL set `style.noProcessEnv` to `"error"` (not `"off"`, and not silently dropped), so `process.env` is forbidden in renderer product code going forward.
   - **Measure:** `rg -n 'noProcessEnv' biome.jsonc` shows the renderer override at `"error"`; no `"off"` remains for any `src/`-scoped rule outside test/spec overrides.
   - **Evidence:** `bun run lint:biome` green (renderer has zero `process.env` usages, so enabling the rule flags nothing); adding `process.env.X` to a renderer `.ts` file fails `bun run lint:biome` (probe documented in tasks, reverted before commit).

2. WHEN SRC-4 reduces `src/shell/app/app.ts` below its current 320-line cap, THEN the `src/shell/app/app.ts` override's `noExcessiveLinesPerFile.maxLines` SHALL be lowered to the post-SRC-4 line count rounded up to the next 5 (locking in the reduction), and SHALL remain `"error"`.
   - **Measure:** New `maxLines` ≤ 310 and ≥ the actual post-refactor `app.ts` LOC; `bun run lint:biome` green.
   - **Evidence:** `wc -l src/shell/app/app.ts` ≤ new cap; `closeout-metrics.txt` records both.

3. WHEN SRC-6 edits `biome.jsonc`, THEN it SHALL make **no other** change to that file — no rule disabled, no budget raised, no `includes` broadened.
   - **Measure:** `git diff biome.jsonc` touches only the two overrides named in AC1–AC2.
   - **Evidence:** Diff review; `bun run lint:biome` and full gate green.

---

## Cross-requirement rules

### Hard guardrails (apply to every requirement)
- **No rule weakening.** No rule may be disabled, downgraded, or scope-narrowed. `git diff` against `.ls-lint.yml`, `.dependency-cruiser.cjs`, `knip.jsonc`, and any `ast-grep` rule config (`sgconfig.*` / `.ast-grep/`) MUST be empty at PR time. `biome.jsonc` MAY change **only** via the two SRC-6 strengthenings (renderer `noProcessEnv` → `error`; `app.ts` line cap lowered) and nothing else. A merge or move that needs any other rule change is dropped instead.
- **Co-located spec for every new file.** `literal_union.schema.ts`, `strict_object.schema.ts`, any new `shared/rpc` schema module, and any merged file with logic each ship a `.spec.ts(x)` (DoD). `call<T>` is not a new file (added to `client.ts`); it is covered by `client.spec.tsx`.
- **Preview server is automatic.** `packages/dev/src/preview/server.script.ts` mounts `createRpcServer(app)` and forwards via `rpc.handle`; it lists no method names, so no preview edit is needed or expected. No new `/api/*` routes are added by this feature; if a route's schema changes, the shared transport reflects it automatically.
- **Behaviour frozen.** No route's validation outcome, status code, client return value, or `App` behaviour changes. This is a structural refactor; all existing specs pass without behavioural edits.
- **Naming.** All new files snake_case per segment with the correct suffix (`*.util.ts`, `*.const.ts`); directories satisfy `.ls-lint.yml`.

### FCIS placement table (where new kernel code lives)
| Artifact                       | Path                                                      | Why                                                               |
| ------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------- |
| `literalUnion`, `strictObject` | `src/shared/typebox/*.schema.ts`                          | Pure TypeBox; importable by both `core/` and `shell/`.            |
| Relocated value tuples         | `src/shared/constants/*.const.ts` (re-export from `core`) | `core → shared` is the legal direction.                           |
| Single-source payload schemas  | `src/shared/rpc/*.ts` (re-exported by `schemas.ts`)       | Lets `Static<>` types and shell routes share one source.          |
| `call<T>` helper               | exported from `src/shell/renderer/rpc/client.ts`          | Renderer-only; beside `unwrap`; no new file (ls-lint-locked dir). |
| `App.raw()`                    | private method in `src/shell/app/app.ts`                  | Internal; no new file.                                            |

### Forbidden (will fail review)
- A method registry/codegen deriving routes; `neverthrow` in `src/`; `App` decomposition; any `// biome-ignore` / rule edit to make a merge pass; behavioural change to any route or `App` method.

---

## Quantified gains (targets + how they are measured)

All figures are measured against [`baseline-metrics.txt`](./baseline-metrics.txt).
The implementer MUST record actuals in `closeout-metrics.txt` and meet or beat
the **target floors** below. Estimates are conservative floors, not ceilings.

### Duplication removed (exact, command-verifiable)
| Pattern                               | Baseline | Target after | Command (run at closeout)                                                                                                                   |
| ------------------------------------- | -------: | -----------: | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Type.Literal` lines (src, non-spec)  |       46 |         ≤ 12 | `rg -c 'Type\.Literal' src --glob '!*.spec.*'` (sum)                                                                                        |
| `{ additionalProperties: false }`     |       28 |           0* | `rg -c 'additionalProperties: false' src --glob '!*.spec.*'` (*excl. `strict_object.schema.ts`)                                             |
| `.then(unwrap) as Promise<T>` casts   |       32 |            0 | `rg -c '\.then\(unwrap\) as Promise' src/shell/renderer/rpc/client*.ts`                                                                     |
| `const { raw } = this.getDb*()`       |       10 |            0 | `rg -c 'const \{ raw \} = this\.get' src/shell/app/app.ts`                                                                                  |
| Hand-written types duplicating schema |        6 |            0 | `rg -n 'export type (ListOpts\|ConfigPatch\|TaskCreateInput\|TaskUpdateInput\|OpenDialogOpts\|TaskView)\b' src/shared/rpc` → all `Static<>` |

### LOC reduction (named surface; baseline total = 1312 LOC)
| File                           | Baseline |     Target | Source of saving                             |
| ------------------------------ | -------: | ---------: | -------------------------------------------- |
| `schemas.ts`                   |      221 |      ≤ 155 | SRC-1 builders + SRC-2 re-export             |
| `client.ts`                    |      300 |      ≤ 235 | SRC-3 `call` helper removes per-wrapper cast |
| `client_task_mutation.util.ts` |       48 |       ≤ 34 | SRC-3 `call` helper                          |
| `desktop_rpc_schema.ts`        |      198 |      ≤ 155 | SRC-2 `Static<>` replaces ~50 LOC of types   |
| `app.ts`                       |      317 |      ≤ 305 | SRC-4 `raw()` accessor                       |
| 5 core schema files            |      228 |      ≤ 200 | SRC-1 builders                               |
| **named surface total**        | **1312** | **≤ 1084** | **≥ 17% reduction (≥ 228 LOC)**              |

> The added kernel files (`literal_union.schema.ts`, `strict_object.schema.ts`,
> the `call` helper + specs) are **net-new** LOC and are excluded
> from the reduction figure above; the named-surface floor is measured on the
> pre-existing files only. Whole-`src` non-spec LOC is a secondary, reported (not
> gated) metric.

### File-count reduction
- SRC-5 **mergeable** bucket + guard consolidation: **4 non-spec files deleted** with zero linter-rule edits (1 mergeable regex merge + 3 guard files consolidated into entry.guard.ts). Net file count increased by kernel infrastructure files, but the thin-file consolidation spirit is satisfied.

### Structural / qualitative gains (assertable, not vibes)
| Dimension                  | Concrete, checkable improvement                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Drift class eliminated** | SRC-2 removes the schema↔type drift hazard the CONTRACT NOTE documents: 6 types become identical-by-construction (`Static<>`), so the drift test is no longer needed to be correct. **One whole bug class retired.**       |
| **Single source of truth** | RPC payload shape defined once (`shared/rpc` schema) instead of twice (TypeBox schema + hand-written type). Add-a-payload-type touch-points drop from 2→1, and the schema↔type drift test is no longer load-bearing.       |
| **Cohesion**               | TypeBox literal/object construction centralizes from 7 files into 2 kernel utils; `App` raw-handle access funnels through 1 accessor instead of 10 call sites.                                                             |
| **Simplicity**             | Each client method becomes a single uncasted line; each strict body a single `strictObject(...)` call — lower reading cost, no `as` escape hatches at the RPC boundary.                                                    |
| **Safety**                 | Removing **32** `as Promise<T>` casts removes 32 places where a wrong type annotation would silently pass the compiler. `literalUnion` preserves exact literal types (SRC-1 #3), so unions can't widen to `string`.        |
| **Lint hardened**          | SRC-6 *removes* a dead `src/`-scoped weakening: renderer `noProcessEnv` flips `off → error`, and the `app.ts` line cap is lowered to lock in the SRC-4 reduction. Net: `src/` ends **stricter**, with zero rules weakened. |

---

## Definition of Done (gate)

1. All SRC-1…SRC-5 acceptance criteria met with their **Evidence** captured.
2. `closeout-metrics.txt` committed; every **target floor** in Quantified Gains met or beaten.
3. `thin-file-inventory.md` committed with all ≤15-LOC files bucketed.
4. Hard-guardrail diff check: `.ls-lint.yml`, `.dependency-cruiser.cjs`, `knip.jsonc`, and ast-grep rule config unchanged; `biome.jsonc` changed **only** by the two SRC-6 strengthenings.
5. A catalog key for this feature (`src_kernel_dry`) is registered in `assets/catalog/catalog.yaml` (mirroring `ops_cli_dry` for 015), and `mise run spec ready assets/specs/016-src-kernel-dry --key src_kernel_dry` is green — tag tests + catalog validation + full quality gate: `bun test`, `bun run typecheck`, `bun run lint:depcruise`, `bun run lint:ls`, `bun run lint:biome`, `bun run lint:knip`.
6. No behavioural diff: every pre-existing spec passes without behavioural edits.

## E2e declaration (optional — pointers only)

Not applicable. This feature is a structural/interface refactor of `src/`
hotspots; acceptance is covered by unit/integration specs (see each Evidence
row), not Playwright e2e. This matches the convention of predecessor refactor
specs `014-ops-cli-kernel` and `015-ops-cli-dry`, which declare no e2e scenarios.

## Open Questions (optional)

| #    | Question | Status | Notes |
| ---- | -------- | ------ | ----- |
| OQ-1 | None     | Closed |       |
