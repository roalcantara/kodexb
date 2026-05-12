<!-- markdownlint-disable-file -->
# Phase 12 — Stats Panel — Requirements

## INTRODUCTION

Phase 12 delivers a statistics panel showing entry counts by type, total count,
database path, and file size. The panel is a new "Stats" section within the
existing Settings page and auto-refreshes after sync completes.

This phase implements V1-5 from the foundation requirements.

---

## REQUIREMENT SYNTAX (EARS)

### REQ-STAT-1: Entry counts by type

**User story:** As a user, I want to see how many entries of each type exist
in my knowledge base.

1. WHEN the user navigates to the Stats section in Settings, THEN the system
   SHALL display entry counts broken down by type: Bookmark, Command, Cheat, Task.

2. THE display SHALL show the total entry count.

3. `getStats()` SHALL be called once on mount and cached until sync invalidates.

---

### REQ-STAT-2: Database path and size

**User story:** As a user, I want to know where my database is stored and how
large it is.

1. WHEN the user views the Stats section, THEN the system SHALL display the
   full path to the SQLite database file.

2. THE system SHALL display the database file size in human-readable format
   (e.g., "1.2 MB", "340 KB").

3. `App.getStats()` SHALL return `dbPath` (from config) and `dbSize` (from
   `fs.stat`) as part of its response.

---

### REQ-STAT-3: Auto-refresh after sync

**User story:** As a user, I want stats to update automatically after a sync.

1. WHEN a sync completes while the Stats section is visible, THEN the stats
   SHALL refresh automatically within 500 ms of the sync completion push message.

2. The existing `syncComplete` handler in `useListPageStatsSync` already calls
   `refreshStats()` — no new wiring needed.

---

## SUCCESS CRITERIA

- `bun test` passes with 0 failures and 0 skipped tests
- `bun run lint` passes with exit code 0 and zero warnings
- `bun run build` completes successfully
- No files ignored in any linter tool, no linter configuration files modified

---

## OUT OF SCOPE

- Graphical charts or trend lines
- Stats export or sharing
- Historical stats or snapshots
- Per-tag breakdown (already available in `getListStats`)
