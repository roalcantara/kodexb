<!-- markdownlint-disable-file -->

# Sync frecency persistence — Requirements

**Milestone:** M02 · **Consolidated rank:** 2

## Introduction

**Sync** rebuilds the catalog SQLite database from YAML sources
(`runSourceImportSync` in `src/shell/app/lib/app_sync.util.ts`). It **deletes**
the database file (and WAL/SHM) before import.

The schema also stores **learned local state** not present in YAML:

- `entry_frecency` — list ranking from visits (`src/shell/app/db/schema.ts`)
- `binding_frecency` — shortcut usage

Deleting the whole DB on every sync **wipes personalization**. Users lose
Raycast-style ranking until they revisit entries — contradicting product intent
for frecency features ([`list-frecency-sort`](../../../MILESTONE_01/list-frecency-sort/requirements.md)).

**Goal:** Full source sync SHALL rebuild **YAML-derived projection** while
**preserving** (or migrating) learned frecency tables.

## Out of scope

- Changing frecency algorithm weights (core).
- Incremental / delta sync (ranked out in M01 sync spec).
- Moving frecency to a separate product feature — only persistence class separation.

## Relationship to M01 sync spec

[`sync/requirements.md`](../../../MILESTONE_01/sync/requirements.md) (SY-*)
owns import resilience and completion. This spec adds **`SF-*`** requirements for
**local state durability** during the same `sync` RPC.

## Glossary

| Term                  | Meaning                                                         |
| --------------------- | --------------------------------------------------------------- |
| **Projection tables** | `knowledges`, FTS, bindings index, etc. — rebuildable from YAML |
| **Learned tables**    | `entry_frecency`, `binding_frecency` — not in YAML              |
| **Full sync**         | User-triggered rebuild from sources directory                   |

---

## REQUIREMENT SF-1: Entry frecency survives sync

**User story:** As a user who ranks entries by usage, I want my visit history to
remain after I sync new YAML from disk.

### Acceptance criteria

1. WHEN the user records entry visits, performs full sync, and lists entries
   again, THEN frecency scores used for sort SHALL reflect pre-sync visits for
   entries that still exist after import.
   - **Measure:** Integration test: insert visits → sync → assert `frecency` /
     sort order unchanged for stable entry keys.
   - **Evidence:** `bun test src/shell/app/lib/app_sync_frecency.spec.ts` (new)

2. WHEN sync removes an entry from YAML, THEN frecency row for that entry MAY
   be deleted (orphan cleanup).
   - **Measure:** Test: visit entry A; remove A from YAML; sync; no `entry_frecency`
     row for A’s id.
   - **Evidence:** same spec file

---

## REQUIREMENT SF-2: Binding frecency survives sync

**User story:** As a user of shortcut ranking, I want binding usage counts to
survive catalog rebuild.

### Acceptance criteria

1. WHEN binding visits exist before sync, THEN `binding_frecency` rows SHALL
   persist after sync for bindings still present post-import.
   - **Measure:** Integration test with binding + visit + sync.
   - **Evidence:** `app_sync_frecency.spec.ts` binding case

---

## REQUIREMENT SF-3: Sync still completes

**User story:** As a user, sync must still finish with import result semantics
from SY-* .

### Acceptance criteria

1. WHEN sync runs with preserved frecency path, THEN `RpcImportResult` and
   `syncComplete` behavior SHALL remain compatible with M01 sync spec (no hang,
   terminal completion).
   - **Measure:** Existing `app_sync` / import tests pass; frecency tests use same
     harness.
   - **Evidence:** `bun test src/shell/app` (sync-related)

---

## E2e (stretch)

Scenario `@spec:sync-frecency` optional. M02 exit uses integration tests only.
