<!-- markdownlint-disable-file -->

# List frecency sort — design

Normative technical contract. Requirements: [requirements.md](requirements.md).

## Architecture

| Layer | Artifact | Role |
| ----- | -------- | ---- |
| `core` | `bump_frecency.util.ts` | Pure decay + bump; exported constants |
| `shell/app/db` | `schema` + `frecency.repository.ts` | Table, `recordEntryVisit` |
| `shell/app/db` | `entry.repository.ts` | `LEFT JOIN entry_frecency`; `ORDER BY` clauses |
| `shell/app` | `App.recordEntryVisit` | Validate id, upsert, `invalidateListCache()` |
| `shell/main/rpc` | `POST /recordEntryVisit` | `{ id: integer }` body |
| `renderer` | `record_entry_visit.util.ts` | Fire-and-forget Eden call |
| `renderer` | `use_view_navigation.hook.ts` | Visit on detail open + copy success |

## Data model

```sql
CREATE TABLE IF NOT EXISTS entry_frecency (
  entry_id         INTEGER PRIMARY KEY
                   REFERENCES knowledges(id) ON DELETE CASCADE,
  visit_count      INTEGER NOT NULL DEFAULT 0,
  last_visited_at  INTEGER NOT NULL,
  frecency_score   REAL    NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_entry_frecency_score
  ON entry_frecency(frecency_score DESC);
```

Created in `openDatabase()` alongside `knowledges`.

## Score algorithm

Constants (core):

- `FRECENCY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000`
- `FRECENCY_BUMP_WEIGHT = 1`

On visit at `nowMs`:

```text
decay      = 0.5 ^ max(0, (nowMs - last_visited_at) / HALF_LIFE_MS)
new_score  = previous_score * decay + BUMP_WEIGHT   // previous_score = 0 if no row
visit_count = previous_count + 1
```

First visit: score `1`, `visit_count` `1`.

## List SQL

Shared join:

```sql
FROM knowledges k
LEFT JOIN entry_frecency f ON f.entry_id = k.id
```

**Plain** (`findAllRowsPlain`):

```sql
ORDER BY COALESCE(f.frecency_score, 0) DESC,
         k.task_order ASC NULLS LAST,
         k.updated_at DESC,
         k.id DESC
```

**FTS** (`findAllRowsFts`):

```sql
ORDER BY bm25(knowledges_fts),
         COALESCE(f.frecency_score, 0) DESC,
         k.task_order ASC NULLS LAST,
         k.updated_at DESC,
         k.id DESC
```

Task views: unchanged flow (`findAll` with `limit: -1` → `filterKnowledgeByTaskView` → `slice`); ordering applied before filter.

## RPC

- **Route:** `POST /api/recordEntryVisit`
- **Body:** `getEntryParams` (`{ id: integer }`)
- **Response:** `{ ok: true }`
- **Errors:** missing id → 500 with message (same as other routes)

## Renderer visit hooks

| Event | Call site |
| ----- | --------- |
| Open detail | `advance()`, `selectDetailEntry()` after `setDetailEntry` |
| Copy | `tryCopyShortcut` after clipboard `then` success |

`recordEntryVisitFireAndForget(id)` — `.catch(() => undefined)`.

## Files

| File | Action |
| ---- | ------ |
| `src/core/helpers/frecency/bump_frecency.util.ts` | Create |
| `src/core/helpers/frecency/bump_frecency.util.spec.ts` | Create |
| `src/core/helpers/index.ts` | Export frecency |
| `src/shell/app/db/schema.ts` | `CREATE_ENTRY_FRECENCY_SQL` + index |
| `src/shell/app/db/client.ts` | Run migration SQL |
| `src/shell/app/db/frecency.repository.ts` | Create |
| `src/shell/app/db/frecency.repository.spec.ts` | Create |
| `src/shell/app/db/entry.repository.ts` | Join + ORDER BY |
| `src/shell/app/db/entry.repository.spec.ts` | Ordering tests |
| `src/shell/app/app.ts` | `recordEntryVisit` |
| `src/shell/app/app.spec.ts` | Optional integration |
| `src/shell/main/rpc/server.ts` | Route |
| `src/shell/renderer/rpc/client.ts` | `recordEntryVisit` |
| `src/shell/renderer/rpc/client.spec.tsx` | Route smoke |
| `src/shell/renderer/utils/list/record_entry_visit.util.ts` | Create |
| `src/shell/renderer/hooks/list/use_view_navigation.hook.ts` | Hooks |
| `src/shell/renderer/hooks/list/use_view_navigation.hook.spec.tsx` | Expect calls |

Preview server: no change (forwards all `/api/*` to `RpcApp`).
