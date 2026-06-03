<!-- markdownlint-disable-file -->

# Sync frecency persistence — Design

## Overview

Split **sync rebuild** into:

1. **Export** learned rows (`entry_frecency`, `binding_frecency`) to memory.
2. **Rebuild** projection (current unlink + `ImportService.run` path).
3. **Restore** learned rows into new DB (map by stable keys where ids change).

**v1 approach (recommended — smaller than second DB file):** preserve tables
across rebuild using `ATTACH` / copy / in-process read before unlink, as
detailed below.

## Current behavior

```text
closeDb() → unlink(db, wal, shm) → ImportService.run → new empty DB + import
```

Learned tables are empty after step 1.

## Target behavior

```text
closeDb()
→ snapshotFrecencyState(dbPath)   // read entry_frecency + binding_frecency to structs
→ unlink projection files
→ ImportService.run (rebuild projection)
→ restoreFrecencyState(dbPath, snapshot, idMap)  // idMap from key → new id if needed
→ emit complete
```

### ID remapping

Import may assign **new integer ids** to knowledges. Frecency rows keyed by
`entry_id` need remap:

- Snapshot includes `entry_key` or join via pre-sync `knowledges.key` → post-sync
  `knowledges.key` lookup.
- Bindings: use stable `binding` hash or chord identity from `bindings` table.

Document exact columns in implementation from `schema.ts`.

## Decision: Option 1 vs separate durable DB

| Option                                       | Pros                        | Cons                                           |
| -------------------------------------------- | --------------------------- | ---------------------------------------------- |
| **1 — Snapshot + restore on same file**      | One DB file; smaller change | Remap logic; must run after import             |
| **2 — Second SQLite file for learned state** | Clear lifecycle             | New path config, attach complexity, migrations |

**Decision:** Option 1 for M02. Option 2 remains rank 22 documentation follow-up.

## Components

| Unit                        | Change                                            |
| --------------------------- | ------------------------------------------------- |
| `runSourceImportSync`       | `app_sync.util.ts` — orchestrate snapshot/restore |
| `frecency_snapshot.util.ts` | new — read tables before unlink                   |
| `frecency_restore.util.ts`  | new — write after import + `rebuildFts` if needed |
| `ImportService`             | unchanged contract; may expose `dbPath` after run |
| `schema.ts`                 | document which tables are learned vs projection   |

## Orphan cleanup

After restore, `DELETE FROM entry_frecency WHERE entry_id NOT IN (SELECT id FROM knowledges)`.

## Testing strategy

- Temp directory + real `ImportService` on minimal YAML fixture.
- Visit recording via existing repository APIs or direct insert.
- Assert row counts and sort key field before/after sync.

## Non-goals in this design

- Preserving in-flight `listCache` — `invalidateListCache` stays.
- Changing progress events.
