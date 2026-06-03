<!-- markdownlint-disable-file -->

# Sync frecency preserve

**Feature Branch**: `003-sync-frecency-preserve`
**Release**: v0.10.0
**Status**: Draft

**Input**: When I sync, I want sources in sync and my frecency/usage to stay the same

## Introduction

kb keeps two kinds of catalog state:

1. **Source content** — entries, tags, bindings, and metadata defined in YAML
   on disk. Sync rebuilds the local catalog from these files so the app reflects
   what is on disk.
2. **Learned usage** — how often the user opens entries and uses keyboard
   shortcuts. This state is accumulated locally from day-to-day use and is **not**
   stored in YAML.

Today, a full sync rebuilds the catalog by replacing the local database. That
process correctly refreshes source content but **discards learned usage**, so
list ranking and shortcut ordering reset as if the user were new.

**Goal:** Full source sync SHALL rebuild YAML-derived catalog content while
**preserving** learned entry and binding usage (frecency) for items that still
exist after import.

**User value:** After editing YAML sources and syncing, the user sees updated
content **and** keeps personalized ranking — frequently used entries stay near
the top and shortcut preferences remain intact.

## Clarifications

### Session 2026-06-03

- Q: If full source sync fails (bad YAML, import error), what happens to learned
  entry/binding usage? → A: **Partial apply (Option D)** — keep whatever catalog
  content the import reached before failure; restore entry and binding usage from
  the pre-sync snapshot so list ranking and shortcut habits are not lost.
- Q: If I remove something from my source files and sync, what should happen? →
  A: **Gone is gone (Option A)** — the item disappears from the app and no
  longer affects what I see or how things are ordered.
- Q: When I add something new to my files and sync, how should it rank? → A:
  **Start fresh (Option A, for this increment)** — new items appear but do not
  jump ahead of things I use often until I open them. *Product owner may revisit
  new-item ranking in a future increment.*

## Out of scope

- Changing frecency algorithm weights or decay rules (core domain).
- Incremental or delta sync (only full rebuild from sources directory).
- Persisting learned state in YAML or a separate durable database file (this
  increment uses snapshot/restore around rebuild).
- Migrating frecency when an entry’s stable identity changes across YAML edits
  (e.g. title rename without id change is in scope only when the entry id
  survives import).

## Glossary

| Term                        | Meaning                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------- |
| **Source sync**             | User-triggered full rebuild of the catalog from the configured sources directory        |
| **Projection tables**       | Catalog tables rebuildable from YAML (`knowledges`, search index, bindings index, etc.) |
| **Learned tables**          | Local-only usage state (`entry_frecency`, `binding_frecency`)                           |
| **Entry frecency**          | Visit counts and scores that influence list sort order                                  |
| **Binding frecency**        | Usage scores for keyboard shortcut bindings                                             |
| **Surviving entry/binding** | An item still present in the catalog after import completes                             |

---

## REQUIREMENT SF-1: Entry usage survives sync

**User story:** As a user who relies on list ranking by recent use, I want my
entry visit history to remain after I sync updated YAML sources, so that entries
I use often stay easy to reach.

### Acceptance criteria

1. WHEN the user has recorded entry visits and performs a full source sync, THEN
   list sort order for surviving entries SHALL match pre-sync relative ranking.
   - **Measure:** Integration test: seed visits → sync → assert sort order
     unchanged for surviving ids.
   - **Evidence:** `bun test src/shell/app/lib/app_sync_frecency.spec.ts`

2. WHEN the user removes an entry from their source files and syncs, THEN that
   entry SHALL no longer appear in the app and SHALL no longer affect list order.
   - **Measure:** Integration test: visit entry → remove from sources → sync →
     entry absent from list; sort among remaining entries unchanged per AC1.
   - **Evidence:** `bun test src/shell/app/lib/app_sync_frecency.spec.ts`

3. WHEN the user adds a new entry to their source files and syncs, THEN that
   entry SHALL appear in the app without jumping ahead of items they use often,
   until they open it at least once.
   - **Measure:** Integration test: add new entry in sources → sync → assert
     new entry ranks below frequently used entries until first visit.
   - **Evidence:** `bun test src/shell/app/lib/app_sync_frecency.spec.ts`

---

## REQUIREMENT SF-2: Binding usage survives sync

**User story:** As a user of keyboard shortcuts, I want binding usage counts to
survive catalog rebuild, so shortcut ranking reflects my habits after sync.

### Acceptance criteria

1. WHEN binding visits exist before sync, THEN binding frecency rows SHALL
   persist after sync for bindings still present post-import.
   - **Measure:** Integration test: record binding visit → sync → assert score
     unchanged for surviving binding id.
   - **Evidence:** `bun test src/shell/app/lib/app_sync_frecency.spec.ts`

2. WHEN the user removes a shortcut from their source files and syncs, THEN that
   shortcut SHALL no longer be available and SHALL no longer affect shortcut
   ordering.
   - **Measure:** Integration test: use shortcut → remove from sources → sync →
     shortcut absent; ordering among remaining shortcuts unchanged per AC1.
   - **Evidence:** `bun test src/shell/app/lib/app_sync_frecency.spec.ts`

---

## REQUIREMENT SF-3: Source sync remains trustworthy

**User story:** As a user, I need sync to finish reliably and reflect my YAML
sources, so I can trust that catalog content matches disk after sync.

### Acceptance criteria

1. WHEN the user triggers full source sync, THEN import SHALL complete with the
   same success/failure semantics as before this feature (files processed,
   errors surfaced, progress reported).
   - **Measure:** Existing sync/import integration tests pass unchanged.
   - **Evidence:** `bun test src/shell/app` (sync-related specs)

2. WHEN sync completes, THEN catalog content SHALL match the current YAML
   sources (updated titles, tags, new entries, removed entries).
   - **Measure:** Integration test: change YAML → sync → assert projection
     reflects changes while frecency preserved per SF-1/SF-2.
   - **Evidence:** `bun test src/shell/app/lib/app_sync_frecency.spec.ts`

3. WHEN sync runs, THEN one sync action SHALL update the list from disk without
   an app restart or a second sync.
   - **Measure:** Manual smoke: trigger sync from UI once after YAML edits; list
     reflects disk in that operation.
   - **Evidence:** `assets/specs/003-sync-frecency-preserve/handoff.md` SF-3 AC3 operator table

4. WHEN full source sync fails before success, THEN the catalog SHALL reflect
   partial import progress AND usage SHALL match the pre-sync snapshot.
   - **Measure:** Integration test: seed visits → partial import then failure →
     assert catalog matches partial import state and frecency matches pre-sync.
   - **Evidence:** `bun test src/shell/app/lib/app_sync_frecency.spec.ts`

---

## E2e declaration

| Requirement | E2e tag               | Scenario (name only)                                |
| ----------- | --------------------- | --------------------------------------------------- |
| SF-1        | `@spec:sync-frecency` | Frequently opened items keep their place after sync |
| SF-2        | —                     | No e2e this increment (integration gate)            |
| SF-3        | —                     | No e2e this increment (integration gate)            |

Gherkin text lives in **`assets/features/e2e/sync_frecency.feature`**. E2e is
**stretch** for this increment; integration tests are the release gate.

## Assumptions

- Full sync continues to delete and rebuild the projection database; learned
  tables are preserved via explicit snapshot/restore, not by skipping rebuild.
- On sync failure, catalog content reflects how far import got; entry and binding
  usage are always restored from the pre-sync snapshot (Option D — partial apply;
  constitution Principle III for learned state).
- Entry and binding ids stable across YAML edits are the join key for frecency
  restoration.
- Removed entries and shortcuts do not linger in the app or influence ordering
  after sync (Clarify 2026-06-03: gone is gone).
- New entries start with neutral ranking until first visit (Clarify 2026-06-03:
  start fresh — **provisional for this increment**; ranking policy for new items
  may be revisited later).

## Open Questions

| #   | Question                                   | Status       | Notes                                                                                                                         |
| --- | ------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | Sync failure + learned usage               | **Resolved** | Clarify 2026-06-03: partial apply — keep catalog at failure point, restore usage (D)                                          |
| 2   | Removed items from source files after sync | **Resolved** | Clarify 2026-06-03: gone is gone (A)                                                                                          |
| 3   | Brand-new items — ranking until first use  | **Resolved** | Clarify 2026-06-03: start fresh (A) — **revisit in future increment** (backlog follow-up when product reopens ranking policy) |
