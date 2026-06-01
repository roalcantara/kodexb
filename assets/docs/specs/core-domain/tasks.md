<!-- markdownlint-disable-file -->
# Phase 3 — Core Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Phase 3 of the app foundation roadmap as a single `feat(core)` commit on `chore-add-domain` — the pure domain layer (`src/core/`) plus the pure-only slice of `src/shared/` (crc32, env types) — with 7 existing + 10 new unit specs (per-public-export rule). Quarantine all out-of-scope work (Phases 4–7 + planning docs) into 5 named stashes so each can be restored when its phase begins.

**Architecture:** No-I/O domain layer under `src/core/`. Type guards on top of `domain/types` and `domain/constants`. Zod schemas validate YAML rows. Parsers (`base_fields`, `source_document`, `source_location`) produce structured shapes. Factories (`entry.factory`, `knowledge.factory`) compose schemas + parsers and derive stable ids via `crc32(type:key)`. `doc.assembler` plus four per-type doc parsers produce the Markdown body that downstream phases (4–7) persist and render. Helpers expose pure path expansion. `src/shared/utils/crc32` is the only shared dependency for id derivation; `src/shared/types/env.types` is needed by `path.helper`.

**Tech Stack:** Bun 1.x runtime + `bun:test` (table-driven via `describe.each`). Zod for schema validation. Pure TypeScript — no `node:fs`, no `bun:sqlite`, no Electrobun, no React.

**Spec source of truth:** [`design.md`](design.md). Section references like "design §SCOPE" point to that file.

---

## Pre-flight state

- **Branch:** `chore-add-domain`
- **HEAD before this plan:** `a3da056` (`chore(release): v0.2.0 [skip ci]`)
- **HEAD after Task 16:** new commit with subject `feat(core): Add domain types, schemas, parsers`
- **Working tree:** ~1,070 staged files (`A`) + 3 modified (`M`). Phase 3 keeps ~70; the rest stash.
- **Stash list before Task 1:** `stash@{0}: WIP on main: decf005 ...` (pre-existing, untouched).
- **Stash list after Task 6:** 6 entries — five new phase stashes plus the original WIP.

---

## Commit map

This plan produces ONE commit. All other tasks are non-commit operations (audit, stash, edit, verify, write specs, gate).

| Task | Subject                                          | Scope                                                        |
| ---- | ------------------------------------------------ | ------------------------------------------------------------ |
| 16   | `feat(core): Add domain types, schemas, parsers` | All of `src/core/` + pure `src/shared/` slice + 10 new specs |

---

## Verification commands cheat-sheet

| Goal                          | Command                                                               |
| ----------------------------- | --------------------------------------------------------------------- |
| TypeScript shape              | `bun run typecheck`                                                   |
| Phase 3 unit tests            | `bun test src/core src/shared`                                        |
| Biome on Phase 3 paths        | `bunx biome check src/core src/shared`                                |
| Knip on full repo             | `bunx knip`                                                           |
| Dependency-cruiser on Phase 3 | `bunx depcruise src/core src/shared --config .dependency-cruiser.cjs` |
| Stash list                    | `git stash list`                                                      |
| Files in a commit             | `git diff-tree --no-commit-id --name-only -r HEAD`                    |
| Working tree                  | `git status --short`                                                  |

---

## Task 1: Audit working tree and write stash manifest

**Files:**

- Create: `tmp/phase-3-stash-manifest.md` (gitignored under `tmp/`)

**Why:** Before stashing ~1,000 files into 5 buckets, write down where each one goes. The manifest is an audit trail; if a stash later misbehaves, the manifest tells you which files should be in it.

- [ ] **Step 1: Make sure tmp/ is gitignored**

```bash
git check-ignore tmp/anything
echo "Exit: $?"
```

Expected: exit 0 — `tmp/` already ignored. If exit ≠ 0, STOP and report.

- [ ] **Step 2: Inventory all staged + modified files into temp lists**

```bash
mkdir -p tmp
git status --short > tmp/_status_raw.txt
wc -l tmp/_status_raw.txt
```

Expected: line count ≈ 1073 (1,070 added + 3 modified).

- [ ] **Step 3: Write the manifest**

Create `tmp/phase-3-stash-manifest.md` with this structure (fill the bucket lists by `grep`-ing tmp/_status_raw.txt for each path prefix):

```markdown
# Phase 3 — Stash manifest

Generated: <timestamp>

## phase-3-keep (commits in feat(core))

src/core/                                # 53 files
src/shared/utils/crc32.ts
src/shared/utils/crc32.spec.ts
src/shared/utils/index.ts
src/shared/utils/package.json
src/shared/types/env.types.ts
src/shared/types/index.ts                # MODIFIED to drop logger re-export
src/shared/types/package.json

(plus ~10 new specs added in tasks 10–14)

## phase-misc-docs

docs/superpowers/plans/                  # planning artifacts

## phase-7-renderer-detail

src/shell/renderer/components/detail/    # 4 components + specs

## phase-6-renderer-list

src/shell/renderer/components/list/
src/shell/renderer/components/shared/
src/shell/renderer/utils/
src/shell/renderer/constants/
src/shell/renderer/styles/
src/shell/renderer/index.html
assets/icons/
assets/images/
happydom.ts

## phase-5-rpc

src/shell/main/rpc/                      # if present
src/shared/rpc/
src/shared/types/logger.types.ts
tools/preview/

## phase-4-data-layer

src/shell/app/                           # all of it
src/__tests__/factories/
src/__tests__/fixtures/
src/shared/logging/
drizzle/                                 # only if present

## restored-to-HEAD (not stashed)

package.json                             # M
src/shell/main/main.ts                   # M (RPC modifications stashed via patch in Task 5)
src/shell/renderer/app.tsx               # M (renderer scaffold stashed via patch in Task 4)
```

The "restored-to-HEAD" entries are the 3 `M` files. They are not stashed; they are restored to their HEAD content via `git restore --staged --worktree <path>` in Task 7. Their pending changes will reappear in later phases when those phases are implemented.

- [ ] **Step 4: Verify manifest covers every staged file**

```bash
# Sum the bucket categories above against the raw status count
# (manual check; this is the audit's purpose)
echo "Manifest written. Open tmp/phase-3-stash-manifest.md and verify:"
echo "  - every directory or file in tmp/_status_raw.txt is listed in exactly one bucket"
echo "  - 'phase-3-keep' totals ~70 files"
echo "  - the 5 stash buckets cover the remaining ~1003 files"
```

If any file appears uncategorized, add it to the most appropriate stash bucket (or to `phase-3-keep` if it actually belongs to Phase 3). The manifest is the contract for tasks 2–6.

---

## Task 2: Stash phase-misc-docs

**Files:**

- Stash: `docs/superpowers/plans/`

**Why:** Smallest stash, no code dependencies. Doing first reduces risk of conflicts in subsequent stashes.

- [ ] **Step 1: Confirm the path exists and has staged content**

```bash
ls -la docs/superpowers/plans/ 2>/dev/null && \
  git status --short docs/superpowers/plans/ | head -5
```

Expected: directory listing + a short list of `A docs/superpowers/plans/*.md` lines.

- [ ] **Step 2: Stash**

```bash
git stash push -u -m "phase-misc-docs" -- docs/superpowers/plans/
```

Expected: `Saved working directory and index state On chore-add-domain: phase-misc-docs`.

- [ ] **Step 3: Verify**

```bash
git stash list | head -3
ls docs/superpowers/plans/ 2>&1 | head -3
```

Expected: top stash entry is `phase-misc-docs`. The `ls` should show "No such file or directory" or empty if the directory itself was stashed.

---

## Task 3: Stash phase-7-renderer-detail

**Files:**

- Stash: `src/shell/renderer/components/detail/`

- [ ] **Step 1: Stash**

```bash
git stash push -u -m "phase-7-renderer-detail" -- \
  src/shell/renderer/components/detail/
```

Expected: `Saved working directory and index state On chore-add-domain: phase-7-renderer-detail`.

- [ ] **Step 2: Verify**

```bash
git stash list | head -3
git status --short | grep 'src/shell/renderer/components/detail' || echo "  (none — stashed)"
```

Expected: top stash entry is `phase-7-renderer-detail`; no detail/ paths remain in `git status`.

---

## Task 4: Stash phase-6-renderer-list

**Files (in one stash op):**

- `src/shell/renderer/components/list/`
- `src/shell/renderer/components/shared/`
- `src/shell/renderer/utils/`
- `src/shell/renderer/constants/`
- `src/shell/renderer/styles/`
- `src/shell/renderer/index.html`
- `assets/icons/`
- `assets/images/`
- `happydom.ts`

NOTE: `src/shell/renderer/app.tsx` is `M` (modified) and is restored to HEAD in Task 7 — not part of this stash.

- [ ] **Step 1: Stash**

```bash
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
```

Expected: `Saved working directory and index state On chore-add-domain: phase-6-renderer-list`.

- [ ] **Step 2: Verify**

```bash
git stash list | head -3
git status --short | grep -E '^A.*(src/shell/renderer/(components/(list|shared)|utils|constants|styles|index\.html)|assets/(icons|images)|happydom)' \
  || echo "  (none — all stashed)"
```

Expected: top stash entry is `phase-6-renderer-list`; no matching paths remain `A`.

---

## Task 5: Stash phase-5-rpc

**Files (in one stash op):**

- `src/shell/main/rpc/` (if exists)
- `src/shared/rpc/`
- `src/shared/types/logger.types.ts`
- `tools/preview/` (if exists)

NOTE: `src/shell/main/main.ts` is `M` (modified) and is restored to HEAD in Task 7. Its RPC-init code will reappear when Phase 5 begins.

- [ ] **Step 1: Stash**

```bash
# Build path list from what actually exists on disk
paths=()
[ -d src/shell/main/rpc ] && paths+=("src/shell/main/rpc/")
[ -d src/shared/rpc ] && paths+=("src/shared/rpc/")
[ -f src/shared/types/logger.types.ts ] && paths+=("src/shared/types/logger.types.ts")
[ -d tools/preview ] && paths+=("tools/preview/")

git stash push -u -m "phase-5-rpc" -- "${paths[@]}"
```

Expected: `Saved working directory and index state On chore-add-domain: phase-5-rpc`.

- [ ] **Step 2: Verify**

```bash
git stash list | head -3
git status --short | grep -E '^A.*(src/shell/main/rpc|src/shared/rpc|src/shared/types/logger\.types|tools/preview)' \
  || echo "  (none — all stashed)"
```

Expected: top stash entry is `phase-5-rpc`; no matching paths remain.

---

## Task 6: Stash phase-4-data-layer

**Files (in one stash op):**

- `src/shell/app/`
- `src/__tests__/factories/`
- `src/__tests__/fixtures/`
- `src/shared/logging/`
- `drizzle/` (only if exists)

- [ ] **Step 1: Stash**

```bash
paths=()
[ -d src/shell/app ] && paths+=("src/shell/app/")
[ -d src/__tests__/factories ] && paths+=("src/__tests__/factories/")
[ -d src/__tests__/fixtures ] && paths+=("src/__tests__/fixtures/")
[ -d src/shared/logging ] && paths+=("src/shared/logging/")
[ -d drizzle ] && paths+=("drizzle/")

git stash push -u -m "phase-4-data-layer" -- "${paths[@]}"
```

Expected: `Saved working directory and index state On chore-add-domain: phase-4-data-layer`.

- [ ] **Step 2: Verify**

```bash
git stash list | head -6
git status --short | grep -E '^A.*(src/shell/app|src/__tests__/(factories|fixtures)|src/shared/logging|drizzle)' \
  || echo "  (none — all stashed)"
```

Expected: 6 stash entries top-down (`phase-4-data-layer`, `phase-5-rpc`, `phase-6-renderer-list`, `phase-7-renderer-detail`, `phase-misc-docs`, plus the original `WIP on main`); no matching paths remain.

---

## Task 7: Restore modified non-Phase-3 files

**Files:**

- Restore: `package.json` to HEAD
- Restore: `src/shell/main/main.ts` to HEAD
- Restore: `src/shell/renderer/app.tsx` to HEAD

**Why:** These three are `M` (modified) — pending changes belong to Phases 4/5/6. Restoring them now keeps Phase 3 commit clean. The pending changes will be reapplied when their phase implements them.

- [ ] **Step 1: Restore**

```bash
git restore --staged --worktree package.json src/shell/main/main.ts src/shell/renderer/app.tsx
```

Expected: no output, exit 0.

- [ ] **Step 2: Verify**

```bash
git status --short package.json src/shell/main/main.ts src/shell/renderer/app.tsx \
  || echo "  (none — restored)"
```

Expected: empty output (no `M` lines for those three files).

---

## Task 8: Edit `src/shared/types/index.ts` to drop logger re-export

**Files:**

- Modify: `src/shared/types/index.ts`

**Why:** `logger.types.ts` was stashed with `phase-5-rpc` in Task 5. The barrel file currently re-exports it; without that file present, `bun run typecheck` would fail. Edit the barrel to re-export only `env.types`. The logger re-export returns when Phase 5 restores `logger.types.ts`.

- [ ] **Step 1: Replace the file content**

Current content:

```ts
export * from './env.types'
export * from './logger.types'
```

Replace with:

```ts
export * from './env.types'
```

- [ ] **Step 2: Verify**

```bash
cat src/shared/types/index.ts
git status --short src/shared/types/index.ts
```

Expected: file shows only the `env.types` re-export. `git status` shows `M src/shared/types/index.ts` (or `A` if it was already staged — both states are fine).

---

## Task 9: Verify isolation (typecheck + tests on trimmed tree)

**Files:** none modified.

**Why:** Before authoring 10 new specs, prove the trimmed tree compiles and the 7 existing specs still pass. If something fails, a Phase 3 file silently depends on a stashed file — STOP and re-evaluate before continuing.

- [ ] **Step 1: TypeScript shape**

```bash
bun run typecheck
echo "Exit: $?"
```

Expected: exit 0.

- [ ] **Step 2: Existing unit tests**

```bash
bun test src/core src/shared
echo "Exit: $?"
```

Expected: exit 0; the 8 existing specs pass (7 in `src/core/` + 1 `crc32.spec.ts` in `src/shared/`).

- [ ] **Step 3: If anything fails**

STOP. Inspect the failure to determine which stashed file the Phase 3 code depends on. Two recovery paths:

1. The dependency is genuine → `git stash apply <stash@{N}>` for the offending stash, add the missing file to `phase-3-keep`, restash the rest.
2. The dependency is a leftover import that should be removed → fix the import in the Phase 3 file (e.g., remove a dead import to `@shared/logging`).

Re-run Step 1 + Step 2 before proceeding. Do NOT proceed with broken typecheck or tests.

---

## Task 10: Add 3 guard specs (entry, lang, entry_section)

**Files:**

- Create: `src/core/domain/guards/entry.guard.spec.ts`
- Create: `src/core/domain/guards/lang.guard.spec.ts`
- Create: `src/core/domain/guards/entry_section.guard.spec.ts`

**Why:** Per-public-export rule: each exported guard gets a direct spec. Style: trivial truthy/falsy `describe.each` table. Style reference: existing `src/core/domain/models/entries/parsers/source_document.parser.spec.ts`.

- [ ] **Step 1: Write `entry.guard.spec.ts`**

```ts
import { describe, expect, it } from 'bun:test'
import { isEntryType } from './entry.guard'

describe('isEntryType()', () => {
  it.each([
    ['bookmark', true],
    ['command', true],
    ['cheat', true],
    ['task', true],
    ['unknown', false],
    ['', false],
    [null, false],
    [undefined, false],
    [42, false],
    [{ type: 'bookmark' }, false]
  ])('returns %p → %p', (input, expected) => {
    expect(isEntryType(input)).toBe(expected)
  })
})
```

- [ ] **Step 2: Write `lang.guard.spec.ts`**

```ts
import { describe, expect, it } from 'bun:test'
import { isNoteLang } from './lang.guard'

describe('isNoteLang()', () => {
  it.each([
    ['md', true],
    ['markdown', true],
    ['ts', true],
    ['typescript', true],
    ['sh', true],
    ['unknownlang', false],
    ['', false],
    ['   ', false],
    [null, false],
    [undefined, false],
    [42, false]
  ])('returns %p → %p', (input, expected) => {
    expect(isNoteLang(input)).toBe(expected)
  })
})
```

NOTE: the `true` rows must be members of `MARKDOWN_SUPPORTED_LANGS` from `src/core/constants/lang.const.ts`. Open that file and replace `'md', 'markdown', 'ts', 'typescript', 'sh'` with whatever is actually exported. The pattern stays the same.

- [ ] **Step 3: Write `entry_section.guard.spec.ts`**

```ts
import { describe, expect, it } from 'bun:test'
import { isEntryTypeSection } from './entry_section.guard'

describe('isEntryTypeSection()', () => {
  it.each([
    ['bookmarks', true],
    ['commands', true],
    ['cheats', true],
    ['tasks', true],
    ['bookmark', false], // singular form is NOT a section type
    ['unknown', false],
    ['', false],
    [null, false]
  ])('returns %p → %p', (input, expected) => {
    expect(isEntryTypeSection(input)).toBe(expected)
  })
})
```

NOTE: open `src/core/domain/constants/entry.const.ts` to confirm the exact members of `SECTION_ENTRY_TYPE_VALUES` (likely `bookmarks`, `commands`, `cheats`, `tasks` — the plural forms used as YAML top-level keys).

- [ ] **Step 4: Run the new specs**

```bash
bun test src/core/domain/guards
echo "Exit: $?"
```

Expected: exit 0; 3 new files report PASS.

---

## Task 11: Add `base_fields.parser.spec.ts` and `entry.factory.spec.ts`

**Files:**

- Create: `src/core/domain/models/entries/parsers/base_fields.parser.spec.ts`
- Create: `src/core/domain/models/entries/factories/entry.factory.spec.ts`

**Why:** `parseBaseEntryFields` and `toEntry`/`toEntryWithSourceHint` are core composers. The existing `source_document.parser.spec.ts` tests them transitively at the document level; this task adds direct unit coverage.

- [ ] **Step 1: Write `base_fields.parser.spec.ts`**

```ts
import { describe, expect, it } from 'bun:test'
import { parseBaseEntryFields } from './base_fields.parser'

describe('parseBaseEntryFields()', () => {
  it('returns the canonical BaseEntry shape with desc + tags', () => {
    const raw = { desc: 'Example', tags: ['x', 'y'] } as const
    const result = parseBaseEntryFields(raw, 'bookmark', 'https://example.com', '/abs/file.yml')
    expect(result.type).toBe('bookmark')
    expect(result.key).toBe('https://example.com')
    expect(result.source).toBe('/abs/file.yml')
    expect(result.desc).toBe('Example')
    expect(result.tags).toEqual(['x', 'y'])
  })

  it('omits links/notes/meta when not present', () => {
    const raw = { desc: 'A', tags: ['t'] } as const
    const r = parseBaseEntryFields(raw, 'cheat', 'k', '/f.yml')
    expect(r).not.toHaveProperty('links')
    expect(r).not.toHaveProperty('notes')
    expect(r).not.toHaveProperty('meta')
  })

  it('preserves links/notes/meta when present', () => {
    const raw = {
      desc: 'A',
      tags: ['t'],
      links: ['https://x'],
      notes: [{ lang: 'sh', text: 'echo' }],
      meta: { due: '2026-01-01' }
    } as const
    const r = parseBaseEntryFields(raw, 'task', 'k', '/f.yml')
    expect(r.links).toEqual(['https://x'])
    expect(r.notes).toEqual([{ lang: 'sh', text: 'echo' }])
    expect(r.meta).toEqual({ due: '2026-01-01' })
  })
})
```

NOTE: review `src/core/domain/models/entries/schemas/base.schema.ts` for the actual SourceRow shape and add cases for any non-trivial transformations (e.g., tag normalization, link parsing).

- [ ] **Step 2: Write `entry.factory.spec.ts`**

```ts
import { describe, expect, it } from 'bun:test'
import { toEntry, toEntryWithSourceHint } from './entry.factory'

describe('toEntry()', () => {
  it('returns a non-task entry as-is when valid', () => {
    const raw = { desc: 'Example', tags: ['x'] } as const
    const e = toEntry('bookmark', raw, 'https://example.com', '/f.yml')
    expect(e.type).toBe('bookmark')
    expect(e.key).toBe('https://example.com')
  })

  it('parses task priority and status from the source row', () => {
    const raw = { desc: 'Do it', tags: ['todo'], priority: 'high', status: 'doing' } as const
    const e = toEntry('task', raw, 'task-key', '/f.yml')
    expect(e.type).toBe('task')
    if (e.type === 'task') {
      expect(e.priority).toBe('high')
      expect(e.status).toBe('doing')
    }
  })

  it('throws ZodError for an invalid task row', () => {
    const raw = { desc: '', tags: [] } as const
    expect(() => toEntry('task', raw, '', '/f.yml')).toThrow()
  })
})

describe('toEntryWithSourceHint()', () => {
  it('rethrows with file:line hint when ZodError is raised', () => {
    const raw = { desc: '', tags: [] } as const
    const yaml = `
tasks:
  bad-key:
    desc: ""
    tags: []
`
    let captured: Error | undefined
    try {
      toEntryWithSourceHint('task', raw, 'bad-key', '/abs/file.yml', 'tasks', yaml)
    } catch (err) {
      captured = err as Error
    }
    expect(captured?.message).toMatch(/\/abs\/file\.yml.*entry "bad-key"/)
  })

  it('returns the entry on success', () => {
    const raw = { desc: 'A', tags: ['t'] } as const
    const e = toEntryWithSourceHint('cheat', raw, 'k', '/f.yml', 'cheats', '')
    expect(e.type).toBe('cheat')
  })
})
```

- [ ] **Step 3: Run**

```bash
bun test src/core/domain/models/entries
echo "Exit: $?"
```

Expected: exit 0.

---

## Task 12: Add `knowledge.factory.spec.ts`

**Files:**

- Create: `src/core/domain/models/knowledges/factories/knowledge.factory.spec.ts`

**Why:** `deriveId` is the stable-id contract from design.md §STABLE IDENTITY. `toKnowledge` adds `id`, `createdAt`, `updatedAt`. Both are public exports and need direct coverage.

- [ ] **Step 1: Write the spec**

```ts
import { describe, expect, it } from 'bun:test'
import { crc32 } from '../../../../../shared/utils/crc32'
import type { Entry } from '../../entries/schemas/entry.schema'
import { deriveId, toKnowledge } from './knowledge.factory'

describe('deriveId()', () => {
  it('returns crc32(type + ":" + key)', () => {
    const expected = crc32('bookmark:https://example.com')
    expect(deriveId('bookmark', 'https://example.com')).toBe(expected)
  })

  it('is deterministic across calls', () => {
    const a = deriveId('command', 'git status')
    const b = deriveId('command', 'git status')
    expect(a).toBe(b)
  })

  it('is sensitive to type', () => {
    const a = deriveId('bookmark', 'k')
    const b = deriveId('cheat', 'k')
    expect(a).not.toBe(b)
  })

  it('is sensitive to key', () => {
    const a = deriveId('task', 'k1')
    const b = deriveId('task', 'k2')
    expect(a).not.toBe(b)
  })
})

describe('toKnowledge()', () => {
  it('adds id + createdAt + updatedAt to a non-task entry', () => {
    const now = 1_700_000_000_000
    const entry: Entry = {
      type: 'bookmark',
      key: 'https://example.com',
      source: '/f.yml',
      desc: 'Example',
      tags: ['x']
    }
    const k = toKnowledge(entry, now)
    expect(k.id).toBe(deriveId('bookmark', 'https://example.com'))
    expect(k.createdAt).toBe(now)
    expect(k.updatedAt).toBe(now)
  })

  it('preserves task-specific fields', () => {
    const now = 1_700_000_000_000
    const entry: Entry = {
      type: 'task',
      key: 't',
      source: '/f.yml',
      desc: 'Do',
      tags: ['todo'],
      status: 'todo'
    }
    const k = toKnowledge(entry, now)
    expect(k.type).toBe('task')
  })
})
```

NOTE: import paths above use the relative `../../../../../shared/utils/crc32` to avoid coupling to a `tsconfig` alias that may not be present yet. If `@shared/utils` resolves cleanly (Phase 3 source uses `from '@shared/utils'` in `knowledge.factory.ts`), use that import in the spec too. Run typecheck after writing to confirm the chosen import resolves.

- [ ] **Step 2: Run**

```bash
bun test src/core/domain/models/knowledges/factories
echo "Exit: $?"
```

Expected: exit 0.

---

## Task 13: Add `doc.bookmark.parser.spec.ts` and `doc.cheat.parser.spec.ts`

**Files:**

- Create: `src/core/domain/models/knowledges/detail/doc.bookmark.parser.spec.ts`
- Create: `src/core/domain/models/knowledges/detail/doc.cheat.parser.spec.ts`

**Why:** Direct coverage for the two simplest doc parsers. Existing `doc.assembler.spec.ts` tests these transitively; this task locks them down at the unit level so a future regression in `doc.assembler` is easier to attribute.

- [ ] **Step 1: Write `doc.bookmark.parser.spec.ts`**

```ts
import { describe, expect, it } from 'bun:test'
import type { BookmarkKnowledge } from '../schemas/knowledge.schema'
import { buildBookmarkPreamble } from './doc.bookmark.parser'

const baseEntry: BookmarkKnowledge = {
  id: 1,
  type: 'bookmark',
  key: 'https://example.com',
  source: '/f.yml',
  desc: 'Example site',
  tags: ['x'],
  createdAt: 0,
  updatedAt: 0
}

describe('buildBookmarkPreamble()', () => {
  it('returns embed link + thumbnail for a YouTube URL', () => {
    const entry = { ...baseEntry, key: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
    const out = buildBookmarkPreamble(entry)
    expect(out).toContain('youtube.com/embed/dQw4w9WgXcQ')
    expect(out).toContain('youtube.com/vi/dQw4w9WgXcQ')
    expect(out).toContain('![YouTube Thumbnail]')
  })

  it('returns image markdown when previewImageUrl is provided (non-YouTube)', () => {
    const out = buildBookmarkPreamble(baseEntry, 'https://og.example.com/img.png')
    expect(out).toBe('![Example site](https://og.example.com/img.png)')
  })

  it('returns empty string when neither YouTube nor previewImageUrl is present', () => {
    const out = buildBookmarkPreamble(baseEntry)
    expect(out).toBe('')
  })
})
```

NOTE: confirm the exact YouTube URL substrings produced by `youTubeEmbedUrl` and `youTubeThumbnailMq` in `youtube.parser.ts`; adjust the `toContain` expectations to match.

- [ ] **Step 2: Write `doc.cheat.parser.spec.ts`**

```ts
import { describe, expect, it } from 'bun:test'
import type { CheatKnowledge } from '../schemas/knowledge.schema'
import { buildCheatPreamble } from './doc.cheat.parser'

const cheatEntry: CheatKnowledge = {
  id: 1,
  type: 'cheat',
  key: 'sample-cheat',
  source: '/f.yml',
  desc: 'A cheat',
  tags: ['math'],
  createdAt: 0,
  updatedAt: 0
}

describe('buildCheatPreamble()', () => {
  it('always returns an empty string (cheat preambles are intentionally empty)', () => {
    expect(buildCheatPreamble(cheatEntry)).toBe('')
  })
})
```

- [ ] **Step 3: Run**

```bash
bun test src/core/domain/models/knowledges/detail
echo "Exit: $?"
```

Expected: exit 0; 4 specs pass (existing 3 + 1 new). Wait — 5: existing `doc.assembler`, `youtube.parser`, `notes.parser` (3) + new `doc.bookmark.parser`, `doc.cheat.parser` (2) = 5.

---

## Task 14: Add `doc.command.parser.spec.ts` and `doc.task.parser.spec.ts`

**Files:**

- Create: `src/core/domain/models/knowledges/detail/doc.command.parser.spec.ts`
- Create: `src/core/domain/models/knowledges/detail/doc.task.parser.spec.ts`

- [ ] **Step 1: Write `doc.command.parser.spec.ts`**

```ts
import { describe, expect, it } from 'bun:test'
import type { CommandKnowledge } from '../schemas/knowledge.schema'
import { buildCommandPreamble } from './doc.command.parser'

const cmd: CommandKnowledge = {
  id: 1,
  type: 'command',
  key: 'git status',
  source: '/f.yml',
  desc: 'Show working tree status',
  tags: ['git'],
  createdAt: 0,
  updatedAt: 0
}

describe('buildCommandPreamble()', () => {
  it('renders a fenced sh block with the key, then DESCRIPTION blockquote', () => {
    const out = buildCommandPreamble(cmd)
    expect(out).toContain('```sh\ngit status\n```')
    expect(out).toContain('### DESCRIPTION')
    expect(out).toContain('> Show working tree status')
  })

  it('preserves multi-line keys verbatim inside the code fence', () => {
    const multi = { ...cmd, key: 'echo a\necho b' }
    const out = buildCommandPreamble(multi)
    expect(out).toContain('```sh\necho a\necho b\n```')
  })
})
```

- [ ] **Step 2: Write `doc.task.parser.spec.ts`**

```ts
import { describe, expect, it } from 'bun:test'
import type { TaskKnowledge } from '../schemas/knowledge.schema'
import { buildTaskPreamble } from './doc.task.parser'

const baseTask: TaskKnowledge = {
  id: 1,
  type: 'task',
  key: 'Plan the launch',
  source: '/f.yml',
  desc: '',
  tags: ['work'],
  status: 'todo',
  createdAt: 0,
  updatedAt: 0
}

describe('buildTaskPreamble()', () => {
  const NOW = new Date('2026-06-01T00:00:00Z')

  it('renders title, status, and priority sections', () => {
    const t: TaskKnowledge = { ...baseTask, priority: 'high' }
    const out = buildTaskPreamble(t, NOW)
    expect(out).toContain('# Plan the launch')
    expect(out).toContain('### STATUS\n\nTODO')
    expect(out).toContain('### PRIORITY\n\nHIGH')
  })

  it('omits desc blockquote when desc is empty', () => {
    const out = buildTaskPreamble(baseTask, NOW)
    expect(out).not.toContain('>')
  })

  it('renders desc blockquote when desc is present', () => {
    const t: TaskKnowledge = { ...baseTask, desc: 'Coordinate the team' }
    const out = buildTaskPreamble(t, NOW)
    expect(out).toContain('> Coordinate the team')
  })

  it('marks DUE DATE as ⚠ OVERDUE when due < now and status !== done', () => {
    const t: TaskKnowledge = { ...baseTask, meta: { due: '2026-05-01' } }
    const out = buildTaskPreamble(t, NOW)
    expect(out).toContain('### DUE DATE\n\n2026-05-01 ⚠ OVERDUE')
  })

  it('does NOT mark DUE DATE as OVERDUE when status === done', () => {
    const t: TaskKnowledge = {
      ...baseTask,
      status: 'done',
      meta: { due: '2026-05-01' }
    }
    const out = buildTaskPreamble(t, NOW)
    expect(out).toContain('### DUE DATE\n\n2026-05-01')
    expect(out).not.toContain('⚠ OVERDUE')
  })

  it('omits DUE DATE section when meta.due is absent', () => {
    const out = buildTaskPreamble(baseTask, NOW)
    expect(out).not.toContain('### DUE DATE')
  })
})
```

- [ ] **Step 3: Run all detail/ specs**

```bash
bun test src/core/domain/models/knowledges/detail
echo "Exit: $?"
```

Expected: exit 0; 7 specs pass (existing 3 + 4 new).

- [ ] **Step 4: Run the full Phase 3 suite**

```bash
bun test src/core src/shared
echo "Exit: $?"
```

Expected: exit 0; 18 specs pass (8 existing + 10 new).

---

## Task 15: Pre-commit gate (Definition of Done)

**Files:** none modified.

**Why:** All five DoD checks from `design.md §VERIFICATION POINTS` must pass before the single commit lands.

- [ ] **Step 1: TypeScript shape**

```bash
bun run typecheck
echo "Exit: $?"
```

Expected: exit 0.

- [ ] **Step 2: Phase 3 unit tests**

```bash
bun test src/core src/shared
echo "Exit: $?"
```

Expected: exit 0.

- [ ] **Step 3: Biome on Phase 3 paths**

```bash
bunx biome check src/core src/shared
echo "Exit: $?"
```

Expected: exit 0. If issues are auto-fixable, run `bunx biome check --write src/core src/shared` and re-verify.

- [ ] **Step 4: Knip (full repo)**

```bash
bunx knip
echo "Exit: $?"
```

Expected: exit 0. If knip flags new unused exports introduced by Phase 3 (unlikely — domain code is internally consumed by tests), fix them.

- [ ] **Step 5: Dependency-cruiser on Phase 3**

```bash
bunx depcruise src/core src/shared --config .dependency-cruiser.cjs
echo "Exit: $?"
```

Expected: exit 0; no rule violations (in particular, no `core/` → `shell/` import).

- [ ] **Step 6: If any of Steps 1–5 fail**

STOP. Fix the issue and re-run from Step 1. Do NOT proceed to Task 16 with red checks.

---

## Task 16: Commit `feat(core): Add domain types, schemas, parsers`

**Files:** stages and commits the Phase 3 working set.

**Why:** Single commit per design Decision 1.

- [ ] **Step 1: Stage Phase 3 paths explicitly**

```bash
git add src/core/ src/shared/utils/ src/shared/types/env.types.ts src/shared/types/index.ts src/shared/types/package.json
git status --short
```

Expected: ~70 lines, all `A` or `M` for the Phase 3 paths only. NO files outside `src/core/`, `src/shared/utils/`, or the three `src/shared/types/` paths above. If anything else appears, STOP and re-run the stash audit.

- [ ] **Step 2: Pre-commit dry-run for gitlint**

```bash
echo "feat(core): Add domain types, schemas, parsers" > /tmp/_msg
gitlint -C .gitlint --msg-filename /tmp/_msg
echo "Subject-only gitlint exit: $?"
```

Expected: exit 0 (subject is 47 chars; under the 50 cap).

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(core): Add domain types, schemas, parsers

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
- helpers/path.helper — pure ~ and \$VAR expansion

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

No I/O, no \`bun:sqlite\`, no \`Bun.serve\`, no Electrobun
imports. The whole layer can be imported by any future
shell or renderer code without coupling.
EOF
)"
```

NOTE: the body uses `\$VAR`, `\`bun:sqlite\``, `\`Bun.serve\`` to escape `$` and backticks within the HEREDOC. Bash will resolve those to plain `$VAR`, `` `bun:sqlite` ``, `` `Bun.serve` `` in the final commit message.

The Cursor runtime auto-appends `Co-authored-by: Cursor <cursoragent@cursor.com>` after the body. This is treated as an allowed system suffix per project decision; do NOT amend it out.

- [ ] **Step 4: Capture HEAD**

```bash
git rev-parse HEAD
git log -1 --pretty=%B
```

Expected: new SHA. Body matches the spec verbatim above the trailer.

---

## Task 17: Post-commit verification

**Files:** none modified.

**Why:** Confirm only Phase 3 files landed; the 5 stashes are all intact; the working tree is clean.

- [ ] **Step 1: Files in the new commit**

```bash
git diff-tree --no-commit-id --name-only -r HEAD | wc -l
git diff-tree --no-commit-id --name-only -r HEAD | head -10
```

Expected: line count ≈ 70. All paths under `src/core/`, `src/shared/utils/`, or `src/shared/types/`.

- [ ] **Step 2: Working tree clean**

```bash
git status --short
```

Expected: empty output.

- [ ] **Step 3: Stash list**

```bash
git stash list
```

Expected: 6 entries — `phase-4-data-layer`, `phase-5-rpc`, `phase-6-renderer-list`, `phase-7-renderer-detail`, `phase-misc-docs`, plus the original `WIP on main`.

- [ ] **Step 4: Subject + body**

```bash
git log -1 --pretty=%s
```

Expected: `feat(core): Add domain types, schemas, parsers`.

- [ ] **Step 5: Recovery test (read-only)**

```bash
for s in phase-4-data-layer phase-5-rpc phase-6-renderer-list phase-7-renderer-detail phase-misc-docs; do
  git stash list | grep "$s" || echo "MISSING: $s"
done
```

Expected: all five names found; no `MISSING:` line.

If any stash is missing, run `git fsck --unreachable` to find the lost commit and recover with `git stash apply <SHA>`.

---

## Self-review

The plan covers every section of `design.md`:

- §SCOPE → Tasks 2–7 quarantine the out-of-scope bucket; Task 16 commits the in-scope.
- §DESIGN DECISIONS 1 (single commit, no "port") → Task 16 commit subject.
- §DESIGN DECISIONS 2 (per-public-export tests) → Tasks 10–14 (10 new specs).
- §DESIGN DECISIONS 3 (5 phase stashes) → Tasks 2–6.
- §DESIGN DECISIONS 4 (drop logger re-export) → Task 8.
- §DESIGN DECISIONS 5 (pure-domain isolation) → Task 9 (verify) + Task 15.5 (depcruise).
- §ARCHITECTURE / Layer dependency graph → implicit; Task 9 typecheck enforces.
- §TESTING / Existing specs preserved → Task 9 verifies they still pass.
- §TESTING / 10 new specs → Tasks 10–14, with concrete scaffolds.
- §STASH STRATEGY / Order → Tasks 2 → 3 → 4 → 5 → 6 in the prescribed order.
- §STASH STRATEGY / Manifest → Task 1.
- §VERIFICATION POINTS → Task 15 (pre-commit) + Task 17 (post-commit).
- §EXECUTION SEQUENCE → mirrored 1-to-1 by tasks 1–17.
- §COMMIT MESSAGE → Task 16 Step 3.
- §RISKS AND MITIGATIONS → Task 9 covers "stashed dep" risk; Task 17 Step 5 covers "stash dropped" risk.

No placeholders (TBD/TODO/FIXME) in any task. Type names referenced in spec snippets (`BookmarkKnowledge`, `CommandKnowledge`, `TaskKnowledge`, `Entry`) are defined in the schemas already in the working tree; the implementer can verify by reading them.
