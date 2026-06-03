<!-- markdownlint-disable-file -->

# Sync frecency persistence

**Feature Branch**: `001-sync-frecency-persistence`
**Release**: v0.10.0
**Status**: Draft

## Introduction

Sync rebuilds the catalog SQLite database from YAML sources. Learned tables
(`entry_frecency`, `binding_frecency`) must survive full sync.

## Out of scope

- Changing frecency algorithm weights.
- Incremental / delta sync.

## Glossary

| Term                  | Meaning                              |
| --------------------- | ------------------------------------ |
| **Projection tables** | Rebuildable from YAML                |
| **Learned tables**    | `entry_frecency`, `binding_frecency` |

---

## REQUIREMENT SF-1: Entry frecency survives sync

**User story:** As a user who ranks entries by usage, I want visit history to
remain after I sync new YAML from disk.

### Acceptance criteria

1. WHEN the user records entry visits, performs full sync, and lists entries
   again, THEN frecency scores used for sort SHALL reflect pre-sync visits for
   entries that still exist after import.
   - **Measure:** Integration test: insert visits → sync → assert sort unchanged.
   - **Evidence:** `bun test src/shell/app/lib/app_sync_frecency.spec.ts`

2. WHEN sync removes an entry from YAML, THEN frecency row for that entry MAY
   be deleted (orphan cleanup).
   - **Measure:** Test removes entry from YAML; sync; no orphan row.
   - **Evidence:** same spec file

---

## E2e declaration

| Requirement | E2e tag               | Scenario (name only)   |
| ----------- | --------------------- | ---------------------- |
| SF-1        | `@spec:sync-frecency` | Frecency survives sync |

E2e is **stretch** for this increment; integration tests are the release gate.
