<!-- markdownlint-disable-file -->
# Phase 7 — Detail View: Populate `doc` column — Design

## OVERVIEW

Phase 7 integrates `assembleDoc()` into the core `toKnowledge()` factory so every
`Knowledge` row carries pre-assembled Markdown in its `doc` column. The renderer's
`DetailPageView` switches from client-side markdown assembly (`notesToDoc()`) to
rendering `entry.doc` directly. The `doc` column already exists in the schema
(`TEXT NOT NULL DEFAULT ''`) and the upsert SQL already writes it — it is
currently hardcoded to `''`.

No new files. All changes are surgical edits to existing files plus one new spec.

---

## SCOPE DECISIONS

| Decision                           | Choice                                 | Rationale                                                                                        |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Where to call `assembleDoc()`      | Inside `toKnowledge()`                 | Single choke point — every caller (import, tests, fixtures) gets a populated `doc` automatically |
| `doc` in the type system           | Add to `persistFieldsSchema`           | `doc` is a derived persistence field like `createdAt`/`updatedAt`, not a YAML source field       |
| `Result` handling in `toKnowledge` | `.unwrapOr('')`                        | `assembleDoc` catches render errors internally; failure means empty doc, not a broken factory    |
| Renderer change                    | Use `entry.doc`, delete `notesToDoc()` | Removes 40 lines of client-side assembly; FCIS principle (core does the work, renderer displays) |
| Backfill existing entries          | Full rebuild on next sync              | `upsert` writes all columns including `doc` — the next sync naturally populates everything       |

---

## FILES AND RESPONSIBILITIES

### Core — `toKnowledge()` calls `assembleDoc()`

**`src/core/domain/models/entries/schemas/base.schema.ts`**
(no change — `doc` is not a YAML source field)

**`src/core/domain/models/knowledges/schemas/knowledge.schema.ts`**
Add `doc` to `persistFieldsSchema`:

```ts
export const persistFieldsSchema = Type.Object({
  id: Type.Integer(),
  doc: Type.String(),          // ← added
  createdAt: Type.Number(),
  updatedAt: Type.Number()
})
```

**`src/core/domain/models/knowledges/factories/knowledge.factory.ts`**
Import `assembleDoc`, call it inside `toKnowledge()`:

```ts
import { assembleDoc } from '../detail/doc.assembler'

export function toKnowledge(entry: Entry, now: number): Knowledge {
  const knowledge = parse(knowledgeSchema, {
    ...entry,
    id: deriveId(entry.type, entry.key),
    doc: '', // placeholder, overwritten below
    createdAt: now,
    updatedAt: now
  })
  knowledge.doc = assembleDoc(knowledge, { now: new Date(now) }).unwrapOr('')
  return knowledge
}
```

### Core — Fishery factories updated

**`src/__tests__/factories/factories.builder.ts`**
Add `doc` defaults to all four entry factories. Use `buildPreamble`-based values or a simple placeholder (e.g. `'# Factory bookmark'`). The value just needs to be non-empty so `DetailPageView` tests see content.

```ts
const bookmarkFactory = Factory.define<BookmarkKnowledge>(({ sequence }) => ({
  // ... existing fields ...
  doc: `# Example bookmark ${sequence}\n\nFactory-generated bookmark content.`
}))
```

Same pattern for `commandFactory`, `cheatFactory`, `taskFactory`.

### Data layer — `rowToKnowledge` and `rowToParams` include `doc`

**`src/shell/app/db/entry.repository.ts`**

`rowToKnowledge()` — add `doc: row.doc` to `base` (line 76-87):

```ts
const base = {
  // ... existing fields ...
  doc: row.doc,          // ← added
  createdAt: row.created_at,
  updatedAt: row.updated_at
}
```

`rowToParams()` — the function builds a positional parameter array for `UPSERT_SQL`. The 9th positional parameter (index 8, currently hardcoded `''`) maps to the `doc` column. Replace it with `row.doc`. The column is already in the UPSERT SQL (line 23/27/39).

### Renderer — `DetailPageView` uses `entry.doc`

**`src/shell/renderer/components/detail/detail_view.component.tsx`**

1. Replace `const md = notesToDoc(entry)` with `const md = entry.doc ?? ''`
2. Delete these definitions:
   - `type NoteBlock` (line 9)
   - `function notesToMarkdown()` (lines 13-25)
   - `function notesToDoc()` (lines 67-72)
3. Keep: `LinkItem`, `LinkDisplay`, `linksToDisplay()`, `primaryUrl()`, `safeHostname()`, `pushLinksFromObjectRecord()` — they serve the Links section, not the doc body.

### Testing — new and updated specs

**`src/shell/renderer/components/detail/detail_view.component.spec.tsx`** (new)

5 test cases:

1. `loading=true` → renders `"Loading entry…"`
2. `entry=null` → renders `"Entry not found."` + close button
3. Bookmark entry with `doc: '# My Bookmark\n\nSome notes'` → `MdView` receives the markdown
4. Task entry with `doc` → renders `BadgeAccessory` + `DependencyGraph`
5. Entry with `links: [{ title: 'GH', url: 'https://...' }]` → Links section renders

**`src/core/domain/models/knowledges/detail/doc.assembler.spec.ts`** (update existing)

Add one test: `toKnowledge()` on each entry type produces a non-empty `doc` string.
(This validates the integration inside `toKnowledge()`, not just `assembleDoc()` in isolation.)

**`src/__tests__/factories/factories.builder.spec.ts`** (update existing)

Add assertion that `factoryFor('bookmark').doc` is a non-empty string.

### Existing specs that must stay green

- `src/shell/app/db/entry.repository.spec.ts` — `rowToKnowledge`/`rowToParams` changes
- `src/shell/app/db/import.service.spec.ts` — import pipeline
- `src/shell/app/app.spec.ts` — `list()`, `getEntry()`, `sync()`
- `src/shell/main/rpc/server.spec.ts` — RPC routes
- All core parser specs

---

## NORMATIVE DATA CONTRACT

### `doc` field

- **Type:** `string` (never null, never undefined — schema default `''`)
- **Populated by:** `assembleDoc(knowledge, { now })` inside `toKnowledge()`
- **Content:** Type-specific preamble (title, URL, priority, due date, etc.) +
  rendered note fragments (markdown, code blocks, mermaid diagrams, SVGs)
- **Edge case:** If `assembleDoc` returns `Err`, `doc` is `''` (empty string) — the renderer shows no body section (existing `{md ? <MdView> : null}` guard)

### `Knowledge` type shape

After this change, every `Knowledge` (and `RpcKnowledge`) includes:

```ts
type Knowledge = {
  // ... existing fields ...
  doc: string   // ← added to persistFieldsSchema
  // ...
}
```

---

## TESTING STRATEGY

| Layer           | Approach                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| Core schema     | `doc.assembler.spec.ts` — `toKnowledge()` validates doc via TypeBox parse, assert populated for each type |
| Core factory    | `doc.assembler.spec.ts` — `toKnowledge()` produces populated `doc` for each entry type                    |
| Data layer      | `entry.repository.spec.ts` — `rowToKnowledge` maps `doc`, `rowToParams` accepts it, upsert round-trips    |
| Import pipeline | `import.service.spec.ts` — after import, entries have non-empty `doc`                                     |
| Renderer        | `detail_view.component.spec.tsx` — renders `entry.doc` via `MdView`, handles null/loading/empty           |
| Fishery         | `factories.builder.spec.ts` — factories produce rows with non-empty `doc`                                 |
