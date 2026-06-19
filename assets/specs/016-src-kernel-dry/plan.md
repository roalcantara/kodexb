# src kernel & DRY — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `subagent-driven-development`
> (recommended) or `executing-plans` to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking. This plan is the authority for
> *how*; [`spec.md`](./spec.md) is the authority for *what* and *why*. Every task
> ends with an **Acceptance gate** that names the spec criterion it closes and
> the exact command + expected value — do not mark a task done until its gate
> passes. Do not add scope beyond the gate.

**Goal:** De-duplicate the renderer/shell/core RPC + schema hotspots under `src/`
by introducing a small kernel of pure helpers, deriving RPC payload types from a
single source, and merging thin files only where the linters already allow —
without weakening any lint rule.

**Architecture:** Mirrors the 014→015 "kernel then consume" shape inside product
code. New pure helpers live in `src/shared/` (importable by both `core/` and
`shell/`, since the verified dependency direction is `core → shared`). The named
hotspots become thin consumers. The RPC transport contract (`createRpcServer`,
routes, Eden client surface) is behaviourally frozen; only its *construction* is
de-duplicated.

**Tech Stack:** Bun (`bun test`, `bun run`), TypeBox (`@sinclair/typebox`),
Elysia + Eden Treaty, `bun:sqlite`, Biome + ls-lint + dependency-cruiser + knip.

**Conventions (do not violate):**
- Tests: `bun:test`, `it(...)`, co-located `*.spec.ts(x)`. Run a single file with
  `bun test <path>`. No mocking of `App`; no real SQLite files; factories from
  `@testing` (see `app-testing` skill / `TESTING_GUIDE.md`).
- Validation: TypeBox only (`Type.*`, `Value.Check`). Never `z.*`.
- Logging: `getLogger([...])` from `@shared/logging`. Never `console.*` in `src/`.
- Commits: Conventional Commits, **capitalized** subject ≤ 50 chars, use `chore`
  for scaffolding/tooling. End body with the Co-Authored-By trailer if required
  by repo policy. Commit after every green task.
- **Never** edit `.ls-lint.yml`, `.dependency-cruiser.cjs`, `knip.jsonc`, or
  ast-grep rule files. `biome.jsonc` may be edited **only** in Phase F (SRC-6).

---

## File Structure (created / modified)

**Create:**
- `src/shared/typebox/literal_union.util.ts` — `literalUnion(values)` builder (pure).
- `src/shared/typebox/literal_union.util.spec.ts`
- `src/shared/typebox/strict_object.util.ts` — `strictObject(props)` builder (pure).
- `src/shared/typebox/strict_object.util.spec.ts`
- `src/shared/typebox/index.ts` — barrel for the two builders.
- `src/shared/constants/entry_type.const.ts` — relocated `ENTRY_TYPE_VALUES` tuple (SRC-2 enabling step).
- `src/shared/constants/entry_type.const.spec.ts`
- `src/shared/rpc/payload_schemas.ts` — single-source TypeBox payload schemas (SRC-2).
- `src/shared/rpc/payload_schemas.spec.ts`
- `assets/specs/016-src-kernel-dry/thin-file-inventory.md` — SRC-5 bucketed inventory.
- `assets/specs/016-src-kernel-dry/closeout-metrics.txt` — final measured numbers.

**Modify:**
- `tsconfig.json` — add `@shared/typebox` path alias.
- `src/shell/main/rpc/schemas.ts` — consume builders; re-export payload schemas from `@shared/rpc`.
- 5 core schema files (`knowledge`, `entries/task`, `entries/entry`, `entries/link`, `entries/shortcut`) — consume builders.
- `src/core/domain/constants/entry.const.ts` — import `ENTRY_TYPE_VALUES` from `@shared/constants/entry_type.const`, re-export for back-compat.
- `src/shared/rpc/desktop_rpc_schema.ts` — derive 6 payload types via `Static<>`; update CONTRACT NOTE.
- `src/shell/renderer/rpc/client.ts` — add `call<T>`; convert 26 wrappers.
- `src/shell/renderer/rpc/client_task_mutation.util.ts` — convert 6 wrappers via `call`.
- `src/shell/renderer/rpc/client.spec.tsx` — add `call` cases.
- `src/shell/app/app.ts` — add private `raw()`; replace 10 destructures.
- `src/shell/main/rpc/schemas.spec.ts` — drop/rewrite the now-structural drift assertions.
- Thin files in SRC-5 mergeable bucket (enumerated in the inventory task).
- `biome.jsonc` — SRC-6 only (renderer `noProcessEnv` → error; `app.ts` cap lowered).
- `assets/catalog/catalog.yaml` — register `src_kernel_dry` key.

**Phase order (dependency-correct):** A (SRC-1 kernel) → B (SRC-1 adoption) →
C (SRC-2) → D (SRC-3) → E (SRC-4) → F (SRC-5) → G (SRC-6) → H (closeout). G runs
after E because the `app.ts` cap depends on the post-SRC-4 line count.

---

## Phase A — SRC-1 schema kernel (builders)

### Task 1: `literalUnion` builder

**Files:**
- Create: `src/shared/typebox/literal_union.util.ts`
- Create: `src/shared/typebox/literal_union.util.spec.ts`
- Modify: `tsconfig.json` (add alias)

- [ ] **Step 1: Add the path alias**

In `tsconfig.json` `compilerOptions.paths`, add (after the `@shared/rpc` line):

```jsonc
"@shared/typebox": ["./src/shared/typebox/index.ts"],
```

- [ ] **Step 2: Write the failing test**

`src/shared/typebox/literal_union.util.spec.ts`:

```ts
import { Value } from '@sinclair/typebox/value'
import { describe, expect, it } from 'bun:test'
import { literalUnion } from './literal_union.util'

describe('literalUnion', () => {
  it('accepts each member of a string tuple', () => {
    const schema = literalUnion(['bookmark', 'command', 'cheat'] as const)
    expect(Value.Check(schema, 'bookmark')).toBe(true)
    expect(Value.Check(schema, 'cheat')).toBe(true)
  })

  it('rejects a non-member', () => {
    const schema = literalUnion(['low', 'high'] as const)
    expect(Value.Check(schema, 'mid')).toBe(false)
  })

  it('accepts number literals', () => {
    const schema = literalUnion([25, 50, 100, 200] as const)
    expect(Value.Check(schema, 50)).toBe(true)
    expect(Value.Check(schema, 75)).toBe(false)
  })
})
```

- [ ] **Step 3: Run test, verify it fails**

Run: `bun test src/shared/typebox/literal_union.util.spec.ts`
Expected: FAIL — `Cannot find module './literal_union.util'`.

- [ ] **Step 4: Implement**

`src/shared/typebox/literal_union.util.ts`:

```ts
import { type TLiteral, type TUnion, Type } from '@sinclair/typebox'

type LiteralMembers<T extends readonly (string | number | boolean)[]> = {
  -readonly [K in keyof T]: TLiteral<T[K]>
}

/**
 * Build a TypeBox union of literal members from an `as const` tuple, preserving
 * the exact literal types (no widening to `string`/`number`). Replaces the
 * hand-rolled `Type.Union([Type.Literal(a), Type.Literal(b), ...])` pattern.
 */
export function literalUnion<const T extends readonly (string | number | boolean)[]>(
  values: T
): TUnion<LiteralMembers<T>> {
  return Type.Union(values.map(value => Type.Literal(value))) as TUnion<LiteralMembers<T>>
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `bun test src/shared/typebox/literal_union.util.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Typecheck the literal-preservation contract (SRC-1 #3)**

Append to the spec file:

```ts
import type { Static } from '@sinclair/typebox'

it('preserves exact literal types (compile-time)', () => {
  const schema = literalUnion(['a', 'b'] as const)
  type T = Static<typeof schema>
  const ok: T = 'a'
  // @ts-expect-error 'c' is not a member
  const bad: T = 'c'
  expect(ok).toBe('a')
  expect(bad).toBeDefined()
})
```

Run: `bun run typecheck`
Expected: PASS — the `@ts-expect-error` is satisfied (so no error leaks), proving the union does not widen.

- [ ] **Step 7: Commit**

```bash
git add tsconfig.json src/shared/typebox/literal_union.util.ts src/shared/typebox/literal_union.util.spec.ts
git commit -m "Add literalUnion TypeBox builder"
```

**Acceptance gate (SRC-1 AC1 partial, AC3):** `bun test src/shared/typebox/literal_union.util.spec.ts` green AND `bun run typecheck` green with the `@ts-expect-error` in place.

---

### Task 2: `strictObject` builder + barrel

**Files:**
- Create: `src/shared/typebox/strict_object.util.ts`
- Create: `src/shared/typebox/strict_object.util.spec.ts`
- Create: `src/shared/typebox/index.ts`

- [ ] **Step 1: Write the failing test**

`src/shared/typebox/strict_object.util.spec.ts`:

```ts
import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { describe, expect, it } from 'bun:test'
import { strictObject } from './strict_object.util'

describe('strictObject', () => {
  it('accepts a matching object', () => {
    const schema = strictObject({ id: Type.Integer() })
    expect(Value.Check(schema, { id: 1 })).toBe(true)
  })

  it('rejects unknown properties', () => {
    const schema = strictObject({ id: Type.Integer() })
    expect(Value.Check(schema, { id: 1, extra: true })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `bun test src/shared/typebox/strict_object.util.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/shared/typebox/strict_object.util.ts`:

```ts
import { type ObjectOptions, type TObject, type TProperties, Type } from '@sinclair/typebox'

/**
 * Build a TypeBox object that rejects unknown keys. Replaces the repeated
 * `Type.Object(props, { additionalProperties: false })` tail.
 */
export function strictObject<T extends TProperties>(
  properties: T,
  options: Omit<ObjectOptions, 'additionalProperties'> = {}
): TObject<T> {
  return Type.Object(properties, { ...options, additionalProperties: false })
}
```

`src/shared/typebox/index.ts`:

```ts
export { literalUnion } from './literal_union.util'
export { strictObject } from './strict_object.util'
```

- [ ] **Step 4: Run test, verify it passes**

Run: `bun test src/shared/typebox/strict_object.util.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Verify the alias resolves**

Run: `bun -e "import { literalUnion, strictObject } from '@shared/typebox'; console.log(typeof literalUnion, typeof strictObject)"`
Expected: `function function`.

- [ ] **Step 6: Commit**

```bash
git add src/shared/typebox/strict_object.util.ts src/shared/typebox/strict_object.util.spec.ts src/shared/typebox/index.ts
git commit -m "Add strictObject TypeBox builder and barrel"
```

**Acceptance gate (SRC-1 AC2 partial):** `bun test src/shared/typebox/` green; `@shared/typebox` import resolves.

---

## Phase B — SRC-1 adoption

### Task 3: Adopt builders in `schemas.ts`

**Files:**
- Modify: `src/shell/main/rpc/schemas.ts`
- Test: `src/shell/main/rpc/schemas.spec.ts` (existing — must stay green)

- [ ] **Step 1: Baseline the existing specs (must be green before edit)**

Run: `bun test src/shell/main/rpc/schemas.spec.ts`
Expected: PASS. (If not green at baseline, STOP — investigate before changing.)

- [ ] **Step 2: Replace literal-unions and strict objects**

In `src/shell/main/rpc/schemas.ts`:
- Add `import { literalUnion, strictObject } from '@shared/typebox'`.
- Replace each hand-rolled union with `literalUnion`. Concretely:
  - `pageSizePatchSchema` → `literalUnion([PAGE_SIZE_SMALL, PAGE_SIZE_MEDIUM, PAGE_SIZE_LARGE, PAGE_SIZE_XL] as const)`
  - `taskViewSchema` → `literalUnion(taskViewValues)` (drop the 6 `Type.Literal` lines)
  - `entryTypeSchema` → `literalUnion(ENTRY_TYPE_VALUES)`
  - `priorityUnionSchema` → `literalUnion(['low', 'mid', 'high', 'urgent'] as const)`
  - status union (in `taskUpdateSchema.patch`) → `literalUnion(['todo', 'doing', 'done'] as const)`
  - `dirSchema` → `literalUnion(['forward', 'backward'] as const)`
  - `reorderDirSchema` → `literalUnion(['up', 'down'] as const)`
  - `e2eFaultModes` → `literalUnion(['off', 'source_write_failed', 'unset'] as const)`
  - `showOpenDialog` properties union → `literalUnion(['openFile', 'openDirectory'] as const)`
- Replace **every** `Type.Object({...}, { additionalProperties: false })` with `strictObject({...})` (drop the trailing options object). This covers all 28 occurrences.

Leave `Type.Integer`, `Type.Optional`, `Type.String`, `Type.Array`, `Type.Number`, and bounds (`minimum`/`maximum`) untouched.

- [ ] **Step 3: Run the existing contract specs**

Run: `bun test src/shell/main/rpc/schemas.spec.ts && bun test src/shell/main/rpc/routes`
Expected: PASS — validation behaviour is identical.

- [ ] **Step 4: Verify the pattern counts dropped**

Run: `rg -c 'additionalProperties: false' src/shell/main/rpc/schemas.ts`
Expected: `0` (or no match).
Run: `rg -c 'Type\.Literal' src/shell/main/rpc/schemas.ts`
Expected: `0` (or no match).

- [ ] **Step 5: Commit**

```bash
git add src/shell/main/rpc/schemas.ts
git commit -m "Adopt TypeBox builders in rpc schemas"
```

**Acceptance gate (SRC-1 AC1, AC2):** `schemas.ts` has 0 `additionalProperties: false` and 0 `Type.Literal`; `bun test src/shell/main/rpc` green.

---

### Task 4: Adopt builders in the 5 core schema files

**Files (each Modify + run its existing spec):**
- `src/core/domain/models/knowledges/schemas/knowledge.schema.ts`
- `src/core/domain/models/entries/schemas/task.schema.ts`
- `src/core/domain/models/entries/schemas/entry.schema.ts`
- `src/core/domain/models/entries/schemas/link.schema.ts`
- `src/core/domain/models/entries/schemas/shortcut.schema.ts`

- [ ] **Step 1: For each file, baseline its spec**

Run (example): `bun test src/core/domain/models/entries/schemas/entry.schema.spec.ts`
Expected: PASS before editing.

- [ ] **Step 2: Replace multi-member literal-unions with `literalUnion`**

In each file, add `import { literalUnion } from '@shared/typebox'` (and `strictObject` only if that file uses `additionalProperties: false`; per baseline only `schemas.ts` did, so `strictObject` is likely unused here — do not add an unused import, knip will flag it). Replace each `Type.Union([Type.Literal(...), ...])` of 2+ members with `literalUnion([...] as const)`.

Do **not** change a single-member literal or a non-literal union.

- [ ] **Step 3: Verify the `core-schema-must-be-pure-typebox` rule still holds**

Run: `bun run lint:depcruise`
Expected: 0 violations (the import is from `@shared`, which is pure and already a legal core dependency).

- [ ] **Step 4: Run all five specs**

Run: `bun test src/core/domain/models/entries/schemas src/core/domain/models/knowledges/schemas`
Expected: PASS.

- [ ] **Step 5: Verify the global literal count target**

Run: `rg -c 'Type\.Literal' src --glob '!*.spec.*' | awk -F: '{s+=$2} END{print s}'`
Expected: `≤ 12` (down from 46).

- [ ] **Step 6: Commit**

```bash
git add src/core/domain/models
git commit -m "Adopt literalUnion in core schemas"
```

**Acceptance gate (SRC-1 AC4):** all five core schema specs green; `bun run lint:depcruise` clean; global `Type.Literal` count ≤ 12.

---

## Phase C — SRC-2 single-source payload types

### Task 5: Relocate `ENTRY_TYPE_VALUES` to `@shared/constants`

**Files:**
- Create: `src/shared/constants/entry_type.const.ts`
- Create: `src/shared/constants/entry_type.const.spec.ts`
- Modify: `src/core/domain/constants/entry.const.ts`

- [ ] **Step 1: Write the failing test**

`src/shared/constants/entry_type.const.spec.ts`:

```ts
import { describe, expect, it } from 'bun:test'
import { ENTRY_TYPE_VALUES } from './entry_type.const'

describe('ENTRY_TYPE_VALUES', () => {
  it('lists the five entry types in canonical order', () => {
    expect(ENTRY_TYPE_VALUES).toEqual(['bookmark', 'command', 'cheat', 'task', 'shortcut'])
  })
})
```

- [ ] **Step 2: Run, verify fail**

Run: `bun test src/shared/constants/entry_type.const.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the shared constant**

`src/shared/constants/entry_type.const.ts`:

```ts
/** Canonical entry-type discriminants. Lives in shared so both core and the
 *  shared RPC payload schemas can reference one source (core → shared is the
 *  legal dependency direction). */
export const ENTRY_TYPE_VALUES = ['bookmark', 'command', 'cheat', 'task', 'shortcut'] as const
```

- [ ] **Step 4: Re-export from core for back-compat**

In `src/core/domain/constants/entry.const.ts`, replace the literal definition
line with a re-export so every existing `@core/domain/constants` consumer keeps
working:

```ts
export { ENTRY_TYPE_VALUES } from '@shared/constants/entry_type.const'
```

Keep all derived constants (`ENTRY_KEYS`, `SECTION_ENTRY_TYPE_VALUES`,
`ENTRY_TYPE_GLYPH`, etc.) exactly as-is — they import `ENTRY_TYPE_VALUES` from
the top of the same file, which now resolves to the re-export.

- [ ] **Step 5: Run impacted suites + dep check**

Run: `bun test src/shared/constants/entry_type.const.spec.ts && bun test src/core && bun run lint:depcruise`
Expected: PASS; depcruise shows **0** `shared → core` edges and 0 new cycles.

- [ ] **Step 6: Verify no caller broke**

Run: `bun run typecheck`
Expected: PASS — `@core/domain/constants` still exports `ENTRY_TYPE_VALUES`.

- [ ] **Step 7: Commit**

```bash
git add src/shared/constants/entry_type.const.ts src/shared/constants/entry_type.const.spec.ts src/core/domain/constants/entry.const.ts
git commit -m "Relocate ENTRY_TYPE_VALUES to shared constants"
```

**Acceptance gate (SRC-2 AC1):** `@shared/constants/entry_type.const` and `@core/domain/constants` both export `ENTRY_TYPE_VALUES`; `bun run lint:depcruise` shows 0 `shared → core` edges; `bun run typecheck` green.

---

### Task 6: Single-source payload schemas in `@shared/rpc`

**Files:**
- Create: `src/shared/rpc/payload_schemas.ts`
- Create: `src/shared/rpc/payload_schemas.spec.ts`
- Modify: `src/shell/main/rpc/schemas.ts`
- Modify: `tsconfig.json` (add `@shared/rpc/*` alias)

- [ ] **Step 0: Add the `@shared/rpc/*` path alias**

`tsconfig.json` only has `@shared/rpc` (the barrel). Importing the schema module
by subpath needs a wildcard alias. In `compilerOptions.paths`, add (right after
the existing `@shared/rpc` line):

```jsonc
"@shared/rpc/*": ["./src/shared/rpc/*"],
```

This lets `schemas.ts` do a **value** import `from '@shared/rpc/payload_schemas'`
(it needs the runtime TypeBox schemas for Elysia bodies). `desktop_rpc_schema.ts`
in Task 7 imports `./payload_schemas` relatively (same dir) — no alias needed
there, and it uses `import type` so no runtime TypeBox leaks into the renderer
bundle.

- [ ] **Step 1: Write the failing test**

`src/shared/rpc/payload_schemas.spec.ts`:

```ts
import { Value } from '@sinclair/typebox/value'
import { describe, expect, it } from 'bun:test'
import { configPatchSchema, listOptsSchema, taskCreateSchema } from './payload_schemas'

describe('payload_schemas', () => {
  it('accepts a valid list opts payload', () => {
    expect(Value.Check(listOptsSchema, { query: 'x', limit: 10, offset: 0 })).toBe(true)
  })
  it('rejects unknown keys on list opts', () => {
    expect(Value.Check(listOptsSchema, { bogus: 1 })).toBe(false)
  })
  it('requires a key on task create', () => {
    expect(Value.Check(taskCreateSchema, {})).toBe(false)
    expect(Value.Check(taskCreateSchema, { key: 'k' })).toBe(true)
  })
  it('accepts a valid page size on config patch', () => {
    expect(Value.Check(configPatchSchema, { pageSize: 50 })).toBe(true)
    expect(Value.Check(configPatchSchema, { pageSize: 51 })).toBe(false)
  })
})
```

- [ ] **Step 2: Run, verify fail**

Run: `bun test src/shared/rpc/payload_schemas.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Move the request-payload schemas into `payload_schemas.ts`**

Create `src/shared/rpc/payload_schemas.ts` and move these schemas (and only
these — the *request* payloads) out of `schemas.ts`, using the builders and the
shared constant:

- `listOptsSchema`, `listStatsFilterSchema` (+ their `listFilterFields`,
  `taskViewValues`/`taskViewSchema`, `entryTypeSchema`)
- `configPatchSchema` (+ `pageSizePatchSchema` and its `PAGE_SIZE_*` consts)
- `taskCreateSchema`, `taskUpdateSchema` (+ `priorityUnionSchema`,
  `sourceVersionSchema`, status union)
- `showOpenDialogSchema` (+ its properties union)
- `getEntryParams`, `idWithDirSchema`, `idWithReorderDirSchema`,
  `taskDeleteSchema`, `dirSchema`, `reorderDirSchema`, `RPC_LIST_LIMIT_MAX`

Use `import { literalUnion, strictObject } from '@shared/typebox'` and
`import { ENTRY_TYPE_VALUES } from '@shared/constants/entry_type.const'`.

Keep **shell-only** schemas (`e2eFaultModeSchema`, `resizeWindowSchema`,
`setWindowPositionSchema`, `emptyBodySchema`, terminal/editor/url schemas, window
position schemas, binding schemas) in `schemas.ts` — they are transport-only and
have no shared-type counterpart. (If a schema is ambiguous, leave it in
`schemas.ts`; only the 6 types in Task 7 strictly need to move.)

- [ ] **Step 4: Re-export from `schemas.ts`**

At the top of `src/shell/main/rpc/schemas.ts`:

```ts
export * from '@shared/rpc/payload_schemas'
```

Remove the moved definitions from `schemas.ts`. Routes import unchanged from
`../schemas`, which now re-exports.

- [ ] **Step 5: Run, verify pass**

Run: `bun test src/shared/rpc/payload_schemas.spec.ts && bun test src/shell/main/rpc`
Expected: PASS — routes and contract specs unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/shared/rpc/payload_schemas.ts src/shared/rpc/payload_schemas.spec.ts src/shell/main/rpc/schemas.ts
git commit -m "Move RPC payload schemas to shared single source"
```

**Acceptance gate (SRC-2 AC2):** payload schemas live in `@shared/rpc`; `schemas.ts` re-exports them with no duplicated body; `bun test src/shell/main/rpc` green.

---

### Task 7: Derive shared types via `Static<>`

**Files:**
- Modify: `src/shared/rpc/desktop_rpc_schema.ts`
- Modify: `src/shell/main/rpc/schemas.spec.ts`

- [ ] **Step 1: Replace the 6 hand-written types with `Static<>` aliases**

In `src/shared/rpc/desktop_rpc_schema.ts`, replace the hand-written bodies of
`TaskView`, `ListOpts`, `ConfigPatch`, `TaskCreateInput`, `TaskUpdateInput`,
`OpenDialogOpts` with derivations:

```ts
import type { Static } from '@sinclair/typebox'
// Type-only import: keeps the TypeBox runtime out of the renderer bundle while
// still allowing `Static<typeof schema>`.
import type {
  configPatchSchema,
  listOptsSchema,
  showOpenDialogSchema,
  taskCreateSchema,
  taskUpdateSchema
} from './payload_schemas'

export type ListOpts = Static<typeof listOptsSchema>
export type ConfigPatch = Static<typeof configPatchSchema>
export type TaskCreateInput = Static<typeof taskCreateSchema>
export type TaskUpdateInput = Static<typeof taskUpdateSchema>['patch']
export type OpenDialogOpts = NonNullable<Static<typeof showOpenDialogSchema>['opts']>
export type TaskView = ListOpts['taskView'] & string
```

> Note: `TaskUpdateInput` historically is the *patch* shape; derive it from the
> schema's `patch` property as shown. If a derived type differs structurally from
> the original (e.g. optional vs required), prefer the **schema** as truth and
> adjust the schema, not the type — the schema is what the route validates.

- [ ] **Step 2: Keep response-only types hand-written**

Leave `ListStats`, `RpcImportResult`, `RpcDbStats`, `RpcSyncProgressPayload`,
`RpcSyncFileResult`, `BindingRef`, `PreviewImageResult`, `RpcGetConfigPayload`,
`RpcKnowledge`, `RpcListEntry` untouched (no schema exists for them).

- [ ] **Step 3: Update the CONTRACT NOTE**

Rewrite the CONTRACT NOTE comment to state that the 6 payload types are now
derived via `Static<>` from `@shared/rpc/payload_schemas` (single source), so
drift is impossible by construction; only response-only types remain
hand-written.

- [ ] **Step 4: Drop/rewrite the drift assertions**

In `src/shell/main/rpc/schemas.spec.ts`, remove (or convert to a trivial
`Static<>` identity check) any assertion that only existed to prove a
hand-written type equals its schema for the 6 derived types. Keep all
behavioural validation assertions.

- [ ] **Step 5: Typecheck + full impacted suites**

Run: `bun run typecheck && bun test src/shared/rpc && bun test src/shell/main/rpc && bun test src/shell/renderer/rpc`
Expected: PASS — the renderer and app import the same type names with identical shapes.

- [ ] **Step 6: Verify the derivation measure**

Run: `rg -n 'export type (ListOpts|ConfigPatch|TaskCreateInput|TaskUpdateInput|OpenDialogOpts|TaskView)\b' src/shared/rpc`
Expected: each appears once, defined via `Static<>`/derivation (not a hand-written object literal).

- [ ] **Step 7: Commit**

```bash
git add src/shared/rpc/desktop_rpc_schema.ts src/shell/main/rpc/schemas.spec.ts
git commit -m "Derive RPC payload types from shared schemas"
```

**Acceptance gate (SRC-2 AC3, AC4, AC5):** the 6 types are `Static<>`-derived; response-only types untouched; `bun run typecheck` + `bun test src/shared/rpc src/shell/main/rpc src/shell/renderer/rpc` green; CONTRACT NOTE updated.

---

## Phase D — SRC-3 client call kernel

### Task 8: Add `call<T>` and convert the renderer client wrappers

**Files:**
- Modify: `src/shell/renderer/rpc/client.ts`
- Modify: `src/shell/renderer/rpc/client_task_mutation.util.ts`
- Modify: `src/shell/renderer/rpc/client.spec.tsx`

- [ ] **Step 1: Baseline the client specs**

Run: `bun test src/shell/renderer/rpc`
Expected: PASS before editing.

- [ ] **Step 2: Add the `call` helper beside `unwrap` in `client.ts`**

After the existing `unwrap` function in `src/shell/renderer/rpc/client.ts`:

```ts
type TreatyPending<T> = Promise<{ data: T | null; error: { value: unknown; status: number } | null }>

/**
 * Run an Eden Treaty call through `unwrap`, carrying the response type. Replaces
 * the repeated `rpc.api.X.post(...).then(unwrap) as Promise<T>` cast — the type
 * argument lives in one place (this signature) instead of at every call site.
 */
export function call<T>(pending: TreatyPending<T>): Promise<T> {
  return pending.then(unwrap)
}
```

- [ ] **Step 3: Add a `call` test to `client.spec.tsx`**

Add cases that exercise `call` directly (no real network — pass a resolved
Treaty-shaped object):

```ts
import { call } from './client'

it('call returns data on success (including null)', async () => {
  await expect(call(Promise.resolve({ data: 42, error: null }))).resolves.toBe(42)
  await expect(call(Promise.resolve({ data: null, error: null }))).resolves.toBeNull()
})

it('call throws the unwrapped error message', async () => {
  await expect(
    call(Promise.resolve({ data: null, error: { value: 'boom', status: 500 } }))
  ).rejects.toThrow('boom')
})
```

- [ ] **Step 4: Convert all 26 wrappers in `client.ts`**

Apply this exact transform to every exported wrapper of the form
`return rpc.api.X.post(BODY).then(unwrap) as Promise<T>`:

```ts
// before
export function listEntries(opts: ListOpts = {}): Promise<RpcListEntry[]> {
  return rpc.api.list.post(opts).then(unwrap) as Promise<RpcListEntry[]>
}
// after
export function listEntries(opts: ListOpts = {}): Promise<RpcListEntry[]> {
  return call<RpcListEntry[]>(rpc.api.list.post(opts))
}
```

The keyword-argument body and the return-type annotation stay identical; only
`.then(unwrap) as Promise<T>` becomes `call<T>(...)`. `syncRpc` keeps its extra
`.then(result => { notifyAfterSyncComplete(result); return result })` chain —
wrap only the post call: `call<RpcImportResult>(rpc.api.sync.post(params)).then(...)`.

- [ ] **Step 5: Convert the 6 wrappers in `client_task_mutation.util.ts`**

It already imports `{ rpc, unwrap }` from `./client`; change to
`import { rpc, call } from './client'` (drop `unwrap` if now unused — knip will
flag it otherwise) and apply the same transform, e.g.:

```ts
export function createTask(input: TaskCreateInput): Promise<TaskMutationOutcome<RpcKnowledge>> {
  return call<TaskMutationOutcome<RpcKnowledge>>(rpc.api.createTask.post(input))
}
```

- [ ] **Step 6: Run specs + typecheck**

Run: `bun test src/shell/renderer/rpc && bun run typecheck`
Expected: PASS.

- [ ] **Step 7: Verify the cast count dropped to zero**

Run: `rg -c '\.then\(unwrap\) as Promise' src/shell/renderer/rpc/client.ts src/shell/renderer/rpc/client_task_mutation.util.ts`
Expected: `0` (no matches).

- [ ] **Step 8: Verify exports preserved + knip clean**

Run: `rg -n 'export (function|const) ' src/shell/renderer/rpc/client.ts src/shell/renderer/rpc/client_task_mutation.util.ts`
Expected: same exported names as `baseline-metrics.txt` records (plus the new `call`).
Run: `bun run lint:knip`
Expected: no newly-unused exports.

- [ ] **Step 9: Commit**

```bash
git add src/shell/renderer/rpc/client.ts src/shell/renderer/rpc/client_task_mutation.util.ts src/shell/renderer/rpc/client.spec.tsx
git commit -m "Add call helper and drop client unwrap casts"
```

**Acceptance gate (SRC-3 AC1, AC2, AC3):** 0 `.then(unwrap) as Promise` casts; `call` covered by `client.spec.tsx`; all client export names preserved; `bun test src/shell/renderer/rpc` + `bun run typecheck` + `bun run lint:knip` green.

---

## Phase E — SRC-4 `app.ts` internal DRY

### Task 9: Private `raw()` accessor in `App`

**Files:**
- Modify: `src/shell/app/app.ts`
- Test: existing `src/shell/app/**` specs (must stay green)

- [ ] **Step 1: Baseline the app suite**

Run: `bun test src/shell/app`
Expected: PASS before editing.

- [ ] **Step 2: Add the private accessor**

In `src/shell/app/app.ts`, add a private method (near `getDbForTaskMutation`):

```ts
/** The raw SQLite handle, guarded by the sync gate. Single funnel for reads. */
private raw(): import('bun:sqlite').Database {
  return this.getDbForTaskMutation().raw
}
```

- [ ] **Step 3: Replace the 10 destructures**

Replace every `const { raw } = this.getDb()` / `const { raw } = this.getDbForTaskMutation()`
with a direct `this.raw()` at the use site. Example:

```ts
// before
list(opts: ListOpts = {}): Promise<RpcListEntry[]> {
  const { raw } = this.getDbForTaskMutation()
  return Promise.resolve(listKnowledgeForOpts(raw, this.loaded, opts, this.listCache))
}
// after
list(opts: ListOpts = {}): Promise<RpcListEntry[]> {
  return Promise.resolve(listKnowledgeForOpts(this.raw(), this.loaded, opts, this.listCache))
}
```

Keep `getDbForTaskMutation()` public (the task-mutation utils call it
externally) and keep `getRawDbForTesting`, `closeDb`, and the `syncGate` logic
exactly as-is. Where a method calls `this.raw()` multiple times, call it once
into a local `const raw = this.raw()` to avoid repeated gate checks — match the
existing single-read-per-method shape.

- [ ] **Step 4: Run the app suite + typecheck**

Run: `bun test src/shell/app && bun run typecheck`
Expected: PASS — no behavioural change.

- [ ] **Step 5: Verify the destructure count dropped**

Run: `rg -c 'const \{ raw \} = this\.get' src/shell/app/app.ts`
Expected: `0` (no matches).

- [ ] **Step 6: Record the new app.ts LOC (needed for SRC-6)**

Run: `wc -l src/shell/app/app.ts`
Note the number for Task 12.

- [ ] **Step 7: Commit**

```bash
git add src/shell/app/app.ts
git commit -m "Funnel App raw db access through accessor"
```

**Acceptance gate (SRC-4 AC1, AC2, AC3):** 0 `const { raw } = this.get` in `app.ts`; public method set unchanged; delegate forwarders untouched; `bun test src/shell/app` green.

---

## Phase F — SRC-5 thin-file consolidation

### Task 10: Thin-file inventory

**Files:**
- Create: `assets/specs/016-src-kernel-dry/thin-file-inventory.md`

- [ ] **Step 1: Enumerate the thin files**

Run: `find src -type f -name '*.ts*' ! -name '*.spec.*' -exec wc -l {} \; | awk '$1<=15' | sort -n`

- [ ] **Step 2: Bucket every file**

Write `thin-file-inventory.md` with a table; each enumerated file goes in exactly
one bucket:
- **mergeable** — multiple files in the *same directory* whose suffix the ls-lint
  rule for that directory permits to coexist in one file (e.g. two `*.const.ts`
  in a dir with a `.const|index` rule can be one `*.const.ts`; the
  `knowledges/preview/*.regex.const.ts` consts).
- **lint-locked** — directory's ls-lint rule requires one artifact per basename
  (e.g. `src/shell/main/rpc` only allows `host|schemas|server`); cannot merge
  without editing `.ls-lint.yml`. Leave alone.
- **intentional-barrel** — `index.ts` re-export.

For each entry record: path, LOC, bucket, and (for mergeable) the target file.

- [ ] **Step 3: Verify completeness**

Cross-check: every path from Step 1 appears once in the table.

- [ ] **Step 4: Commit**

```bash
git add assets/specs/016-src-kernel-dry/thin-file-inventory.md
git commit -m "Add thin-file consolidation inventory"
```

**Acceptance gate (SRC-5 AC1):** every ≤15-LOC non-spec file is bucketed exactly once.

---

### Task 11: Execute the mergeable merges

**Files:** as listed in the inventory's **mergeable** bucket (+ their import sites and specs).

- [ ] **Step 1: For each mergeable group, merge into one file**

Combine the contents into the single target file (valid suffix for that
directory's ls-lint rule). Delete the now-empty source files. Update every
import site (`rg` the old module path to find them).

- [ ] **Step 2: Co-locate/keep specs**

If a merged file has testable logic, ensure a co-located `.spec.ts` covers it
(merge the old specs similarly).

- [ ] **Step 3: Run the full gate locally**

Run: `bun run typecheck && bun test && bun run lint:ls && bun run lint:biome && bun run lint:knip`
Expected: all PASS; no stale imports (`rg` the old paths → 0).

- [ ] **Step 4: Verify the file-count reduction**

Compare `find src -type f -name '*.ts*' ! -name '*.spec.*' | wc -l` before/after
(baseline is recorded in `closeout-metrics.txt` at Task 13).
Expected: net decrease **≥ 4**.

- [ ] **Step 5: Confirm no rule files changed**

Run: `git diff --name-only .ls-lint.yml biome.jsonc .dependency-cruiser.cjs knip.jsonc`
Expected: empty.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Merge lint-permitted thin files"
```

**Acceptance gate (SRC-5 AC2, AC3):** net non-spec file count −≥4; full gate green; `git diff` of all four rule files empty.

---

## Phase G — SRC-6 Biome hardening

### Task 12: Strengthen the two src-scoped Biome overrides

**Files:**
- Modify: `biome.jsonc`

- [ ] **Step 1: Flip renderer `noProcessEnv` to error**

In the `src/shell/renderer/**` override (the one with `noProcessEnv`), change
`"noProcessEnv": "off"` to `"noProcessEnv": "error"`.

- [ ] **Step 2: Lower the `app.ts` line cap**

In the `src/shell/app/app.ts` override, set `noExcessiveLinesPerFile.maxLines`
to the post-SRC-4 `app.ts` line count (from Task 9 Step 6) rounded **up** to the
next multiple of 5 (must be ≤ 310 and ≥ actual LOC). Keep level `"error"`.

- [ ] **Step 3: Verify biome is green and nothing else changed**

Run: `bun run lint:biome`
Expected: PASS (renderer has 0 `process.env` usages; app.ts is under the new cap).
Run: `git diff biome.jsonc`
Expected: only the two override values changed — no other rule, budget, or `includes` touched.

- [ ] **Step 4: Prove the renderer rule is now active (probe, then revert)**

Temporarily add `const x = process.env.HOME` to any `src/shell/renderer/*.ts`
file. Run: `bun run lint:biome`. Expected: FAIL on `noProcessEnv`. Then **revert
the probe** (`git checkout` the file).

- [ ] **Step 5: Commit**

```bash
git add biome.jsonc
git commit -m "Strengthen src-scoped Biome overrides"
```

**Acceptance gate (SRC-6 AC1, AC2, AC3):** renderer `noProcessEnv` is `error`; `app.ts` cap lowered to ≤310 and ≥ actual LOC; `bun run lint:biome` green; `git diff biome.jsonc` shows only those two edits.

---

## Phase H — Closeout

### Task 13: Closeout metrics + catalog key + full gate

**Files:**
- Create: `assets/specs/016-src-kernel-dry/closeout-metrics.txt`
- Modify: `assets/catalog/catalog.yaml`

- [ ] **Step 1: Re-run every baseline command and record actuals**

Re-run each command block from `baseline-metrics.txt` and write the results to
`closeout-metrics.txt` alongside the baseline value and the spec target. Include
the named-surface `wc -l` total and the whole-`src` non-spec file count.

- [ ] **Step 2: Verify every Quantified-Gains target floor is met**

Check against `spec.md` → Quantified gains:
- `Type.Literal` ≤ 12 · `additionalProperties: false` 0 · `.then(unwrap) as Promise` 0 · `const { raw } = this.get` 0 · 6 payload types `Static<>`-derived · named-surface total ≤ 1084 LOC · file count −≥4.
If any floor is missed, STOP and fix the relevant phase before proceeding.

- [ ] **Step 3: Register the catalog key**

Add a `src_kernel_dry:` entry to `assets/catalog/catalog.yaml` mirroring the
shape of the existing `ops_cli_dry:` entry (same fields; point it at
`assets/specs/016-src-kernel-dry`).

- [ ] **Step 4: Run the full quality gate**

Run: `mise run spec ready assets/specs/016-src-kernel-dry --key src_kernel_dry`
Expected: PASS (tag tests + catalog validation + `bun test` + typecheck +
depcruise + ls-lint + biome + knip).

- [ ] **Step 5: Confirm the hard guardrails**

Run: `git diff --name-only .ls-lint.yml .dependency-cruiser.cjs knip.jsonc`
Expected: empty. (Only `biome.jsonc` changed, via Task 12.)

- [ ] **Step 6: Commit**

```bash
git add assets/specs/016-src-kernel-dry/closeout-metrics.txt assets/catalog/catalog.yaml
git commit -m "Record 016 closeout metrics and catalog key"
```

**Acceptance gate (DoD 1–6):** all target floors met in `closeout-metrics.txt`;
`mise run spec ready … --key src_kernel_dry` green; non-biome rule files unchanged.

---

## Self-review checklist (run before handing off)

- [ ] Every SRC-1…SRC-6 acceptance criterion maps to a task's Acceptance gate.
- [ ] No placeholders: every code step shows real code; every run step shows the command + expected result.
- [ ] Type/name consistency: `literalUnion`, `strictObject`, `call`, `App.raw()`, `ENTRY_TYPE_VALUES`, `@shared/typebox`, `@shared/rpc/payload_schemas` used identically across tasks.
- [ ] No rule file edited except `biome.jsonc` in Task 12.
- [ ] Behaviour frozen: every modify-task first baselines the existing spec green, then re-runs it green after.
