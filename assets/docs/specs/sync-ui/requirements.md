<!-- markdownlint-disable-file -->
# Phase 11 — Sync UI — Requirements

## INTRODUCTION

Phase 11 delivers visual sync feedback: a progress bar during sync, a completion
toast with counts and errors, and concurrent sync prevention. The underlying sync
pipeline (`ImportService` → RPC push messages) already works — this phase adds
the UI layer.

This phase satisfies V1-2 §5 (progress indicator) and §4 (completion notification).

---

## REQUIREMENT SYNTAX (EARS)

### REQ-SYNC-1: Visual progress bar

**User story:** As a user, I want to see sync progress visually so I know how
long it will take.

1. WHEN sync is in progress, THEN a progress bar SHALL appear below the toolbar,
   filling from 0% to 100% based on `processed/total` from `syncProgress` messages.

2. THE progress bar SHALL show a label like "Processing file 3 of 12" during sync.

3. WHEN sync completes or fails, THEN the progress bar SHALL be removed.

4. THE progress bar SHALL use the Andromeda Void accent color (`#5ecfbe`) for
   the fill with a smooth CSS width transition.

---

### REQ-SYNC-2: Completion toast

**User story:** As a user, I want a notification after sync showing the results.

1. WHEN sync completes, THEN a toast SHALL appear in the bottom-right corner
   showing: "N files processed: X inserted, Y updated" (success) or
   "Sync completed with Z errors" (partial failure).

2. IF there are errors, THEN the toast SHALL include a "View errors (N)" toggle
   that expands an inline scrollable error list showing file paths and messages.

3. THE toast SHALL auto-dismiss after 5 seconds for success and 8 seconds
   for errors. The user MAY dismiss it immediately by clicking the ✕ button.

4. THE toast SHALL slide in with a CSS animation and fade out on dismiss.

---

### REQ-SYNC-3: Concurrent sync prevention

**User story:** As a user, I want the system to prevent me from starting a
second sync while one is already running.

1. WHEN sync is running (`syncing=true`), THEN the sync button SHALL be
   disabled (`disabled` attribute).

2. WHEN sync is running, THEN calling `onSync` again SHALL be a no-op.

3. WHEN sync completes or fails, THEN the sync button SHALL be re-enabled.

---

### REQ-SYNC-4: Sync toast integration

**User story:** As a developer, I want the sync toast state managed cleanly
in the existing stats hook.

1. `useListPageStatsSync` SHALL track a `toastResult` state set on
   `syncComplete` and cleared on dismiss or new sync start.

2. The hook SHALL expose `dismissToast` and `toastResult` to consumers.

3. `SyncToast` SHALL be rendered in `ListPage`/`ListMain` as a sibling
   to the main list area.

---

## OUT OF SCOPE

- Sync progress from non-UI triggers (e.g., auto-sync on file changes)
- Keyboard shortcut for sync
- Sync scheduling or background sync
- Per-file progress details (only aggregate progress)
