<!-- markdownlint-disable-file -->
# Phase 7 — Detail View: Populate `doc` column — Requirements

## INTRODUCTION

Phase 7 completes the detail view pipeline by populating the `doc` column at import
time. Currently the detail view builds markdown client-side from raw `notes`/`desc`
fields. The `assembleDoc()` function already exists in core (pure, tested) but is
never called during import. The `doc` column exists in the schema (`TEXT NOT NULL
DEFAULT ''`) but is always empty.

This phase moves markdown assembly from the renderer to the core — aligning with
the FCIS architecture principle that core does the work and the renderer displays.

---

## REQUIREMENT SYNTAX (EARS)

### REQ-DOC-1: `doc` populated at import time

**User story:** As a developer, I want the `doc` column populated during import
so that the detail view renders pre-assembled Markdown without client-side assembly.

**Acceptance criteria:**

1. WHEN `toKnowledge()` is called with an `Entry` and timestamp, THEN
   `assembleDoc()` SHALL be called and the result SHALL be assigned to
   `knowledge.doc`.

2. WHEN `assembleDoc()` returns an `Err` (assembly failure), THEN `doc` SHALL
   default to `''` (empty string) — the detail view renders no body section.

3. WHEN the import pipeline calls `upsert()`, THEN the `doc` value produced by
   `toKnowledge()` SHALL be written to the SQLite `knowledges.doc` column.

4. WHEN `findById()` or `findAll()` returns rows, THEN the returned `Knowledge`
   object SHALL include the `doc` field from the database.

---

### REQ-DOC-2: Detail view renders `entry.doc`

**User story:** As a user, I want the detail view to display the entry's full
content directly from the pre-assembled `doc` field.

**Acceptance criteria:**

1. WHEN `DetailPageView` receives an entry, THEN it SHALL render `entry.doc`
   via `MdView` (instead of computing markdown from raw `notes`/`desc`).

2. WHEN `entry.doc` is `''` or undefined, THEN the detail view SHALL render
   no body section (existing `{md ? <MdView> : null}` guard).

3. THE functions `notesToMarkdown()` and `notesToDoc()` SHALL be removed from
   `detail_view.component.tsx`.

---

### REQ-DOC-3: Type system includes `doc`

**User story:** As a developer, I want `doc` to be a first-class field on the
`Knowledge` type so that TypeScript enforces it across the stack.

**Acceptance criteria:**

1. `persistFieldsSchema` SHALL include `doc: Type.String()`.

2. `KnowledgeRow` in `schema.ts` already includes `doc: string` — no change
   needed.

3. Fishery factories (`factories.builder.ts`) for all four entry types SHALL
   include a non-empty `doc` default.

---

### REQ-DOC-4: Backward compatibility

**User story:** As a user, I want entries imported before this change to get
their `doc` populated on the next sync.

**Acceptance criteria:**

1. WHEN sync runs after this change, THEN the upsert SHALL write `doc` for
   every entry (new and existing) — no separate migration required.

2. Existing specs (core parsers, import pipeline, RPC routes, renderer) SHALL
   continue to pass without modification to their test logic.

---

## OUT OF SCOPE

- OG image integration into `assembleDoc()` (previewImageUrl parameter already exists)
- Migration runner activation (no schema change — `doc` column already exists)
- Task-specific preamble changes (already handled by `buildTaskPreamble`)
