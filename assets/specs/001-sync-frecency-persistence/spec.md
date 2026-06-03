<!-- markdownlint-disable-file -->

# Sync frecency persistence — spec

**Feature Branch**: `001-sync-frecency-persistence`
**Release**: v0.10.0
**Status**: Draft

## Introduction

**Sync** rebuilds the catalog SQLite database from YAML sources
(`runSourceImportSync` in `src/shell/app/lib/app_sync.util.ts`). It **deletes**
the database file (and WAL/SHM) before import.

The schema also stores **learned local state** not present in YAML:

- `entry_frecency` — list ranking from visits
- `binding_frecency` — shortcut usage

**Goal:** Full source sync SHALL rebuild **YAML-derived projection** while
**preserving** learned frecency tables.

## Out of scope

- Changing frecency algorithm weights (core).
- Incremental / delta sync.
- Separate durable DB file for learned state (M02 uses snapshot/restore).

## Glossary

| Term                  | Meaning                                                   |
| --------------------- | --------------------------------------------------------- |
| **Projection tables** | `knowledges`, FTS, bindings index — rebuildable from YAML |
| **Learned tables**    | `entry_frecency`, `binding_frecency`                      |
| **Full sync**         | User-triggered rebuild from sources directory             |

---

## REQUIREMENT SF-1: Entry frecency survives sync

**User story:** As a user who ranks entries by usage, I want my visit history to
remain after I sync new YAML from disk.

### Acceptance criteria

1. WHEN the user records entry visits, performs full sync, and lists entries
   again, THEN frecency scores used for sort SHALL reflect pre-sync visits for
   entries that still exist after import.
   - **Measure:** Integration test: insert visits → sync → assert sort unchanged.
   - **Evidence:** `bun test src/shell/app/lib/app_sync_frecency.spec.ts`

2. WHEN sync removes an entry from YAML, THEN frecency row for that entry MAY
   be deleted (orphan cleanup).
   - **Measure:** Test: visit entry A; remove A from YAML; sync; no row for A.
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
from SY-*.

### Acceptance criteria

1. WHEN sync runs with preserved frecency path, THEN `RpcImportResult` and
   `syncComplete` behavior SHALL remain compatible with M01 sync spec.
   - **Measure:** Existing sync/import tests pass with frecency harness.
   - **Evidence:** `bun test src/shell/app` (sync-related)

---

## E2e declaration

| Requirement | E2e tag               | Scenario (name only)   |
| ----------- | --------------------- | ---------------------- |
| SF-1        | `@spec:sync-frecency` | Frecency survives sync |

M02 exit uses integration tests; e2e scenario is stretch (see plan trace table).
