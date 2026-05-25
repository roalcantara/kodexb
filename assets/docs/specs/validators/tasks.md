<!-- markdownlint-disable-file -->
# Validators — Implementation Plan (TypeBox migration & workspace flatten)

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `subagent-driven-development` (recommended) or `executing-plans` to
> implement this plan task-by-task. Steps use checappox (`- [ ]`) syntax for
> tracking.

**Goal:** Amend the Phase 3 commit `33c3a63` (`feat(core): Add domain types,
schemas, parsers`) on branch `chore-add-domain` so the foundation domain
layer is TypeBox-native from day one. Replace Zod with TypeBox throughout
`src/core/`, flatten the workspace by deleting nested `package.json` files,
and apply `type-fest` aggressively. Foundation docs and app skills update
inside the same amend commit.

**Architecture:** No I/O changes. `*.schema.ts` files become thin TypeBox
shapes. `*.parser.ts` files own coercion logic and custom error messages.
A new `src/core/validation/typebox.helper.ts` module provides
`compile`, `parse`, `safeParse`, `formatErrors`, `TypeBoxValidationError`,
`makeGuard`. `entry.factory.ts` swaps `ZodError` for `TypeBoxValidationError`
in its catch block. Path aliases resolve via `tsconfig.json` `paths` only.

**Tech Stack:** Bun 1.x runtime + `bun:test`. `@sinclair/typebox` v0.34.20
(already installed). `type-fest` v5.6.0 (already installed). `js-yaml`
unchanged. Zod removed.

**Spec source of truth:** [`design.md`](design.md). Section references like
"design §Pattern 4" point to that file.

---

## Pre-flight state

- **Branch:** `chore-add-domain`
- **HEAD before this plan:** `33c3a63` (`feat(core): Add domain types,
  schemas, parsers`) — created in current session, never pushed.
- **HEAD after Task 16:** SAME subject, NEW SHA — amended commit with
  expanded body per [design.md §COMMIT STRATEGY](design.md#commit-strategy).
- **Working tree:** clean.
- **Stash list before Task 1:** 6 entries (5 phase stashes + 1 pre-existing
  WIP). MUST remain unchanged through Task 17.

---

## Commit map

This plan produces ONE amended commit. Every other task is a non-commit
operation (edit, write helper, delete, verify, doc update, gate).

| Task | Subject (post-amend)                             | Scope                                                                      |
| ---- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| 16   | `feat(core): Add domain types, schemas, parsers` | All Phase 3 paths + new validation helper + flat workspace + 5 doc updates |

---

## Verification commands cheat-sheet

| Goal                       | Command                                                |
| -------------------------- | ------------------------------------------------------ |
| TypeScript shape           | `bun run typecheck`                                    |
| Phase 3 + validators tests | `bun test src/core src/shared`                         |
| Biome on src               | `bunx biome check src/`                                |
| Knip on full repo          | `bunx knip`                                            |
| Dependency-cruiser         | `bunx depcruise src/ --config .dependency-cruiser.cjs` |
| jscpd                      | `bunx jscpd src/ --min-lines 10 --threshold 5`         |
| Working tree               | `git status --short`                                   |
| Stash list                 | `git stash list`                                       |
| Pre-amend HEAD check       | `git log -1 --format='%h %s'`                          |
| No upstream                | `git status -sb`                                       |

---

## Task 1: Pre-flight safety verification

**Why:** Amend safety must be confirmed BEFORE any code changes. If any check
fails, abort and ask the user.

- [ ] **Step 1: Verify HEAD subject and SHA prefix**

```bash
git log -1 --format='%h %s'
```

Expected: `33c3a63 feat(core): Add domain types, schemas, parsers`. If
different, STOP.

- [ ] **Step 2: Verify branch has no upstream tracking**

```bash
git status -sb
```

Expected: `## chore-add-domain` (no `[ahead 1]` / `[behind 0]` / `origin/...`
suffix). If upstream exists, STOP.

- [ ] **Step 3: Verify the commit was authored by the current user**

```bash
git log -1 --format='%an %ae'
```

Expected: matches `git config user.name` and `git config user.email`. If
different, STOP — the commit may not be safe to amend.

- [ ] **Step 4: Capture knip baseline**

```bash
bunx knip > /tmp/knip-before.txt 2>&1 || true
wc -l /tmp/knip-before.txt
```

Expected: file written. Used in Task 15 for diff verification.

---

## Task 2: Create validation helper module

**Files:**

- Create: `src/core/validation/typebox.helper.ts`
- Create: `src/core/validation/typebox.helper.spec.ts`
- Create: `src/core/validation/index.ts`

**Why:** Every schema and parser depends on the helper. Build it first so
the rest of the migration has a foundation.

- [ ] **Step 1: Implement `typebox.helper.ts`** per design §Validation Helper
  Module. Public exports: `compile`, `parse`, `safeParse`, `formatErrors`,
  `TypeBoxValidationError` (class), `makeGuard`. Internal: `WeakMap<TSchema,
  TypeCheck>` cache for compiled checkers.

- [ ] **Step 2: Implement `typebox.helper.spec.ts`** with at least:
  - `compile` returns the same instance on repeated calls (cache hit).
  - `parse` happy path returns `Static<T>`.
  - `parse` invalid input throws `TypeBoxValidationError` whose `.errors`
    array is non-empty.
  - `safeParse` returns `{ ok: true, data }` for valid input.
  - `safeParse` returns `{ ok: false, errors }` for invalid input.
  - `formatErrors` produces `"path: message; path: message"` joined by
    `'; '`.
  - `makeGuard` returns `(v: unknown) => v is Static<T>` that narrows
    correctly.
  - Benchmark: 10 000 `parse` iterations on a 4-variant `Type.Union`
    complete in under 100 ms.

- [ ] **Step 3: Re-export from `index.ts`**

```ts
export {
  compile,
  parse,
  safeParse,
  formatErrors,
  TypeBoxValidationError,
  makeGuard
} from './typebox.helper'
```

- [ ] **Step 4: Verify in isolation**

```bash
bun test src/core/validation
```

Expected: all helper specs pass.

---

## Task 3: Migrate leaf schemas (`tags`, `meta`, `link`, `notes`)

**Files (per file: REWRITE schema, NEW parser, UPDATE spec):**

- `src/core/domain/models/entries/schemas/tags.schema.ts`
- `src/core/domain/models/entries/parsers/tags.parser.ts` (NEW)
- `src/core/domain/models/entries/parsers/tags.parser.spec.ts` (RENAMED from
  `schemas/tags.schema.spec.ts`)
- `src/core/domain/models/entries/schemas/meta.schema.ts` (DELETE)
- `src/core/domain/models/entries/parsers/meta.parser.ts` (NEW)
- `src/core/domain/models/entries/parsers/meta.parser.spec.ts` (NEW)
- `src/core/domain/models/entries/schemas/notes.schema.ts` (DELETE)
- `src/core/domain/models/entries/parsers/notes.parser.ts` (NEW — note:
  there's already a `knowledges/detail/notes.parser.ts`; this is a separate
  file under `entries/parsers/`)
- `src/core/domain/models/entries/parsers/notes.parser.spec.ts` (NEW)
- `src/core/domain/models/entries/schemas/link.schema.ts`
- `src/core/domain/models/entries/parsers/link.parser.ts` (NEW)
- `src/core/domain/models/entries/parsers/link.parser.spec.ts` (NEW —
  written FIRST per design §Risk 7)

**Why:** Leaf schemas have no internal cross-deps. Migrating them first
unblocks composite schemas in Task 4.

- [ ] **Step 1: Migrate `tags`** per design §Pattern 4. Move existing
  assertions from `tags.schema.spec.ts` into `tags.parser.spec.ts`. Delete
  the old spec file.

- [ ] **Step 2: Migrate `meta`** per design §Pattern 4 (smaller variant —
  `meta.parser.ts` is one function: `parseMetaFromSource(raw: JsonValue):
  Record<string, string> | undefined`).

- [ ] **Step 3: Migrate `notes`** per design §Pattern 5. The
  `noteBlocksFromSourceSchema` becomes `parseNoteBlocksFromSource(raw:
  JsonValue): NoteBlock[]`. Move single-block validation into
  `parseNoteBlock`.

- [ ] **Step 4: Migrate `link` LAST** per design §Risk 7. WRITE
  `link.parser.spec.ts` FIRST capturing every existing behavior, THEN do the
  schema/parser split. The schema is `Type.Union([httpUrlSchema,
  linkObjectSchema])`; the titled-shorthand string parsing moves entirely to
  the parser.

- [ ] **Step 5: Verify**

```bash
bun test src/core/domain/models/entries
bun run typecheck
```

Expected: all tests pass; typecheck exits 0.

---

## Task 4: Migrate composite schemas (`base`, `entry`, `knowledge`)

**Files:**

- `src/core/domain/models/entries/schemas/base.schema.ts` (REWRITE)
- `src/core/domain/models/entries/schemas/entry.schema.ts` (REWRITE)
- `src/core/domain/models/entries/schemas/source_row_min.schema.ts`
  (REWRITE)
- `src/core/domain/models/knowledges/schemas/knowledge.schema.ts` (REWRITE)

**Why:** Composite schemas depend on leaf schemas from Task 3. They use
`Type.Composite` for `.extend` (design §Pattern 3) and `Type.Union` for
discriminated unions (design §Pattern 2).

- [ ] **Step 1: Rewrite `base.schema.ts`** per design §Pattern 1.
  CRITICAL: preserve `.strip()` semantics by NOT setting
  `additionalProperties: false`. Either omit `additionalProperties` or
  set it to `Type.Unknown()` (design §Risk 6).

- [ ] **Step 2: Rewrite `entry.schema.ts`** per design §Pattern 2. Use
  `Type.Union` of the four object schemas with literal `type` discriminants.
  `BaseEntry` becomes `Simplify<Static<typeof
  sourceBaseEntryRowObjectSchema>> & { type: EntryType }`.

- [ ] **Step 3: Rewrite `source_row_min.schema.ts`** per design §Pattern 1.
  `isValidSourceRowMin` uses the helper's `makeGuard` factory.

- [ ] **Step 4: Rewrite `knowledge.schema.ts`** per design §Pattern 3. Use
  `Type.Composite([entrySchema, persistFieldsSchema])` for each variant.

- [ ] **Step 5: Add the new dependency-cruiser rule** per design §Decision 2:

Edit `.dependency-cruiser.cjs` and add the
`core-schema-must-be-pure-typebox` rule.

- [ ] **Step 6: Verify**

```bash
bun test src/core
bun run typecheck
bunx depcruise src/core --config .dependency-cruiser.cjs
```

Expected: all green. The new dep-cruiser rule MUST NOT trigger for any
existing schema (they should already comply after Task 3 + Task 4).

---

## Task 5: Migrate factories and parser (`entry.factory.ts`,
`base_fields.parser.ts`, `source_document.parser.ts`)

**Files:**

- `src/core/domain/models/entries/factories/entry.factory.ts` (REWRITE)
- `src/core/domain/models/entries/parsers/base_fields.parser.ts` (REWRITE)
- `src/core/domain/models/entries/parsers/source_document.parser.ts`
  (UPDATE — apply `JsonValue` / `JsonObject` / `UnknownRecord`)
- `src/core/domain/models/knowledges/factories/knowledge.factory.ts`
  (REWRITE)

**Why:** Factories compose schemas + parsers and apply final validation.
They're the last layer to migrate before the workspace flatten.

- [ ] **Step 1: Rewrite `entry.factory.ts`** per design §Pattern 6.
  - Replace `import { ZodError } from 'zod'` with
    `import { TypeBoxValidationError, formatErrors } from '@core/validation'`.
  - Replace `entrySchema.parse(...)` with `parse(entrySchema, ...)`.
  - Replace `if (err instanceof ZodError)` with
    `if (err instanceof TypeBoxValidationError)`.
  - Replace `formatZodIssues(err)` with `formatErrors(err.errors)`.
  - Delete the local `formatZodIssues` function.

- [ ] **Step 2: Rewrite `base_fields.parser.ts`** to call new parsers
  (`parseTagsFromSource`, `parseMetaFromSource`, `parseNoteBlocksFromSource`,
  `parseLinksFromSource`) and wrap the result with the helper's `parse()`.

- [ ] **Step 3: Update `source_document.parser.ts`** per design §Pattern 7:
  - Yaml parse output type: `JsonObject | null` (was `Record<string,
    unknown> | null`).
  - Element entries: `UnknownRecord` (was `Record<string, unknown>`).
  - Element values: `JsonValue` (was `unknown`).

- [ ] **Step 4: Rewrite `knowledge.factory.ts`** to use the helper's
  `parse(knowledgeSchema, ...)`.

- [ ] **Step 5: Verify**

```bash
bun test src/core
bun run typecheck
```

Expected: all 126+ tests pass; typecheck exits 0. NO test code changes
should have been needed in `entry.factory.spec.ts` because the error message
format is preserved exactly.

---

## Task 6: Apply `type-fest` aggressively elsewhere

**Files:**

- All 5 `*.schema.ts` files exporting `Static<typeof X>` types (per design
  §Pattern 7 table) — wrap with `Simplify<>`.
- `src/core/domain/models/entries/schemas/entry.schema.ts:47` — `SourceRow =
  UnknownRecord`.
- `src/core/domain/models/entries/schemas/source_row_min.schema.ts:12` —
  `raw is UnknownRecord`.

**Why:** `type-fest` was already installed. Now apply it consistently per
[REQUIREMENT V-4](requirements.md#requirement-v-4-aggressive-type-fest-application).

- [ ] **Step 1: Wrap exported `Static<typeof X>` types**

For each of:
- `entry.schema.ts` — `Entry`, `BookmarkEntry`, `CommandEntry`, `CheatEntry`,
  `TaskEntry`, `BaseEntry`.
- `task.schema.ts` — `Priority`, `TaskStatus`.
- `base.schema.ts` — `NoteBlock`, `ParsedSourceBaseFields`,
  `LinkItem` (re-export), `SourceBaseParseContext`.
- `source_row_min.schema.ts` — `SourceRowMin`.
- `knowledge.schema.ts` — `PersistFields`, `BookmarkKnowledge`,
  `CommandKnowledge`, `CheatKnowledge`, `TaskKnowledge`, `Knowledge`.

Wrap with `Simplify<>` from `type-fest`.

- [ ] **Step 2: Apply `UnknownRecord` to genuinely-unknown shapes**

- `entry.schema.ts:47` — `export type SourceRow = UnknownRecord`.
- `source_row_min.schema.ts:12` — guard return type `raw is UnknownRecord`.

- [ ] **Step 3: Verify the discipline rule from design §Decision 5**

```bash
rg "Record<string, unknown>" src/  # zero matches expected
rg "Record<string, string>"  src/  # MAY match — concrete value type stays
```

- [ ] **Step 4: Verify**

```bash
bun test src/core
bun run typecheck
```

Expected: all green.

---

## Task 7: Update `tsconfig.json` paths

**File:**

- `tsconfig.json` (UPDATE)

**Why:** Add `@core` and `@core/*` aliases to `compilerOptions.paths`
(currently only `@shared/*` is declared). After Task 8 deletes the nested
`package.json` files, tsconfig paths become the single source of truth.

- [ ] **Step 1: Edit `tsconfig.json`** per design §PATH RESOLUTION:

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

- [ ] **Step 2: Verify dependency-cruiser config has tsConfig option**

Read `.dependency-cruiser.cjs`. Confirm `options.tsConfig.fileName:
'tsconfig.json'` exists. Add it if absent (design §Risk 3).

- [ ] **Step 3: Verify**

```bash
bun run typecheck
bunx depcruise src/ --config .dependency-cruiser.cjs
```

Expected: both exit 0.

---

## Task 8: Flatten workspace — delete nested `package.json` files

**Files:**

- DELETE: `src/core/package.json`
- DELETE: `src/shared/types/package.json`
- DELETE: `src/shared/utils/package.json`
- UPDATE: `package.json` (root) — add `@sinclair/typebox` to `dependencies`
  and `type-fest` to `devDependencies`.

**Why:** The flat workspace requirement (REQ V-3). Path resolution moves
entirely to `tsconfig.json`.

- [ ] **Step 1: Add deps to root `package.json`**

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

- [ ] **Step 2: Delete the three nested files**

```bash
rm src/core/package.json src/shared/types/package.json src/shared/utils/package.json
```

- [ ] **Step 3: Remove zod entirely**

```bash
# Confirm no remaining zod imports
rg "from 'zod'" src/  # zero matches expected
```

If `zod` is in root `package.json`, remove it.

- [ ] **Step 4: Regenerate `bun.lock`**

```bash
bun install
```

Expected: `bun.lock` updated; no `zod` entry remains.

- [ ] **Step 5: Verify resolution still works**

```bash
bun run typecheck
bun test src/core src/shared
find src -name package.json -type f  # zero results expected
```

Expected: typecheck exits 0; tests pass; no nested `package.json`.

---

## Task 9: Update foundation specs

**Files:**

- `assets/docs/specs/foundation/design.md` (UPDATE Decision 2 + line 165
  data-flow diagram)
- `assets/docs/specs/foundation/requirements.md` (UPDATE line 170)
- `assets/docs/specs/foundation/roadmap.md` (UPDATE line 233)

**Why:** [REQUIREMENT
V-5](requirements.md#requirement-v-5-foundation-docs-reflect-the-inverted-decision).
The foundation docs are the project's steering documents and must reflect
the inverted Zod/TypeBox decision before the amend lands.

- [ ] **Step 1: Update `foundation/design.md` Decision 2** per design §
  doc-update diff. Title becomes "TypeBox throughout (Zod removed)".
  Decision text becomes "TypeBox is the sole validation library". Rationale
  emphasises single-library benefits and the schema/parser split.

- [ ] **Step 2: Update `foundation/design.md` line 165** (data-flow
  diagram):

  Replace `→ Zod validate (Knowledge schema)` with
  `→ TypeBox validate (Knowledge schema)`.

- [ ] **Step 3: Update `foundation/requirements.md` line 170**:

  Replace `WHEN a file fails YAML parsing or Zod validation` with
  `WHEN a file fails YAML parsing or TypeBox validation`.

- [ ] **Step 4: Update `foundation/roadmap.md` line 233**:

  Replace `TypeBox replaces Zod at the transport boundary. Preview server
  updated to use the same Elysia app over HTTP.` with `TypeBox is the sole
  validation library across core and transport — Zod was removed in a
  prior refactor. Preview server uses the same Elysia app over HTTP.`

- [ ] **Step 5: Verify**

```bash
rg -i "\\bzod\\b" assets/docs/specs/foundation/  # zero matches expected
```

---

## Task 10: Update app skills

**Files:**

- `.agents/skills/app-context/SKILL.md` (UPDATE validation rule)
- `.agents/skills/app-rpc/SKILL.md` (UPDATE dependency table + rule)

**Why:** [REQUIREMENT
V-5](requirements.md#requirement-v-5-foundation-docs-reflect-the-inverted-decision)
mandates skill alignment. Skills drive future agent behaviour; stale skills
cause regressions.

- [ ] **Step 1: Update `app-context/SKILL.md`**

Find the line:

> Zod lives in `src/core/` and `src/shell/app/db/import.service.ts`.
> TypeBox lives at the transport layer exclusively.

Replace with:

> TypeBox is the sole validation library across `src/core/` and the
> transport layer. `*.schema.ts` files contain only TypeBox shapes;
> `*.parser.ts` files contain coercion logic. Zod is not used.

- [ ] **Step 2: Update `app-rpc/SKILL.md`**

Update the dependency table row:

```diff
-| Domain      | `zod`                          | YAML parsing, core invariants only  |
+| Domain      | `@sinclair/typebox`            | YAML parsing, core invariants       |
```

And the rule below:

```diff
-**Rule:** Zod lives in `src/core/` and `src/shell/app/db/import.service.ts`.
-TypeBox (via Elysia `t`) lives at the transport layer exclusively.
+**Rule:** TypeBox is the sole validation library. `*.schema.ts` files contain
+shapes; `*.parser.ts` files contain coercion logic and custom error messages.
```

- [ ] **Step 3: Verify**

```bash
rg -i "\\bzod\\b" .agents/skills/app-context/ .agents/skills/app-rpc/  # zero matches expected
```

---

## Task 11: Pre-amend Definition of Done gate

**Why:** Run the full quality gate before touching git history. Catch any
regression before the SHA changes.

- [ ] **Step 1: Tests**

```bash
bun test src/core src/shared
```

Expected: 126+ pass, 0 fail. Coverage on `src/core/validation/` ≥ 80 %.

- [ ] **Step 2: Static analysis**

```bash
bun run typecheck
bunx biome check src/
bunx depcruise src/ --config .dependency-cruiser.cjs
```

Expected: all exit 0. The new
`core-schema-must-be-pure-typebox` rule must report no violations.

- [ ] **Step 3: No Zod**

```bash
rg "from 'zod'" src/                  # zero
rg "\"zod\":" package.json src/       # zero
bun pm ls 2>&1 | rg zod || echo "OK"  # OK
```

- [ ] **Step 4: No nested `package.json`**

```bash
find src -name package.json -type f   # zero
```

- [ ] **Step 5: Doc consistency**

```bash
rg -i "\\bzod\\b" assets/docs/specs/foundation/ \
                  .agents/skills/app-context/ \
                  .agents/skills/app-rpc/   # zero matches
```

- [ ] **Step 6: Knip baseline preserved**

```bash
bunx knip > /tmp/knip-after.txt 2>&1 || true
diff /tmp/knip-before.txt /tmp/knip-after.txt
```

Expected: only differences are file moves (e.g. `tags.schema.spec.ts` →
`tags.parser.spec.ts`). NO new unused exports.

- [ ] **Step 7: jscpd**

```bash
bunx jscpd src/ --min-lines 10 --threshold 5
```

Expected: under 5 % duplication.

If ANY check fails, fix and re-run from Step 1. Do NOT proceed to Task 12
until all checks pass.

---

## Task 12: Re-verify amend safety

**Why:** Time may have passed since Task 1. Re-confirm that nothing has been
pushed.

- [ ] **Step 1: HEAD subject + SHA prefix**

```bash
git log -1 --format='%h %s'
```

Expected: `33c3a63 feat(core): Add domain types, schemas, parsers`. If the
SHA changed, STOP and investigate.

- [ ] **Step 2: No upstream**

```bash
git status -sb
git log origin/chore-add-domain..HEAD --oneline 2>&1 || true
```

Expected: no `[ahead/behind]` segment; the second command prints `fatal:
ambiguous argument` (no remote ref exists). If a remote ref appears, STOP.

If any check fails, ABORT and ask the user.

---

## Task 13: Stage all changes for amend

**Why:** Stage everything Tasks 2–10 produced. The amend will absorb these
into `33c3a63`.

- [ ] **Step 1: Stage validators paths explicitly**

```bash
git add \
  src/core/ \
  src/shared/ \
  tsconfig.json \
  package.json \
  bun.lock \
  .dependency-cruiser.cjs \
  assets/docs/specs/foundation/design.md \
  assets/docs/specs/foundation/requirements.md \
  assets/docs/specs/foundation/roadmap.md \
  .agents/skills/app-context/SKILL.md \
  .agents/skills/app-rpc/SKILL.md
```

NEVER `git add -A` or `git add .`. The `validators/` design files
(`assets/docs/specs/validators/{requirements,design,tasks}.md`) get a
SEPARATE commit AFTER the amend (see Task 16).

- [ ] **Step 2: Stage deletions**

```bash
git add -u src/core/package.json \
            src/shared/types/package.json \
            src/shared/utils/package.json \
            src/core/domain/models/entries/schemas/meta.schema.ts \
            src/core/domain/models/entries/schemas/notes.schema.ts \
            src/core/domain/models/entries/schemas/tags.schema.spec.ts
```

- [ ] **Step 3: Verify staged set**

```bash
git status --short
```

Expected: every staged file matches Task 2–10 outputs. Spot-check that
NO `validators/` files are staged.

---

## Task 14: Amend HEAD with new message

**Why:** Replace `33c3a63` with the same subject + expanded body. This is
the single commit-altering operation in the plan.

- [ ] **Step 1: Amend with new message**

```bash
git commit --amend -m 'feat(core): Add domain types, schemas, parsers' -m '
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
direction.'
```

If commit-msg hook (`gitlint`) rejects, fix the message body to wrap at
72 characters and retry.

- [ ] **Step 2: Verify amend**

```bash
git log -1 --format='%h %s'
git log -1 --format='%B'
git log --oneline -3
```

Expected:
- Subject unchanged: `feat(core): Add domain types, schemas, parsers`.
- New SHA (different from `33c3a63`).
- Body matches the message above.

---

## Task 15: Commit `validators/` design docs

**Why:** This plan and its sibling spec files are themselves reference
material that should land on the branch. They're a separate commit from the
amend so the historical record stays clean.

- [ ] **Step 1: Stage `validators/` spec dir**

```bash
git add assets/docs/specs/validators/
```

- [ ] **Step 2: Commit**

```bash
git commit -m 'docs(specs): Add validators migration spec' -m '
Captures the brainstorming output for the TypeBox migration:
requirements (EARS), design (architecture, patterns, risks),
and ordered tasks. Sibling to docs/specs/foundation and
docs/specs/core-domain.'
```

- [ ] **Step 3: Verify**

```bash
git log --oneline -3
```

Expected: HEAD is `docs(specs): Add validators migration spec`; HEAD~1 is
the amended `feat(core)` commit.

---

## Task 16: Post-amend verification

**Why:** Confirm the working tree, stash list, and branch state are exactly
as expected after the two commits.

- [ ] **Step 1: Working tree clean**

```bash
git status --short
```

Expected: empty output.

- [ ] **Step 2: Stash list unchanged**

```bash
git stash list | wc -l
```

Expected: `6` (5 phase stashes + 1 pre-existing WIP).

- [ ] **Step 3: Final test sweep**

```bash
bun test src/core src/shared
bun run typecheck
bunx biome check src/
bunx depcruise src/ --config .dependency-cruiser.cjs
bunx knip
```

Expected: every command exits 0 (knip diff'd against baseline shows no NEW
unused).

- [ ] **Step 4: Final no-Zod sweep**

```bash
rg "\\bzod\\b" src/ assets/docs/specs/foundation/ .agents/skills/app-context/ .agents/skills/app-rpc/
```

Expected: zero matches anywhere.

- [ ] **Step 5: Confirm commit log**

```bash
git log --oneline -5
```

Expected order (newest first):

1. `docs(specs): Add validators migration spec`
2. `feat(core): Add domain types, schemas, parsers` (amended; new SHA)
3. `chore(release): v0.2.0 [skip ci]`
4. `feat(setup): Project foundation and CI`
5. `Initial commit`

---

## Self-review

Before declaring complete, the implementing agent MUST verify all
acceptance criteria from
[requirements.md](requirements.md#acceptance-criteria) are satisfied. Any
unchecked criterion blocks completion.

Reference: [`app-quality-gate`](../../../../.agents/skills/app-quality-gate/SKILL.md).
