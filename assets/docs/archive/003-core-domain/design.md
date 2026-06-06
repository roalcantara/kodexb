<!-- markdownlint-disable-file -->
# Phase 3 — Core Domain Design

Aligned with [foundation/roadmap.md](../foundation/roadmap.md) Phase 3 and
[foundation/design.md](../foundation/design.md) sections **SCHEMA LAYERS**,
**STABLE IDENTITY**, and **REPOSITORY STRUCTURE**.

This document is the **normative technical contract** for Phase 3: the pure
domain layer under `src/core/` plus the pure-only slice of `src/shared/`.
No I/O. No shell or renderer dependencies. Single commit on
`chore-add-domain`.

---

## STATUS

- **Phase:** 3 — Core Domain
- **Branch:** `chore-add-domain`
- **Base commit:** `a3da056` (HEAD before this phase)
- **Target commit count:** 1
- **Estimated diff size:** ~70 files (53 src/core + 7 src/shared + 10 new specs)

---

## SCOPE

### In scope (single commit)

The full `src/core/` tree (53 files) and the pure-only slice of
`src/shared/`:

| Area                                                         | Files | Purpose                                                                                                                      |
| ------------------------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/core/constants/`                                        | 4     | App identifier, default values, language metadata                                                                            |
| `src/core/domain/types/`                                     | 3     | `Entry`, `NoteBlock`, `LinkItem`, supporting unions                                                                          |
| `src/core/domain/constants/`                                 | 2     | Entry keys, section types, regex patterns                                                                                    |
| `src/core/domain/guards/`                                    | 4     | Pure type guards: entry, lang, entry_section                                                                                 |
| `src/core/domain/models/entries/schemas/`                    | 10    | Zod schemas: base, meta, tags (+spec), notes, link, entry, task, source_row_min                                              |
| `src/core/domain/models/entries/parsers/`                    | 3     | `parseBaseEntryFields`, `parseSourceFile`/`parseSourceSection` (+spec)                                                       |
| `src/core/domain/models/entries/factories/`                  | 1     | `toEntryWithSourceHint`                                                                                                      |
| `src/core/domain/models/entries/index.ts`                    | 1     | Barrel                                                                                                                       |
| `src/core/domain/models/knowledges/schemas/`                 | 2     | `KnowledgeSchema`, barrel                                                                                                    |
| `src/core/domain/models/knowledges/factories/`               | 1     | `deriveId` (crc32-based), `toKnowledge`                                                                                      |
| `src/core/domain/models/knowledges/detail/`                  | 11    | `assembleDoc` (+spec) + per-type doc parsers (bookmark, cheat, command, task) + shared (notes +spec, youtube +spec) + barrel |
| `src/core/domain/models/knowledges/index.ts`                 | 1     | Barrel                                                                                                                       |
| `src/core/domain/models/sources/parsers/`                    | 2     | `parseSourceLocation` (+spec)                                                                                                |
| `src/core/domain/models/sources/index.ts`                    | 1     | Barrel                                                                                                                       |
| `src/core/domain/models/index.ts`                            | 1     | Barrel                                                                                                                       |
| `src/core/domain/index.ts`                                   | 1     | Barrel                                                                                                                       |
| `src/core/helpers/`                                          | 3     | `expandPath` (~ and `$VAR` substitution, pure)                                                                               |
| `src/core/index.ts`, `src/core/package.json`                 | 2     | Top-level barrel + workspace package                                                                                         |
| `src/shared/utils/crc32.{ts,spec.ts}`                        | 2     | Id derivation primitive                                                                                                      |
| `src/shared/utils/index.ts`, `src/shared/utils/package.json` | 2     | Barrel + workspace package                                                                                                   |
| `src/shared/types/env.types.ts`                              | 1     | `Env = Record<string, string>`                                                                                               |
| `src/shared/types/index.ts` *(modified)*                     | 1     | Re-exports only `env.types` (logger re-export removed; returns in Phase 5)                                                   |
| `src/shared/types/package.json`                              | 1     | Workspace package                                                                                                            |
| **New specs (per-public-export rule)**                       | 10    | parsers + factories + guards (see [TESTING](#testing))                                                                       |

**Total:** ~70 files.

### Out of scope

| Area                                                                                                                                                                                                                             | Phase                    | Stash                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------- |
| `src/shell/app/db/*`, `src/__tests__/factories/*`, `src/__tests__/fixtures/*`, `src/shared/logging/*`, `drizzle/` if present                                                                                                     | 4 — Data Layer           | `phase-4-data-layer`      |
| `src/shell/main/main.ts` *(modified)*, `src/shell/main/rpc/*`, `src/shared/rpc/*`, `src/shared/types/logger.types.ts`, `src/shell/renderer/app.tsx` *(modified)*, `tools/preview/*`                                              | 5 — Elysia RPC           | `phase-5-rpc`             |
| `src/shell/renderer/{components/list,components/shared,utils,constants,styles}/*`, `src/shell/renderer/{index.html,app.tsx}` (initial scaffold), `assets/icons/*`, `assets/images/*`, `happydom.ts`, `package.json` *(modified)* | 6 — Renderer List View   | `phase-6-renderer-list`   |
| `src/shell/renderer/components/detail/*`                                                                                                                                                                                         | 7 — Renderer Detail View | `phase-7-renderer-detail` |
| `docs/superpowers/plans/*`                                                                                                                                                                                                       | n/a (planning)           | `phase-misc-docs`         |

---

## DESIGN DECISIONS

### Decision 1 — Single commit, no "port" wording

The user requested one atomic commit titled `feat(core): Add domain types, schemas, parsers` (47 chars, under gitlint's 50-char cap). The body lists each layer plus the shared-utils slice and the testing approach. "Port from KodexB" is dropped from the subject because the commit stands on its own; the lineage is documented in [foundation/roadmap.md](../foundation/roadmap.md) Phase 3.

### Decision 2 — Per-public-export tests, schemas tested transitively

Every exported function (parsers, factories, guards) gets at least one direct spec. Zod schemas are exercised through the parsers and factories that consume them; standalone schema specs are not required. This produces 10 new spec files (combined with 7 existing specs), keeping authoring effort bounded while satisfying the roadmap's "Full unit test coverage" goal.

### Decision 3 — Five phase-named stashes for the deferred work

`git stash` is used to quarantine the ~1,000 staged files outside Phase 3 scope. One stash per phase (4, 5, 6, 7, plus a `phase-misc-docs` catch-all), each named with the target phase, so that stash recovery aligns with phase start. A manifest at `tmp/phase-3-stash-manifest.md` (gitignored) records every file's target stash before any stash operation runs.

### Decision 4 — Modify `src/shared/types/index.ts` to drop logger re-export

The current `src/shared/types/index.ts` re-exports both `env.types` and `logger.types`. Phase 3 needs only `env.types` (used by `path.helper.ts`). Committing the file as-is would force `logger.types.ts` into Phase 3 even though no Phase 3 code imports it. The barrel is edited to re-export only `env.types`; the `logger.types` re-export returns in Phase 5 alongside the logging stack.

### Decision 5 — Pure-domain isolation enforced

No file under `src/core/` may import from `src/shell/*`. No file under either `src/core/` or `src/shared/utils|types` may import from `node:fs`, `bun:sqlite`, `electrobun`, or perform any I/O syscall. This is verified by `bun run typecheck` plus the existing `.dependency-cruiser.cjs` rules, and re-verified after the commit lands.

---

## ARCHITECTURE

### Layer dependency graph

```text
src/core/constants/
        ↑
src/core/domain/types/
        ↑
src/core/domain/constants/
        ↑
src/core/domain/guards/  ←  src/shared/types/env.types
        ↑
src/core/domain/models/entries/schemas/
        ↑
src/core/domain/models/sources/parsers/
        ↑
src/core/domain/models/entries/parsers/base_fields.parser
        ↑
src/core/domain/models/entries/factories/entry.factory
        ↑
src/core/domain/models/entries/parsers/source_document.parser
        ↑
src/core/domain/models/knowledges/schemas/
        ↑
src/core/domain/models/knowledges/factories/knowledge.factory  ←  src/shared/utils/crc32
        ↑
src/core/domain/models/knowledges/detail/{notes,youtube,doc.*}.parser
        ↑
src/core/domain/models/knowledges/detail/doc.assembler
        ↑
src/core/helpers/path.helper
```

Read top-down: each layer depends on layers above it. The graph is acyclic at compile time; the only "cycle" is the `domain/types/index.ts` re-export pattern, which TypeScript's index-barrel handling tolerates because schemas don't immediately invoke type definitions at module load.

### File-level inventory

See [SCOPE / In scope](#in-scope-single-commit) above.

---

## TESTING

### Existing specs (preserved as-is, 7 files)

| Spec                                                           | Covers                                           |
| -------------------------------------------------------------- | ------------------------------------------------ |
| `domain/models/entries/schemas/tags.schema.spec.ts`            | Tag normalization & dedupe                       |
| `domain/models/entries/parsers/source_document.parser.spec.ts` | YAML → entries (table-driven across all 4 types) |
| `domain/models/knowledges/detail/doc.assembler.spec.ts`        | End-to-end doc assembly per entry type           |
| `domain/models/knowledges/detail/youtube.parser.spec.ts`       | YouTube URL detection + thumbnail extraction     |
| `domain/models/knowledges/detail/notes.parser.spec.ts`         | Note fragment shape extraction                   |
| `domain/models/sources/parsers/source_location.parser.spec.ts` | Path → SourceLocation parsing                    |
| `helpers/path.helper.spec.ts`                                  | `expandPath` substitution                        |
| `src/shared/utils/crc32.spec.ts`                               | crc32 idempotence + known-vector                 |

### New specs (10 files, per-public-export rule)

| Spec                                                           | Public exports covered                   | Approx LOC |
| -------------------------------------------------------------- | ---------------------------------------- | ---------- |
| `domain/models/entries/parsers/base_fields.parser.spec.ts`     | `parseSourceBaseEntryFields`             | ~80        |
| `domain/models/entries/factories/entry.factory.spec.ts`        | `toEntryWithSourceHint`                  | ~60        |
| `domain/models/knowledges/factories/knowledge.factory.spec.ts` | `deriveId`, `toKnowledge`                | ~80        |
| `domain/models/knowledges/detail/doc.bookmark.parser.spec.ts`  | bookmark doc parsing                     | ~70        |
| `domain/models/knowledges/detail/doc.cheat.parser.spec.ts`     | cheat doc parsing                        | ~70        |
| `domain/models/knowledges/detail/doc.command.parser.spec.ts`   | command doc parsing                      | ~70        |
| `domain/models/knowledges/detail/doc.task.parser.spec.ts`      | task doc parsing (status, priority, due) | ~80        |
| `domain/guards/entry.guard.spec.ts`                            | `isEntry`, `isEntryType`                 | ~40        |
| `domain/guards/lang.guard.spec.ts`                             | `isNoteLang`, `isMarkdownLang`           | ~30        |
| `domain/guards/entry_section.guard.spec.ts`                    | `isSectionEntryType`                     | ~30        |

**Total new test code:** ~600 LOC across 10 files.

### Test style requirements

- Each spec uses `bun:test` with `describe` + `describe.each` table-driven cases (matching the existing pattern).
- No mocks. No fakes. Pure data-in / assertion-out only.
- No imports from `node:fs`, `bun:sqlite`, `electrobun`, or any I/O API.
- Each spec runs in <100ms; the full Phase-3 suite under <1s.

---

## STASH STRATEGY

### Order (least to most coupled)

```bash
# 1. Planning docs (no code dependencies)
git stash push -u -m "phase-misc-docs" -- docs/superpowers/plans/

# 2. Phase 7 — detail components
git stash push -u -m "phase-7-renderer-detail" -- \
  src/shell/renderer/components/detail/

# 3. Phase 6 — list + shared renderer + assets
git stash push -u -m "phase-6-renderer-list" -- \
  src/shell/renderer/components/list/ \
  src/shell/renderer/components/shared/ \
  src/shell/renderer/utils/ \
  src/shell/renderer/constants/ \
  src/shell/renderer/styles/ \
  src/shell/renderer/index.html \
  assets/icons/ \
  assets/images/ \
  happydom.ts

# 4. Phase 5 — RPC + preview server
git stash push -u -m "phase-5-rpc" -- \
  src/shell/main/rpc/ \
  src/shared/rpc/ \
  src/shared/types/logger.types.ts \
  tools/preview/

# 5. Phase 4 — data layer + fixtures + factories + logging
git stash push -u -m "phase-4-data-layer" -- \
  src/shell/app/ \
  src/__tests__/factories/ \
  src/__tests__/fixtures/ \
  src/shared/logging/ \
  drizzle/  # if present
```

### Modified files (not in any stash above)

- `package.json` — restore to HEAD; renderer-related dep additions land in Phase 6.
- `src/shell/main/main.ts` — restore to HEAD; RPC modifications land in Phase 5.
- `src/shell/renderer/app.tsx` — restore to HEAD; renderer scaffold lands in Phase 6.

These are restored via `git restore --staged --worktree <path>` after the five stashes complete, then their changes are reintroduced when the relevant phase starts.

### Manifest

A pre-execution audit file at `tmp/phase-3-stash-manifest.md` (gitignored under `tmp/`) lists:

- every staged file (`git status --short | grep '^A'`),
- its target stash name (or "Phase 3 keep"),
- a confidence flag (high / medium).

The manifest is human-reviewable before any stash operation runs.

---

## VERIFICATION POINTS

| #   | Command                                                               | Expected                                                |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | `bun run typecheck`                                                   | Exit 0                                                  |
| 2   | `bun test src/core src/shared`                                        | Exit 0; 17 specs pass                                   |
| 3   | `bunx biome check src/core src/shared`                                | Exit 0                                                  |
| 4   | `bunx knip`                                                           | Exit 0 (no unused exports in the trimmed slice)         |
| 5   | `bunx depcruise src/core src/shared --config .dependency-cruiser.cjs` | Exit 0 (no shell-layer leakage)                         |
| 6   | `git diff-tree --no-commit-id --name-only -r HEAD \| wc -l`           | Exit 0; line count ≈ 70                                 |
| 7   | `git status --short`                                                  | Empty after commit                                      |
| 8   | `git stash list`                                                      | 6 entries: 5 phase stashes + the original `WIP on main` |

Steps 1–5 form the pre-commit gate. Steps 6–8 form the post-commit verification.

---

## EXECUTION SEQUENCE

1. **Audit** — `tmp/phase-3-stash-manifest.md` listing all staged files and target stashes.
2. **Stash** — five `git stash push -u -m <phase-name> -- <paths>` calls in the order above.
3. **Restore modified non-Phase-3 files** — `git restore --staged --worktree package.json src/shell/main/main.ts src/shell/renderer/app.tsx`.
4. **Edit** `src/shared/types/index.ts` to remove `export * from './logger.types'`.
5. **Verify isolation** — `git status --short` should list only the ~70 Phase 3 files; run `bun run typecheck` + `bun test src/core src/shared` to confirm.
6. **Add 10 new specs** — author one or two at a time; `bun test` after each batch.
7. **Pre-commit gate** — Verification points 1–5 in [VERIFICATION POINTS](#verification-points).
8. **Commit** — single commit with the [approved message](#commit-message).
9. **Post-commit gate** — Verification points 6–8.
10. **No PR / push** — commit lands locally on `chore-add-domain`; user decides when to publish.

---

## COMMIT MESSAGE

**Subject (47 chars):**

```text
feat(core): Add domain types, schemas, parsers
```

**Body (72-char wrap):**

```text
Adds the pure domain layer under src/core/ — no I/O, no
shell dependencies. Drives Phase 3 of the foundation
roadmap.

Layers:
- constants/ — app, defaults, lang
- domain/types — Entry, NoteBlock, LinkItem, etc.
- domain/constants — entry keys, section types, patterns
- domain/guards — entry, lang, entry_section type guards
- domain/models/entries — base/meta/tags/notes/link/entry/
  task Zod schemas, base_fields and source_document parsers,
  entry factory
- domain/models/knowledges — knowledge schema, knowledge
  factory (incl. crc32-based deriveId), doc.assembler with
  per-type doc parsers (bookmark, cheat, command, task) and
  shared parsers (notes, youtube)
- domain/models/sources — source_location parser
- helpers/path.helper — pure ~ and $VAR expansion

Shared (pure-only slice):
- src/shared/utils/crc32 — id derivation primitive
- src/shared/types/env.types — Env type for path.helper
- src/shared/types/index now exports only env types; logger
  re-export returns when the logging stack lands in Phase 5.

Tests (per-public-export rule):
- 7 existing specs preserved (tags, source_document, doc.
  assembler, youtube, notes, source_location, path.helper,
  crc32).
- 10 new specs added covering base_fields, entry/knowledge
  factories, the four doc.* parsers, and the three guards.
- Schemas tested transitively through parsers/factories.

No I/O, no `bun:sqlite`, no `Bun.serve`, no Electrobun
imports. The whole layer can be imported by any future
shell or renderer code without coupling.
```

The Cursor runtime auto-appends `Co-authored-by: Cursor <cursoragent@cursor.com>` after the body. This is treated as an allowed system suffix per prior project decision; the spec body is verbatim above the trailer.

---

## RISKS AND MITIGATIONS

| Risk                                                                       | Mitigation                                                                                                                                         |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| File mis-mapped to a stash; lost on Phase 4 start                          | Manifest audit before stashing; each stash recoverable independently via `git stash apply <stash@{N}>`                                             |
| Phase 3 file silently depends on a stashed file (compile fail after stash) | Verification step 5 in [EXECUTION SEQUENCE](#execution-sequence): typecheck + test after stashing, before authoring new specs                      |
| `src/shared/types/index.ts` edit breaks downstream imports                 | The edit only removes a re-export. Verified by typecheck — failures point to the offender, which gets stashed too                                  |
| 10 new specs introduce mocking or I/O by accident                          | Test style rules in [TESTING](#test-style-requirements); reviewer enforces                                                                         |
| Commit body exceeds gitlint limits                                         | Pre-commit dry-run with `gitlint --staged` after staging; subject is 47 chars; body lines wrap at 72                                               |
| Stash-on-stash conflict on a later `pop`                                   | Stashes are recorded in dependency order; manifest documents file ownership; fallback is `git stash branch <name> stash@{N}` for surgical recovery |

---

## RELATED DOCS

- [foundation/roadmap.md](../foundation/roadmap.md) — Phase 3 entry.
- [foundation/design.md](../foundation/design.md) — SCHEMA LAYERS, STABLE IDENTITY, REPOSITORY STRUCTURE.
- [foundation/requirements.md](../foundation/requirements.md) — V1-2 (sync), V1-3 (list), V1-4 (detail) — Phase 3 enables but does not deliver these.
- [ci-build-packaging/design.md](../ci-build-packaging/design.md) — pattern reference for spec format.

---

## REFERENCES

- [Bun test docs](https://bun.sh/docs/cli/test) — `describe.each`, table-driven tests.
- [Zod docs](https://zod.dev/) — schema parsing, `safeParse`, refinement.
- [`crc32` (Bun built-in)](https://bun.sh/docs/api/hashing) — used for `deriveId`.
- `app-context` skill — architecture rules (FCIS layers, naming conventions).
- `app-testing` skill — testing patterns (no-mock rule, table-driven).
