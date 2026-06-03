<!-- markdownlint-disable-file -->
# Validators — Design (TypeBox migration & workspace flatten)

## OVERVIEW

This refactor amends the Phase 3 commit (`33c3a63` — `feat(core): Add domain
types, schemas, parsers`) so the foundation domain layer is TypeBox-native
from day one. Three concerns ship together because they're cross-cutting and
inseparable from a clean Phase 3 baseline:

1. **Validation library:** Zod → TypeBox throughout `src/core/`.
2. **Workspace shape:** flat layout — root `package.json` owns ALL
   dependencies; the 3 nested `package.json` files are deleted.
3. **Type ergonomics:** `type-fest` applied aggressively for unknown shapes
   (`UnknownRecord`), YAML parse outputs (`JsonValue`, `JsonObject`), and
   inferred TypeBox types (`Simplify`).

The architecture is unchanged — Functional Core / Imperative Shell —
[FCIS][fcis]. What changes is which validator powers the core, and a strict
new split: `*.schema.ts` files contain only TypeBox shapes; `*.parser.ts`
files contain coercion logic plus custom error messages.

---

## ARCHITECTURE DECISIONS

### Decision 1 — TypeBox throughout (Zod removed)

**Decision:** [`@sinclair/typebox`][typebox] is the sole runtime validator
across `src/core/` and the transport layer. Zod is not used anywhere.

**Rationale:** A single validation library eliminates dual-import overhead,
reduces the renderer bundle, and removes cognitive friction. TypeBox's
JSON-Schema compatibility composes naturally with [`drizzle-typebox`][dt];
its validate-only design enforces a clean split between shape validation
(`*.schema.ts`) and coercion logic (`*.parser.ts`).

**Consequence:** Zod's `.transform()` / `.pipe()` / `.refine()` chains do not
have direct TypeBox equivalents. Coercion logic moves out of `*.schema.ts`
into `*.parser.ts` files. This is a structural improvement — the
`parsers/` directory already exists and was under-used.

### Decision 2 — Schema vs parser split, enforced by dependency-cruiser

**Decision:** A `*.schema.ts` file may import only:

- `@sinclair/typebox`
- Other `*.schema.ts` files in the same domain
- `../types/` and `../constants/` (sibling pure-data modules)

It MUST NOT import parsers, factories, helpers (other than the validation
helper), or any external library besides TypeBox.

A new `dependency-cruiser` rule `core-schema-must-be-pure-typebox` enforces
this at lint time.

**Rationale:** Without enforcement, schemas drift back toward bundling
coercion logic. The rule fails CI before review.

### Decision 3 — Validation helper module

**Decision:** A single helper file
[`src/core/validation/typebox.helper.ts`][helper] exposes the primitives
every schema and parser reuses: `compile`, `parse`, `safeParse`,
`formatErrors`, `TypeBoxValidationError`, `makeGuard`.

**Rationale:** `TypeCompiler.Compile` is heavy. The helper caches compiled
checkers in a `WeakMap<TSchema, TypeCheck>` so each schema compiles ONCE per
process. Error formatting is centralised so call-sites don't reinvent it.

[helper]: ../../../../src/core/validation/typebox.helper.ts

### Decision 4 — Flat workspace, tsconfig paths only

**Decision:** Delete the 3 nested `package.json` files (`src/core/`,
`src/shared/types/`, `src/shared/utils/`). Path resolution happens
exclusively via `tsconfig.json` `compilerOptions.paths`. Bun resolves these
natively; Biome's import-organizer respects them; `dependency-cruiser`
resolves them via its `tsConfig` option.

**Rationale:** app is not a monorepo. The nested `package.json` files were
acting purely as bare-import declarations — a heavyweight mechanism for a
lightweight need. tsconfig `paths` is the standard approach and gives a
single source of truth.

### Decision 5 — `type-fest` aggressive (with one rule)

**Decision:** Use `type-fest` types where they sharpen meaning:

- `UnknownRecord` — for genuinely unknown / untrusted shapes.
- `JsonValue` / `JsonObject` — for YAML parse outputs.
- `Simplify` — wrapping every exported `Static<typeof Schema>` to keep
  IDE tooltips readable.

**Rule:** `Record<string, X>` where `X` is concrete (e.g. `Record<string,
string>`) STAYS concrete. `UnknownRecord` is only for `unknown` value types.
This is the discipline that prevents `type-fest` from becoming noise.

---

## VALIDATION HELPER MODULE

### File layout

```text
src/core/validation/
  typebox.helper.ts           ~80 lines
  typebox.helper.spec.ts
  index.ts
```

### Public API

```ts
import { type Static, type TSchema, Type } from '@sinclair/typebox'
import { Value, type ValueError } from '@sinclair/typebox/value'
import { TypeCompiler, type TypeCheck } from '@sinclair/typebox/compiler'

/** Compile once, reuse forever — wraps TypeCompiler.Compile with caching. */
export function compile<T extends TSchema>(schema: T): TypeCheck<T>

/** Throw if invalid; otherwise return the value typed as Static<T>. */
export function parse<T extends TSchema>(schema: T, value: unknown): Static<T>

/** Non-throwing variant — returns { ok, data } | { ok: false, errors }. */
export function safeParse<T extends TSchema>(
  schema: T,
  value: unknown
): { ok: true; data: Static<T> } | { ok: false; errors: ValueError[] }

/** Format ValueError[] into Zod-style "path: message; path: message" string. */
export function formatErrors(errors: Iterable<ValueError>): string

/** Replaces ZodError instance checks. */
export class TypeBoxValidationError extends Error {
  readonly errors: ValueError[]
  constructor(errors: ValueError[], context?: string)
}

/** Type guard helper — returns a runtime predicate for a TSchema. */
export function makeGuard<T extends TSchema>(
  schema: T
): (value: unknown) => value is Static<T>
```

### Why this shape

- `compile` is the **only** code path that calls `TypeCompiler.Compile`. The
  cache lives inside the helper module — callers never see it.
- `safeParse` returns a discriminated union with the same shape as Zod's
  `safeParse` so call-sites migrate mechanically.
- `formatErrors` produces the same `"path: message; path: message"` output
  as the old `formatZodIssues` — `entry.factory.ts` does not change its
  error-wrapping format.
- `TypeBoxValidationError` is what `entry.factory.ts:40` checks via
  `instanceof` (replacing the old `instanceof ZodError` branch).

---

## FILE REORGANISATION

```text
src/core/domain/models/entries/
  schemas/
    base.schema.ts              REWRITE — thin TypeBox shape only
    entry.schema.ts             REWRITE — TypeBox discriminated union
    link.schema.ts              REWRITE — TypeBox shape (no transforms)
    meta.schema.ts              DELETE  — logic moves to parsers/meta.parser.ts
    notes.schema.ts             DELETE  — logic moves to parsers/notes.parser.ts
    source_row_min.schema.ts    REWRITE — TypeBox shape only
    tags.schema.ts              REWRITE — TypeBox shape only (regex pattern, min/max)
    task.schema.ts              KEEP    — already TypeBox
  parsers/                      (new files coercing unknown → typed values)
    base_fields.parser.ts       EXISTS — minor rewrite to call new helpers
    link.parser.ts              NEW    — was the .transform() in link.schema.ts
    meta.parser.ts              NEW    — was meta.schema.ts entirely
    notes.parser.ts             NEW    — was notes.schema.ts entirely
    source_document.parser.ts   EXISTS — UnknownRecord / JsonValue / JsonObject
    tags.parser.ts              NEW    — was the .transform() in tags.schema.ts
  factories/
    entry.factory.ts            REWRITE — uses parse() / safeParse() / TypeBoxValidationError
```

---

## NAMING CONVENTION (REINFORCED)

| Suffix         | Contains                                                                     | Imports                                       |
| -------------- | ---------------------------------------------------------------------------- | --------------------------------------------- |
| `*.schema.ts`  | TypeBox shape definitions only — `Type.Object`, `Type.Union`, etc.           | `@sinclair/typebox`                           |
| `*.parser.ts`  | Pure functions: `unknown → DomainType` (coercion + normalization + messages) | `*.schema.ts`, `validation/typebox.helper.ts` |
| `*.factory.ts` | High-level constructors that compose parsers + apply schema validation       | `*.parser.ts`, `*.schema.ts`, helpers         |
| `*.guard.ts`   | Type guards (`isX(v): v is X`)                                               | `*.schema.ts`, `validation/typebox.helper.ts` |

---

## PATH RESOLUTION

After flattening, `tsconfig.json` `compilerOptions.paths` is the single
source of truth:

```jsonc
{
  "@core":           ["./src/core/index.ts"],
  "@core/*":         ["./src/core/*"],
  "@shared/types":   ["./src/shared/types/index.ts"],
  "@shared/types/*": ["./src/shared/types/*"],
  "@shared/utils":   ["./src/shared/utils/index.ts"],
  "@shared/utils/*": ["./src/shared/utils/*"]
}
```

`.dependency-cruiser.cjs` MUST include the `tsConfig` option for path
resolution to work:

```js
options: {
  tsConfig: { fileName: 'tsconfig.json' },
  ...
}
```

---

## DEPENDENCY-CRUISER BOUNDARY RULE (NEW)

```js
// .dependency-cruiser.cjs (additional rule)
{
  name: 'core-schema-must-be-pure-typebox',
  comment: '*.schema.ts files may only import @sinclair/typebox + sibling schemas / types / constants',
  severity: 'error',
  from: { path: 'src/core/.+\\.schema\\.ts$' },
  to:   { pathNot: '(^@sinclair/typebox|\\.schema\\.ts$|/types/|/constants/)' }
}
```

Prevents schemas from accidentally re-acquiring transform logic.

---

## MIGRATION PATTERNS

### Pattern 1 — Plain object schemas

Before (`source_row_min.schema.ts`):

```ts
import { z } from 'zod'
export const sourceRowMinSchema = z.object({
  desc: z.string().refine(v => v.trim().length > 0, { message: 'desc must be non-empty' }),
  tags: tagsFromSourceSchema  // <- a transform; moves to parser
})
export type SourceRowMin = z.infer<typeof sourceRowMinSchema>
```

After:

```ts
import { type Static, Type } from '@sinclair/typebox'
import type { Simplify } from 'type-fest'
import { tagsSchema } from './tags.schema'

export const sourceRowMinSchema = Type.Object({
  desc: Type.String({ minLength: 1, pattern: '\\S' }),
  tags: tagsSchema
})
export type SourceRowMin = Simplify<Static<typeof sourceRowMinSchema>>
```

The `.refine` for "non-empty after trim" becomes `pattern: '\\S'`. Custom
error messages move to the parser layer.

### Pattern 2 — Discriminated unions

Before:

```ts
export const entrySchema = z.discriminatedUnion('type', [
  bookmarkEntrySchema, commandEntrySchema, cheatEntrySchema, taskEntrySchema
])
```

After:

```ts
export const entrySchema = Type.Union([
  bookmarkEntrySchema,
  commandEntrySchema,
  cheatEntrySchema,
  taskEntrySchema
])
```

`TypeCompiler` produces an O(1) discriminator switch automatically when the
schema is wrapped via `compile()`.

### Pattern 3 — Schema extension (`.extend`)

Before:

```ts
export const bookmarkKnowledgeSchema = bookmarkEntrySchema.extend(persistFieldsSchema.shape)
```

After:

```ts
export const bookmarkKnowledgeSchema = Type.Composite([
  bookmarkEntrySchema,
  persistFieldsSchema
])
```

`Type.Composite` produces a flat `TObject` (better for `Static<>` inference
and faster to compile than `Type.Intersect`).

### Pattern 4 — Transform-only schemas (the hard one)

Before (`tags.schema.ts`):

```ts
export const tagsFromSourceSchema = z
  .unknown()
  .transform((raw): string[] => { /* normalise */ })
  .pipe(
    z.array(z.string().regex(PATTERNS.tag, { message: '...' }))
      .min(1, 'At least one tag is required')
      .max(4, 'At most 4 tags are allowed')
  )
```

After — split into `tags.schema.ts` + `tags.parser.ts`:

```ts
// tags.schema.ts — shape only
import { Type, type Static } from '@sinclair/typebox'
import { PATTERNS } from '../../../constants/entry.const'

export const tagsSchema = Type.Array(
  Type.String({ pattern: PATTERNS.tag.source }),
  { minItems: 1, maxItems: 4, uniqueItems: true }
)
export type Tags = Static<typeof tagsSchema>
```

```ts
// tags.parser.ts — coercion + custom messages
import type { JsonValue } from 'type-fest'
import { safeParse, TypeBoxValidationError } from '../../../validation/typebox.helper'
import { tagsSchema } from '../schemas/tags.schema'

export const normalizeKnowledgeTag = (item: string): string =>
  item.trim().toLowerCase().replaceAll('-', '_')

export function parseTagsFromSource(raw: JsonValue | undefined): string[] {
  if (!Array.isArray(raw)) {
    throw new TypeBoxValidationError([{
      path: '/tags', message: 'tags must be an array', schema: {}, value: raw, type: 0
    } as never])
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const el of raw) {
    if (typeof el !== 'string') continue
    const n = normalizeKnowledgeTag(el)
    if (n.length === 0 || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  const result = safeParse(tagsSchema, out)
  if (!result.ok) {
    throw new TypeBoxValidationError(result.errors.map(e => ({
      ...e,
      message: e.message.includes('match pattern')
        ? 'Each tag must use only a-z, 0-9, and underscores'
        : e.message.includes('minItems') ? 'At least one tag is required'
        : e.message.includes('maxItems') ? 'At most 4 tags are allowed'
        : e.message
    })))
  }
  return result.data
}
```

Custom error messages live alongside the coercion logic — clearer than
embedding them deep in a Zod chain.

### Pattern 5 — `.superRefine` with custom validation

Before (`base.schema.ts` `noteBlockRow`):

```ts
const noteBlockRow = z.record(z.string(), z.string()).superRefine((obj, ctx) => {
  const keys = Object.keys(obj)
  if (keys.length === 0) ctx.addIssue({ code: 'custom', message: '...' })
  const lang = (keys[0] ?? '').split('#')[0]?.trim() ?? ''
  if (!isNoteLang(lang)) ctx.addIssue({ code: 'custom', message: `...` })
})
```

After — pure parser function in `notes.parser.ts`:

```ts
import { isNoteLang } from '../../../guards'
import type { NoteBlock } from '../schemas/base.schema'
import { TypeBoxValidationError } from '../../../validation/typebox.helper'

export function parseNoteBlock(raw: unknown): NoteBlock {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeBoxValidationError([{
      path: '/', message: 'Each note must be a non-empty object', schema: {}, value: raw, type: 0
    } as never])
  }
  const keys = Object.keys(raw as object)
  if (keys.length === 0) {
    throw new TypeBoxValidationError([{
      path: '/', message: 'Each note must be a non-empty object', schema: {}, value: raw, type: 0
    } as never])
  }
  const rawKey = keys[0] ?? ''
  const lang = rawKey.split('#')[0]?.trim() ?? rawKey
  if (!isNoteLang(lang)) {
    throw new TypeBoxValidationError([{
      path: `/${rawKey}`, message: `Unsupported note block language: ${lang}`, schema: {}, value: raw, type: 0
    } as never])
  }
  return raw as NoteBlock
}
```

### Pattern 6 — `entry.factory.ts` migration

Before:

```ts
import { ZodError } from 'zod'
function formatZodIssues(err: ZodError): string {
  return err.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
}
// ...
if (err instanceof ZodError) {
  const line = approxEntryKeyLine(content, section, key)
  const loc = line ? `${filePath}:${line}` : filePath
  throw new Error(`${loc}: entry "${key}": ${formatZodIssues(err)}`, { cause: err })
}
```

After:

```ts
import { TypeBoxValidationError, formatErrors } from '../../../validation/typebox.helper'
// ...
if (err instanceof TypeBoxValidationError) {
  const line = approxEntryKeyLine(content, section, key)
  const loc = line ? `${filePath}:${line}` : filePath
  throw new Error(`${loc}: entry "${key}": ${formatErrors(err.errors)}`, { cause: err })
}
```

Error message format is preserved exactly. Existing tests asserting
`"file:line: entry \"key\": path: message"` still pass.

### Pattern 7 — `type-fest` aggressive application

| Site                                                                                                                                        | Before                                               | After                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| `parsers/source_document.parser.ts` element values                                                                                          | `unknown`                                            | `JsonValue`                             |
| `parsers/source_document.parser.ts` `Object.entries(... as ...)`                                                                            | `Record<string, unknown>`                            | `UnknownRecord`                         |
| `parsers/source_document.parser.ts` YAML parse output                                                                                       | `Record<string, unknown> \| null`                    | `JsonObject \| null`                    |
| `schemas/entry.schema.ts:47`                                                                                                                | `export type SourceRow = Record<string, unknown>`    | `export type SourceRow = UnknownRecord` |
| `schemas/source_row_min.schema.ts:12`                                                                                                       | `raw is Record<string, unknown>`                     | `raw is UnknownRecord`                  |
| `types/note_fragments.types.ts:7`                                                                                                           | `Record<string, string> \| Record<string, string>[]` | KEEP CONCRETE — values typed as strings |
| `shared/types/env.types.ts:1`                                                                                                               | `Record<string, string>`                             | KEEP CONCRETE — values ARE strings      |
| All exported `Static<typeof X>` in `entry.schema.ts`, `task.schema.ts`, `base.schema.ts`, `source_row_min.schema.ts`, `knowledge.schema.ts` | `Static<typeof X>`                                   | `Simplify<Static<typeof X>>`            |

**Rule:** `UnknownRecord` only where value type is genuinely unknown.
`Record<string, X>` where `X` is concrete stays concrete.

### Pattern 8 — Workspace flattening

Files deleted:

- `src/core/package.json`
- `src/shared/types/package.json`
- `src/shared/utils/package.json`

`tsconfig.json` updated (already has `@shared/*` paths; add `@core`):

```jsonc
"paths": {
  "@core":           ["./src/core/index.ts"],
  "@core/*":         ["./src/core/*"],
  "@shared/types":   ["./src/shared/types/index.ts"],
  "@shared/types/*": ["./src/shared/types/*"],
  "@shared/utils":   ["./src/shared/utils/index.ts"],
  "@shared/utils/*": ["./src/shared/utils/*"]
}
```

Root `package.json` gains:

```jsonc
"dependencies": {
  "@sinclair/typebox": "^0.34.20",
  ...existing
},
"devDependencies": {
  "type-fest": "^5.6.0",
  ...existing
}
```

`zod` is removed entirely. `bun.lock` regenerates via `bun install`.

---

## RISKS & MITIGATIONS

### Risk 1 — Custom error messages on TypeBox patterns

TypeBox's `Type.String({ pattern })` produces generic errors. Tests asserting
friendly messages would break.

**Mitigation:** Custom messages live in parsers (Pattern 4). Schemas validate
shape; parsers translate generic errors to project-specific messages.

**Verification:** All existing assertions in `tags.schema.spec.ts` (post-rename
to `tags.parser.spec.ts`) still pass.

### Risk 2 — TypeBox `Type.Union` performance

Without `TypeCompiler`, `Type.Union` of objects falls back to O(n)
trial-and-error on the discriminant.

**Mitigation:** The helper's `compile()` always wraps schemas with
`TypeCompiler.Compile`, generating an O(1) discriminator switch.
`entry.factory.ts:23` calls a compiled checker, not raw `Value.Check`.

**Verification:** Benchmark in `typebox.helper.spec.ts` — 10 000 iterations
parse under 100 ms.

### Risk 3 — Dependency-cruiser tsconfig path resolution

Without `tsConfig` option in `.dependency-cruiser.cjs`, `@core/*` and
`@shared/*` imports may report false-positive "unresolvable module"
violations.

**Mitigation:** Verify `.dependency-cruiser.cjs` includes
`options.tsConfig.fileName: 'tsconfig.json'`. Add if absent.

**Verification:** `bunx depcruise src/core --config .dependency-cruiser.cjs`
exits 0 with zero unresolvable imports.

### Risk 4 — Path resolution after deleting nested `package.json`

If any tool resolved `@core` via Node package resolution rather than tsconfig
paths, deletion breaks it.

**Mitigation:** Bun's resolver checks `tsconfig.json` `paths` natively
(documented behavior).

**Verification:** `bun run typecheck && bun test src/core` exits 0
post-deletion.

### Risk 5 — Knip false positives on TypeBox-derived types

Knip may report `Static<>` / `Simplify<>` / schema constants as unused —
transport boundary not yet wired (those stashes are quarantined).

**Mitigation:** Capture baseline `bunx knip` output before. Migration must
NOT increase the unused-files count.

**Verification:** `diff /tmp/knip-before.txt /tmp/knip-after.txt` shows only
expected differences (file moves like `tags.schema.spec.ts` →
`tags.parser.spec.ts`).

### Risk 6 — `Type.Composite` vs `.extend` `strip` semantics

Zod `.strip()` (default) silently drops unknown keys. TypeBox `Type.Object`
with `additionalProperties: false` rejects them. `base.schema.ts:59` uses
`.strip()` — naive switch changes runtime behavior.

**Mitigation:** Set `additionalProperties: Type.Unknown()` (or omit
`additionalProperties` in non-strict mode) on the base entry row schema to
preserve "ignore unknown keys" semantics.

**Verification:** Add a fixture in `base_fields.parser.spec.ts` with extra
keys (`_internal: 'x'`) — must parse successfully and produce no error.

### Risk 7 — `link.schema.ts` complexity

Heaviest Zod transform machinery — three-way union (`httpUrl |
titledLinkShorthand | linkObject`) with regex-driven string-to-object
transform.

**Mitigation:** Migrate this file LAST. Write `link.parser.spec.ts` first,
capturing all current behavior. THEN migrate with tests as safety net.

**Verification:** `link.parser.spec.ts` covers: bare URL; titled shorthand;
link object with single URL; link object with URL array; invalid URL
rejection; empty object rejection; lenient array normalization.

### Risk 8 — Foundation docs becoming stale

Piecemeal doc updates can introduce contradictions.

**Mitigation:** All doc updates land inside the single amend commit. No
partial state.

**Verification:** `rg -i "\\bzod\\b" assets/docs/specs/foundation/
.agents/skills/app-context/ .agents/skills/app-rpc/` returns zero matches.

### Risk 9 — Amend safety

Amending a published commit destroys remote history.

**Mitigation:** The implementation MUST verify before amending:

1. `git log -1 --format='%h %s'` returns `33c3a63 feat(core): Add domain
   types, schemas, parsers`.
2. `git status -sb` shows no `[ahead/behind]` segment (no upstream tracking).
3. `git log origin/chore-add-domain..HEAD --oneline 2>&1` returns `fatal:
   ambiguous argument` (no remote ref exists).

If any check fails, ABORT and ask the user.

---

## VERIFICATION SEQUENCE

Run end-to-end before declaring the amend complete:

```bash
# 1. Tests
bun test src/core src/shared        # 126+ pass, 0 fail

# 2. Static analysis
bun run typecheck                   # exit 0
bunx biome check src/               # exit 0
bunx depcruise src/ --config .dependency-cruiser.cjs  # exit 0

# 3. No Zod
rg "from 'zod'" src/                # zero matches
rg "\"zod\":" package.json src/     # zero matches

# 4. No nested package.json
find src -name package.json -type f # zero results

# 5. Doc consistency
rg -i "\\bzod\\b" assets/docs/specs/foundation/ \
                  .agents/skills/app-context/ \
                  .agents/skills/app-rpc/        # zero matches

# 6. Knip baseline preserved
bunx knip > /tmp/knip-after.txt
diff /tmp/knip-before.txt /tmp/knip-after.txt   # only expected file moves

# 7. Amend integrity
git log -1 --format='%h %s'                     # new SHA, same subject
git stash list | wc -l                          # → 6 (unchanged)
```

---

## COMMIT STRATEGY

### Decision

Amend HEAD commit `33c3a63` (`feat(core): Add domain types, schemas,
parsers`). Created in the current conversation; never pushed; branch has no
upstream tracking. Amend safety is satisfied per the app git-safety protocol.

### Updated commit message (post-amend)

```text
feat(core): Add domain types, schemas, parsers

Wire up Phase 3 of foundation: src/core/ with domain models,
parsers, guards, factories, TypeBox schemas. Add src/shared/
CRC32 utility, env types. Includes 10 spec files for guards
and parsers.

Validation: TypeBox throughout — Zod is not used. Schemas hold
only TypeBox shapes; parsers own coercion logic and custom
error messages. type-fest utility types applied for unknown
shapes and inferred type ergonomics.

Workspace: flat layout — all dependencies in root package.json.
Path aliases (@core, @shared/*) resolved via tsconfig paths.

Updates foundation specs (design.md Decision 2, requirements.md,
roadmap.md) and app-context, app-rpc skills to reflect TypeBox-only
direction.
```

---

## RELATED DOCS

- [requirements.md](../../MILESTONE_01/validators/requirements.md) — acceptance criteria.
- [tasks.md](../../MILESTONE_01/validators/tasks.md) — ordered implementation work.
- [`../foundation/design.md`](../../MILESTONE_01/foundation/design.md) — Decision 2 to be
  inverted by this refactor.
- [`../foundation/roadmap.md`](../../MILESTONE_01/foundation/roadmap.md) — Phase 3 row to be
  updated.
- [`../core-domain/design.md`](../../MILESTONE_01/core-domain/design.md) — original Phase 3
  design that the amend supersedes.

---

## REFERENCES

[fcis]: https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell
[typebox]: https://github.com/sinclairzx81/typebox
[dt]: https://github.com/drizzle-team/drizzle-orm/tree/main/drizzle-typebox
