<!-- markdownlint-disable-file -->

# List frecency sort — implementation plan

> **Goal:** Sort list/split entry rows by frecency; record visits on detail open and successful copy.

**Architecture:** Pure `bumpFrecency` in `core`; `entry_frecency` table + `recordEntryVisit` in shell; `findAll` JOIN/ORDER BY; renderer fire-and-forget RPC.

**Tech stack:** Bun, SQLite, Elysia/Eden, React 19, TypeBox.

---

### Task 1: Core `bumpFrecency`

**Files:**

- Create: `src/core/helpers/frecency/bump_frecency.util.ts`, `.spec.ts`
- Modify: `src/core/helpers/index.ts`

- [ ] Write failing tests (first visit, decay between visits, burst visits).
- [ ] Implement `bumpFrecency`, export `FRECENCY_HALF_LIFE_MS`, `FRECENCY_BUMP_WEIGHT`.
- [ ] Run `bun test src/core/helpers/frecency/bump_frecency.util.spec.ts`.

### Task 2: DB schema + repository

**Files:**

- Modify: `src/shell/app/db/schema.ts`, `client.ts`
- Create: `src/shell/app/db/frecency.repository.ts`, `.spec.ts`

- [ ] Add `CREATE_ENTRY_FRECENCY_SQL` and index.
- [ ] `recordEntryVisit(db, entryId, nowMs?)` — skip if knowledge missing.
- [ ] Test upsert and ordering readback.

### Task 3: `findAll` ordering

**Files:**

- Modify: `src/shell/app/db/entry.repository.ts`, `.spec.ts`

- [ ] `LEFT JOIN entry_frecency` on plain + FTS paths.
- [ ] Apply ORDER BY clauses from design.
- [ ] Test: higher score first; FTS keeps bm25 primary.

### Task 4: App + RPC + client

**Files:**

- Modify: `src/shell/app/app.ts`, `src/shell/main/rpc/server.ts`, `src/shell/renderer/rpc/client.ts`, `client.spec.tsx`

- [ ] `App.recordEntryVisit` → repository + `invalidateListCache()`.
- [ ] Register route (reuse `getEntryParams`).
- [ ] `recordEntryVisit(id)` on Eden client.

### Task 5: Renderer hooks

**Files:**

- Create: `src/shell/renderer/utils/list/record_entry_visit.util.ts`
- Modify: `use_view_navigation.hook.ts`, `.spec.tsx`

- [ ] Call fire-and-forget from `advance`, `selectDetailEntry`, copy success.
- [ ] Extend navigation specs.

### Task 6: Docs index + verify

**Files:**

- Modify: `assets/docs/specs/README.md`
- Mark tasks in `tasks.md`.

- [ ] Run targeted `bun test` and Biome on touched paths.
