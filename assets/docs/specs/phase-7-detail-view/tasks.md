<!-- markdownlint-disable-file -->
# Phase 7 — Detail View: Populate `doc` column — Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `assembleDoc()` into `toKnowledge()` so every `Knowledge` row carries pre-assembled Markdown in its `doc` column, and switch `DetailPageView` to render `entry.doc` instead of client-side assembly.

**Architecture:** `assembleDoc()` moves into the core `toKnowledge()` factory — the single choke point that converts a parsed `Entry` into a `Knowledge` row. `doc` is added to `persistFieldsSchema` (TypeBox). The data layer (`rowToKnowledge`, `rowToParams`) is updated to read/write `doc`. The renderer drops `notesToDoc()` and reads `entry.doc` directly. Fishery factories add `doc` defaults so tests produce realistic rows.

**Primary verification:** `bun test && bun run lint` are green; entries imported after this change have non-empty `doc`.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/core/domain/models/knowledges/schemas/knowledge.schema.ts` | Modify | Add `doc: Type.String()` to `persistFieldsSchema` |
| `src/core/domain/models/knowledges/factories/knowledge.factory.ts` | Modify | Import `assembleDoc`, call it inside `toKnowledge()` |
| `src/__tests__/factories/factories.builder.ts` | Modify | Add `doc` defaults to all four Fishery factories |
| `src/shell/app/db/entry.repository.ts` | Modify | `rowToKnowledge`: add `doc: row.doc`; `rowToParams`: replace `''` with `row.doc` |
| `src/shell/renderer/components/detail/detail_view.component.tsx` | Modify | Use `entry.doc`, delete `notesToMarkdown()` / `notesToDoc()` / `NoteBlock` |
| `src/shell/renderer/components/detail/detail_view.component.spec.tsx` | Create | 5 test cases for DetailPageView |
| `src/core/domain/models/knowledges/detail/doc.assembler.spec.ts` | Modify | Add `toKnowledge()` integration test |
| `src/__tests__/factories/factories.builder.spec.ts` | Modify | Assert factories produce non-empty `doc` |

---

## Task 0: Pre-flight read

**Files:** none

- [ ] Read `assets/docs/specs/phase-7-detail-view/design.md`
- [ ] Read `assets/docs/specs/foundation/{requirements,design,roadmap}.md` — V1-4 section
- [ ] Read `.agents/skills/kb-context/SKILL.md`, `.agents/skills/kb-testing/SKILL.md`

---

## Task 1: Add `doc` to `persistFieldsSchema`

**Files:** Modify `src/core/domain/models/knowledges/schemas/knowledge.schema.ts`

- [ ] **Step 1: Add `doc` field**

At `persistFieldsSchema` (currently lines 11-15), add `doc` after `id`:

```ts
export const persistFieldsSchema = Type.Object({
  id: Type.Integer(),
  doc: Type.String(),
  createdAt: Type.Number(),
  updatedAt: Type.Number()
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/core/domain/models/knowledges/schemas/knowledge.schema.ts
git commit -m "feat(core): add doc field to persistFieldsSchema"
```

---

## Task 2: Wire `assembleDoc()` into `toKnowledge()`

**Files:** Modify `src/core/domain/models/knowledges/factories/knowledge.factory.ts`

- [ ] **Step 1: Import `assembleDoc`**

After the existing imports (line 1-5), add:

```ts
import { assembleDoc } from '../detail/doc.assembler'
```

- [ ] **Step 2: Call `assembleDoc()` inside `toKnowledge()`**

Replace the current `toKnowledge` body (lines 16-23) with:

```ts
export function toKnowledge(entry: Entry, now: number): Knowledge {
  const knowledge = parse(knowledgeSchema, {
    ...entry,
    id: deriveId(entry.type, entry.key),
    doc: '',
    createdAt: now,
    updatedAt: now
  })
  knowledge.doc = assembleDoc(knowledge, { now: new Date(now) }).unwrapOr('')
  return knowledge
}
```

`unwrapOr('')` is a neverthrow `Result` method — `assembleDoc` returns `Result<string, AssemblyError>`. If assembly fails, doc stays `''`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bun run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Run core parser tests (should still pass)**

```bash
bun test src/core/domain/
```

Expected: all green. The `toKnowledge()` callers in parser specs get `doc` populated automatically.

- [ ] **Step 5: Commit**

```bash
git add src/core/domain/models/knowledges/factories/knowledge.factory.ts
git commit -m "feat(core): call assembleDoc inside toKnowledge factory"
```

---

## Task 3: Add `doc` to Fishery factories

**Files:** Modify `src/__tests__/factories/factories.builder.ts`

- [ ] **Step 1: Add `doc` defaults to all four factories**

`bookmarkFactory` (around line 25-34) — add `doc` after `updatedAt`:

```ts
const bookmarkFactory = Factory.define<BookmarkKnowledge>(({ sequence }) => ({
  id: 1_000_000_000 + sequence,
  type: 'bookmark',
  key: `https://example.com/${sequence}`,
  source: minimalEntriesYml,
  desc: 'Example bookmark',
  tags: ['example'],
  doc: `# Example bookmark ${sequence}\n\nFactory-generated bookmark content.`,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000
}))
```

`commandFactory` (around line 36-45):

```ts
const commandFactory = Factory.define<CommandKnowledge>(({ sequence }) => ({
  id: 2_000_000_000 + sequence,
  type: 'command',
  key: `git status ${sequence}`,
  source: minimalEntriesYml,
  desc: 'Show working tree status',
  tags: ['git'],
  doc: `# Command ${sequence}\n\n\`\`\`sh\ngit status ${sequence}\n\`\`\``,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000
}))
```

`cheatFactory` (around line 47-56):

```ts
const cheatFactory = Factory.define<CheatKnowledge>(({ sequence }) => ({
  id: 3_000_000_000 + sequence,
  type: 'cheat',
  key: `Cheat title ${sequence}`,
  source: minimalEntriesYml,
  desc: 'Math cheat',
  tags: ['math'],
  doc: `# Cheat ${sequence}\n\nSome notes.`,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000
}))
```

`taskFactory` (around line 58-69):

```ts
const taskFactory = Factory.define<TaskKnowledge>(({ sequence }) => ({
  id: 4_000_000_000 + sequence,
  type: 'task',
  key: `Task title ${sequence}`,
  source: minimalEntriesYml,
  desc: 'Build kb',
  tags: ['dev', 'kb'],
  priority: 'high',
  status: 'doing',
  doc: `# Task ${sequence}\n\n> Build kb`,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000
}))
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun run typecheck
```

Expected: zero errors. `doc` must be present in the `Knowledge` type now.

- [ ] **Step 3: Run factory spec**

```bash
bun test src/__tests__/factories/factories.builder.spec.ts
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/factories/factories.builder.ts
git commit -m "feat(test): add doc defaults to Fishery knowledge factories"
```

---

## Task 4: Update data layer — `rowToKnowledge` and `rowToParams`

**Files:** Modify `src/shell/app/db/entry.repository.ts`

- [ ] **Step 1: Add `doc` to `rowToKnowledge` base object**

In `rowToKnowledge()` (lines 74-99), add `doc: row.doc` to the `base` object before `createdAt`:

```ts
function rowToKnowledge(row: KnowledgeRow): Knowledge {
  const base = {
    id: row.id,
    type: row.type as EntryType,
    key: row.key,
    source: row.source,
    desc: row.desc,
    tags: parseJson<string[]>(row.tags, []),
    links: parseJson(row.links, []),
    notes: parseJson(row.notes, []),
    meta: parseJson(row.meta, {}),
    doc: row.doc,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }

  if (row.type === 'task') {
    return {
      ...base,
      type: 'task',
      priority: row.priority as Knowledge extends { priority?: infer P } ? P : never,
      status: row.status as Knowledge extends { status?: infer S } ? S : never
    }
  }

  return base as Knowledge
}
```

- [ ] **Step 2: Replace hardcoded `''` with `row.doc` in `rowToParams`**

In `rowToParams()` (lines 101-141), the 9th positional value (index 8) is currently `''`. Change it to `row.doc`:

```ts
function rowToParams(
  row: Knowledge
): [
  number, string, string, string, string, string, string, string, string,
  string | null, string | null, null, null, string, string, number, number
] {
  return [
    row.id,
    row.type,
    row.key,
    row.source,
    row.desc,
    JSON.stringify(row.tags),
    JSON.stringify(row.links ?? []),
    JSON.stringify(row.notes ?? []),
    row.doc,
    'priority' in row ? (row.priority ?? null) : null,
    'status' in row ? (row.status ?? null) : null,
    null,
    null,
    JSON.stringify([]),
    JSON.stringify(row.meta ?? {}),
    row.createdAt,
    row.updatedAt
  ]
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bun run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Run entry repository tests**

```bash
bun test src/shell/app/db/entry.repository.spec.ts
```

Expected: all green. The upsert round-trip should now preserve `doc` values.

- [ ] **Step 5: Run import service tests**

```bash
bun test src/shell/app/db/import.service.spec.ts
```

Expected: all green. Imported entries now have non-empty `doc`.

- [ ] **Step 6: Commit**

```bash
git add src/shell/app/db/entry.repository.ts
git commit -m "feat(db): map doc column in rowToKnowledge and rowToParams"
```

---

## Task 5: Switch `DetailPageView` to `entry.doc`

**Files:** Modify `src/shell/renderer/components/detail/detail_view.component.tsx`

- [ ] **Step 1: Remove `NoteBlock` type (line 9)**

Delete:

```ts
type NoteBlock = NonNullable<RpcKnowledge['notes']>[number]
```

- [ ] **Step 2: Remove `notesToMarkdown()` function (lines 13-25)**

Delete the entire function. It is no longer needed.

- [ ] **Step 3: Remove `notesToDoc()` function (lines 67-72)**

Delete the entire function. It is no longer needed.

- [ ] **Step 4: Replace `notesToDoc(entry)` with `entry.doc`**

On line 112, change:

```ts
const md = notesToDoc(entry)
```

To:

```ts
const md = entry.doc ?? ''
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
bun run typecheck
```

Expected: zero errors. `entry.doc` must be of type `string`.

- [ ] **Step 6: Verify no dead references**

```bash
bun test src/shell/renderer/components/detail/
```

Expected: should be zero tests currently (spec file not created yet). No compile errors is sufficient.

- [ ] **Step 7: Commit**

```bash
git add src/shell/renderer/components/detail/detail_view.component.tsx
git commit -m "feat(renderer): use entry.doc in DetailPageView, remove client-side assembly"
```

---

## Task 6: Write `detail_view.component.spec.tsx`

**Files:** Create `src/shell/renderer/components/detail/detail_view.component.spec.tsx`

- [ ] **Step 1: Create the spec file with 5 test cases**

```tsx
import '@happy-dom/global-registrator'

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { render, screen } from '@testing-library/react'
import type { RpcKnowledge } from '@shared/rpc'
import { DetailPageView, type DetailPageViewProps } from './detail_view.component'

const openExternalMock = mock<(url: string) => void>()

const baseProps: DetailPageViewProps = {
  entry: null,
  loading: false,
  allEntries: [],
  onClose: () => {},
  onSelectEntry: () => {},
  onOpenExternal: url => openExternalMock(url)
}

function makeBookmark(overrides: Partial<RpcKnowledge> = {}): RpcKnowledge {
  return {
    id: 1,
    type: 'bookmark',
    key: 'https://example.com',
    source: '/tmp/test.yaml',
    desc: 'Test bookmark',
    tags: ['example'],
    links: [],
    notes: [],
    meta: {},
    doc: '',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...overrides
  } as RpcKnowledge
}

function makeTask(overrides: Partial<RpcKnowledge> = {}): RpcKnowledge {
  return {
    id: 2,
    type: 'task',
    key: 'Build kb',
    source: '/tmp/test.yaml',
    desc: 'Build the app',
    tags: ['dev'],
    links: [],
    notes: [],
    meta: {},
    doc: '',
    priority: 'high',
    status: 'doing',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...overrides
  } as RpcKnowledge
}

beforeEach(() => {
  openExternalMock.mockReset()
})

afterEach(() => {
  openExternalMock.mockReset()
})

describe('DetailPageView', () => {
  describe('when loading', () => {
    it('renders loading message', () => {
      render(<DetailPageView {...baseProps} loading={true} />)
      expect(screen.getByText('Loading entry…')).toBeTruthy()
    })
  })

  describe('when entry is null', () => {
    it('renders not-found message with close button', () => {
      render(<DetailPageView {...baseProps} entry={null} />)
      expect(screen.getByText('Entry not found.')).toBeTruthy()
      const closeBtn = screen.getByLabelText('Close detail')
      expect(closeBtn).toBeTruthy()
    })
  })

  describe('when entry has doc content', () => {
    it('renders the doc markdown via MdView', () => {
      const entry = makeBookmark({
        doc: '# My Bookmark\n\nSome **bold** notes.',
        key: 'my-bookmark'
      })
      render(<DetailPageView {...baseProps} entry={entry} />)

      expect(screen.getByText('my-bookmark')).toBeTruthy()
      // MdView renders markdown — the heading and bold text should be present in the DOM
      expect(screen.getByText('My Bookmark')).toBeTruthy()
      expect(screen.getByText('bold')).toBeTruthy()
    })
  })

  describe('when entry is a task', () => {
    it('renders BadgeAccessory and DependencyGraph', () => {
      const entry = makeTask({ doc: '# Task\n\nDo the thing.' })
      render(<DetailPageView {...baseProps} entry={entry} allEntries={[entry]} />)

      expect(screen.getByText('Build kb')).toBeTruthy()
      // BadgeAccessory renders task status/priority pills
      expect(screen.getByText('doing')).toBeTruthy()
      expect(screen.getByText('high')).toBeTruthy()
    })
  })

  describe('when entry has links', () => {
    it('renders the Links section with clickable buttons', () => {
      const entry = makeBookmark({
        links: [{ title: 'GitHub', url: 'https://github.com' }],
        doc: '# Bookmark'
      })
      render(<DetailPageView {...baseProps} entry={entry} />)

      const linkBtn = screen.getByText('GitHub')
      expect(linkBtn).toBeTruthy()

      linkBtn.click()
      expect(openExternalMock).toHaveBeenCalledWith('https://github.com')
    })
  })
})
```

- [ ] **Step 2: Run the spec**

```bash
bun test src/shell/renderer/components/detail/detail_view.component.spec.tsx
```

Expected: 5 pass, 0 fail.

- [ ] **Step 3: Commit**

```bash
git add src/shell/renderer/components/detail/detail_view.component.spec.tsx
git commit -m "test(renderer): add DetailPageView spec covering loading, null, doc, task, links"
```

---

## Task 7: Update existing specs — `doc.assembler` and `factories.builder`

**Files:** Modify `src/core/domain/models/knowledges/detail/doc.assembler.spec.ts`, `src/__tests__/factories/factories.builder.spec.ts`

- [ ] **Step 1: Add `toKnowledge()` integration test to `doc.assembler.spec.ts`**

After the existing `assembleDoc()` describe block, add a new describe block:

```ts
import { parseSourceFile, toKnowledge } from '../../factories/knowledge.factory'

describe('toKnowledge() with assembleDoc integration', () => {
  const NOW = 1_700_000_000_000
  const SOURCE = '/tmp/test.yaml'

  it('produces non-empty doc for a bookmark entry', () => {
    const content = `bookmarks:\n  - key: example\n    desc: Test\n    tags: [test]`
    const entries = parseSourceFile(SOURCE, content)
    const knowledge = toKnowledge(entries[0]!, NOW)

    expect(knowledge.doc.length).toBeGreaterThan(0)
    expect(knowledge.doc).toContain('example')
  })

  it('produces non-empty doc for a command entry', () => {
    const content = `commands:\n  - key: git status\n    desc: Show status\n    tags: [git]`
    const entries = parseSourceFile(SOURCE, content)
    const knowledge = toKnowledge(entries[0]!, NOW)

    expect(knowledge.doc.length).toBeGreaterThan(0)
    expect(knowledge.doc).toContain('git status')
  })

  it('produces non-empty doc for a cheat entry', () => {
    const content = `cheats:\n  - key: Math\n    desc: Formulas\n    tags: [math]`
    const entries = parseSourceFile(SOURCE, content)
    const knowledge = toKnowledge(entries[0]!, NOW)

    expect(knowledge.doc.length).toBeGreaterThan(0)
    expect(knowledge.doc).toContain('Math')
  })

  it('produces non-empty doc for a task entry', () => {
    const content = `tasks:\n  - key: Build app\n    desc: Do it\n    tags: [dev]\n    status: todo`
    const entries = parseSourceFile(SOURCE, content)
    const knowledge = toKnowledge(entries[0]!, NOW)

    expect(knowledge.doc.length).toBeGreaterThan(0)
    expect(knowledge.doc).toContain('Build app')
  })
})
```

- [ ] **Step 2: Run `doc.assembler.spec.ts`**

```bash
bun test src/core/domain/models/knowledges/detail/doc.assembler.spec.ts
```

Expected: all tests pass including the 4 new ones.

- [ ] **Step 3: Add `doc` assertion to `factories.builder.spec.ts`**

Add a new test inside the existing `describe('factoryFor()', ...)` block:

```ts
it('produces rows with non-empty doc', () => {
  const bookmark = factoryFor('bookmark')
  expect(bookmark.doc.length).toBeGreaterThan(0)

  const command = factoryFor('command')
  expect(command.doc.length).toBeGreaterThan(0)

  const cheat = factoryFor('cheat')
  expect(cheat.doc.length).toBeGreaterThan(0)

  const task = factoryFor('task')
  expect(task.doc.length).toBeGreaterThan(0)
})
```

- [ ] **Step 4: Run `factories.builder.spec.ts`**

```bash
bun test src/__tests__/factories/factories.builder.spec.ts
```

Expected: all tests pass including the new one.

- [ ] **Step 5: Commit**

```bash
git add src/core/domain/models/knowledges/detail/doc.assembler.spec.ts src/__tests__/factories/factories.builder.spec.ts
git commit -m "test: add doc integration tests for toKnowledge and factories"
```

---

## Task 8: Full test suite + quality gate

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

```bash
bun test
```

Expected: all tests green. Pay special attention to:
- `src/core/domain/` — all parser + assembler specs
- `src/shell/app/db/entry.repository.spec.ts` — upsert round-trip
- `src/shell/app/db/import.service.spec.ts` — import pipeline
- `src/shell/app/app.spec.ts` — `list()`, `getEntry()`, `sync()`
- `src/shell/main/rpc/server.spec.ts` — `/api/getEntry` returns `doc`
- `src/shell/renderer/components/detail/detail_view.component.spec.tsx` — 5 new tests
- `src/__tests__/factories/factories.builder.spec.ts` — doc assertion

- [ ] **Step 2: Run lint**

```bash
bun run lint
```

Expected: zero errors.

- [ ] **Step 3: Commit final verification**

```bash
git add -A
git commit -m "chore: Phase 7 verification — all tests green, lint clean"
```

---

## Task 9: Mark Phase 7 complete in roadmap

**Files:** Modify `assets/docs/specs/foundation/roadmap.md`

- [ ] **Step 1: Update Phase 7 status in roadmap**

Change line 24:

```diff
- |   7   | Renderer: Detail View          | V1-4         | ⬜ pending |
+ |   7   | Renderer: Detail View          | V1-4         | ✔ done    |
```

- [ ] **Step 2: Commit**

```bash
git add assets/docs/specs/foundation/roadmap.md
git commit -m "docs(roadmap): mark Phase 7 Detail View as done"
```
