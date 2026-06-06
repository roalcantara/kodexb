<!-- markdownlint-disable-file -->

# app — Requirements (Desktop v1 MVP)

## INTRODUCTION

**app** is a native multiplatform desktop knowledge management app built on
[Electrobun](https://blackboard.sh/electrobun/docs/). Sources are human-editable
YAML files; SQLite is a derived, rebuildable index.

app is an Electrobun application that produces a native `.app` (macOS ARM) and
binary (Linux ARM/x86). It ports the KodexB CLI/TUI codebase to a desktop GUI
using **Strategy 1 — Direct Main Process + Typed RPC** (see [design.md](design.md)).

**PHASE 1 (this document):** Desktop UI. Eight features:

| **Feature** | **Summary**                                         |
| ----------- | --------------------------------------------------- |
| `first-run` | First-run setup and platform path resolution        |
| `sync`      | Import YAML sources into SQLite                     |
| `list`      | List and search entries (main window)               |
| `detail`    | View one entry by stable id                         |
| `stats`     | Database statistics panel                           |
| `settings`  | App settings and configuration panel                |
| `task-mgmt` | Create, edit, and manage tasks from the desktop UI  |
| `actions`   | Context-sensitive ⌘K palette and per-type primaries |

---

## OUT OF SCOPE (PHASE 1)

- Shell completion
- Theme switching
- Type-specific list subcommands
- Deep linking / custom URL scheme
- Auto-update delivery
- Windows support (x64/ARM)

---

## REQUIREMENT SYNTAX (EARS)

Acceptance criteria use EARS-style phrasing:

- __WHEN__ _condition_, __THEN__ the system __SHALL__ _behaviour_.
- __IF__ _condition_, __THEN__ the system __SHALL__ _behaviour_ (including errors).

Traceability: each __REQUIREMENT V1-__* block maps to [design.md](design.md),
[roadmap.md](roadmap.md), and test cases in `src/__tests__/` with the same identifier.
Per-feature task breakdowns live in `docs/specs/<feature-slug>/tasks.md` (generated
by the `sdd` skill per phase).

---

## GLOSSARY

- **Entry:** A single knowledge item — Bookmark, Command, Cheat, or Task.
- **Source files:** YAML files under the configured sources directory.
- **Config:** App configuration file; default platform path (see PLATFORM PATHS).
- **Database:** SQLite file; default platform path (see PLATFORM PATHS).
- **Stable id:** `crc32(type + ":" + yamlKey)` — deterministic across rebuilds.
- **Main process:** Electrobun's Bun process; hosts AppService and RPC handlers.
- **Renderer:** BrowserWindow web content; the React UI; communicates via typed RPC.
- **RPC:** Elysia HTTP/IPC server in the main process; renderer calls it via an
   Eden Treaty client (`treaty<RpcApp>`). The `RpcApp` type is the single source
   of truth for the main↔renderer contract.
- **Emitter:** The Elysia RPC response from main process to renderer.
- **Task view:** A named preset filter for tasks (e.g. Actionable, Today, Overdue).
- **Badge accessory:** An inline pill on an entry row indicating status, priority, or due date.
- **Brand icon:** An SVG icon mapped from a tag name via `icons.const.ts`; shown as the entry glyph.
- **⌘K palette:** A keyboard-driven action palette scoped to the focused entry.

---

## PLATFORM PATHS

Resolved at runtime via Electrobun's `app.getPath()`. No hardcoded paths.

| **Platform** | **Config**                  | **Database**               | **Sources**              |
| ------------ | --------------------------- | -------------------------- | ------------------------ |
| macOS        | `~/.config/app/config.yaml` | `~/.config/app/app.sqlite` | `~/.config/app/sources/` |
| Linux        | `~/.config/app/config.yaml` | `~/.config/app/app.sqlite` | `~/.config/app/sources/` |

The `config.yaml` file, SQLite path, and sources directory SHALL be
user-overridable via the Settings panel (V1-6).

---

## WINDOW SIZING STRATEGY

The app opens at **820 × 600 px** (compact — list only). The user can expand it
freely; two responsive breakpoints unlock additional panels:

| **Width** | **Layout**                        | **Detail panel**              |
| --------- | --------------------------------- | ----------------------------- |
| 820 px    | List only (default launch)        | Hidden — ↵ to toggle          |
| ≥ 1050 px | List + Content                    | Slides in (180 ms `ease-out`) |
| ≥ 1300 px | List + Content + Metadata sidebar | Full three-column             |

WHEN the user presses ↵ (or clicks "Toggle Details") and the window is at 820 px,
THEN the system SHALL animate the window to 1200 × 600 px and slide in the detail
panel simultaneously (CSS transition: `width 180ms ease-out, opacity 180ms ease-out`).

---

## PERFORMANCE TARGETS (NFR)

Performance is measured as **UI responsiveness**: elapsed time from window paint
until meaningful content is visible (entries rendered or empty state shown).

Fixtures live under `src/__tests__/fixtures/`. Threshold checks are an optional CI step.

| **Scenario**                         | **p95 threshold** | **Fixture** | **Requirement** |
| ------------------------------------ | ----------------- | ----------- | --------------- |
| Cold app launch → list visible       | < 500 ms          | `minimal`   | V1-1            |
| First-run setup (empty platform dir) | < 1 s             | none        | V1-1            |
| List render on empty DB              | < 200 ms          | none        | V1-3            |
120
3
100
| Detail panel slide-in animation      | 180 ms (fixed)    | none        | V1-4            |
150
| Task create / update round-trip      | < 200 ms          | none        | V1-7            |
| ⌘K palette open                      | < 80 ms           | none        | V1-8            |

---

## REQUIREMENT V1-1: First-Run Setup

**User story:**
As a user, I want the app to set itself up automatically on first launch so that
I don't need to run any terminal commands before using it.

### Acceptance criteria

1. WHEN the app launches for the first time (no config file exists), THEN the
   system SHALL:

   - Resolve platform-appropriate paths for config, database, and sources.
   - Create all required directories.
   - Write a default `config.yaml`.
   - Open the main list window without any user action.
   - **Measure:** first launch completes setup and shows the empty list p95 < 1 s.

2. WHEN the app has already been set up, THEN the system SHALL skip setup and
   open the main list window immediately.

   - **Measure:** cold launch → list visible p95 < 500 ms with fixture `minimal`.

3. IF a config file exists but is invalid, THEN the system SHALL show an error
   dialog identifying the file path and the invalid field, and SHALL NOT crash.

   - **Measure:** fixture `config.invalid.yaml` shows an error dialog; app remains open.

4. WHEN the app is closed and reopened, THEN the system SHALL restore the
   previous window position and size.

---

## REQUIREMENT V1-2: Knowledge Sync (`sync`)

**User story:**
As a user, I want to import YAML sources into the database so that the list and
detail views reflect my latest knowledge files.

### Acceptance criteria

1. WHEN the user triggers a sync (menu action or keyboard shortcut), THEN the
   system SHALL import recursively from the configured sources directory.
2. WHEN the user configures an alternative sources directory in settings, THEN
   the sync SHALL use that directory.
3. WHEN a file fails YAML parsing or TypeBox validation, THEN the system SHALL:

   - Record the error and continue processing remaining files.
   - Show a summary notification listing files with errors.
   - Indicate partial failure (not all entries may be up to date).
   - **Measure:** fixture with one invalid file shows a summary with `errors ≥ 1`.

4. WHEN sync completes successfully, THEN the system SHALL:

   - Upsert entries with stable ids (idempotent across runs).
   - Rebuild the FTS5 virtual table.
   - Refresh the list view automatically.
   - Show a completion notification: files processed, inserted, updated, errors.
   - **Measure:** second sync without file changes produces identical row counts; p95 < 3 s for fixture S.

5. WHILE sync is in progress, THEN the system SHALL show a progress indicator
   in the toolbar and disable the sync action to prevent concurrent syncs.

---

## REQUIREMENT V1-3: List & Search

**User story:** As a user, I want to browse and search all entries in a fast,
always-on list so that I can find knowledge quickly.

### Acceptance criteria

1. WHEN the list view is open, THEN the system SHALL display all entries sorted
   by type (bookmark → command → cheat → task), then alphabetically by key, with
   type glyphs, brand icons (when available), and tags visible.
2. WHEN the user types in the search field, THEN the system SHALL:

   - Perform FTS5 search when text is present.
   - Debounce by 300 ms to avoid querying on every keystroke.
   - Update the list in place without a full re-render.

3. WHEN the user opens the filter dropdown, THEN the system SHALL display three
   grouped sections:

   - **Task Views** — smart presets: Actionable, Today, Overdue, This Week,
      All Pending, All Doing (visible only when Task type is active or selected).
   - **Types** — All / Bookmark / Command / Cheat / Task (radio).
   - **Tags** — multi-select chips (AND semantics); includes a search-within-filter input.

4. WHEN the user selects a Task View preset, THEN results SHALL show only tasks
   matching the preset's criteria:

   - **Actionable** — `status=todo`, no blocking dependencies.
   - **Today** — due today or overdue, `status≠done`.
   - **Overdue** — due date < today, `status≠done`.
   - **This Week** — due within the next 7 days, `status≠done`.
   - **All Pending** — `status=todo`.
   - **All Doing** — `status=doing`.

5. WHEN the user selects a tag filter, THEN results SHALL include only entries
   with **all** selected tags (AND semantics).
6. WHEN the user selects a type filter (Bookmark, Command, Cheat, Task), THEN
   results SHALL be restricted to entries of those types.
7. WHEN rendering each entry row, THEN the system SHALL show badge accessories
   inline after the title according to type:

   - **Bookmark** — `[↗]` when a URL is present.
   - __Command__ — `[>_]` indicator.
   - **Cheat** — `[~]` indicator.
   - **Task** — priority pill (urgent/high/mid/low in distinct colours), status pill
      (todo/doing/done), overdue pill (red) if past due, blocked pill if any blocking
      dependency is unresolved, due-date pill if set.

8. WHEN a brand icon is mapped to the entry's primary tag (via `icons.const.ts`),
   THEN the system SHALL show the brand SVG as the row glyph instead of the default
   type icon.
9. WHEN no entries match the current query and filters, THEN the system SHALL
   show an empty state message with no error.

   - **Measure:** empty DB cold render < 200 ms; FTS on fixture S < 120 ms.

10. WHEN the user scrolls to the bottom of the list, THEN the system SHALL load
   the next page of results (configurable page size: 25 / 50 / 100 / 200;
   default 50 — user preference saved to config).
11. WHEN the user presses Enter or clicks an entry, THEN the system SHALL open
   the detail view for that entry (V1-4).

---

## REQUIREMENT V1-4: Detail View

**User story:** As a user, I want to view the full content of an entry so that
I can read its notes, links, and metadata.

### Acceptance criteria

1. WHEN the detail view opens for an entry, THEN the system SHALL display:

   - **Header:** type glyph (or brand icon), key, type label, tag chips.
   - **Body:** Markdown content from `entry.doc` (pre-assembled at import time).
   - **Links section:** clickable URLs via `rpc.openExternal(url)` (opens default browser).
   - __Task-specific fields:__ priority badge, status pill, due date, `task_order`.

2. WHEN the entry is a Bookmark with a URL, THEN the system SHALL:

   - Attempt to fetch the Open Graph image via `rpc.fetchOgImage(url)` asynchronously.
   - Show a placeholder while loading; display the OG image in the detail header on success.
   - If the URL is a YouTube link, show the video thumbnail and a "▶ Open on YouTube" button.

3. WHEN the entry is a Task with dependencies, THEN the system SHALL display:

   - A **depends-on** list: entries this task is blocked by (clickable → navigates to that entry).
   - A **blocking** list: entries this task blocks (clickable → navigates).
   - Tasks in the dependency lists render with their current status badge.

4. WHEN the window width is ≥ 1300 px, THEN the system SHALL show a metadata
   sidebar (third column) alongside the content panel, listing all fields not in the
   header (tags, source file, created/updated timestamps, dependency links, priority,
   status, due date).
5. WHEN the user presses ↵ (Enter / "Toggle Details") while in the list, THEN the
   system SHALL animate the window from 820 px to 1200 px and slide the detail panel
   in simultaneously. Pressing ↵ again SHALL slide the detail panel out and animate the
   window back to 820 px. The animation duration is 180 ms with `ease-out` easing.
6. WHEN the user presses Escape or clicks the back button in the detail panel, THEN
   the system SHALL return to the list view, preserving scroll position and filters.
7. IF the requested entry id does not exist in the database, THEN the system SHALL
   show an error state in the panel (not a crash or blank screen).

   - **Measure:** random id shows error state; known id renders p95 < 100 ms with fixture S.

8. WHEN the detail view renders a code block inside `entry.doc`, THEN the system
   SHALL apply syntax highlighting appropriate for the note's language tag.

---

## REQUIREMENT V1-5: Stats Panel

**User story:** As a user, I want to see database statistics so that I can
verify my knowledge base is healthy.

### Acceptance criteria

1. WHEN the user opens the stats panel (menu or keyboard shortcut), THEN the
   system SHALL display:

   - Entry counts broken down by type.
   - Total entry count.
   - Database file path and size on disk.
   - **Measure:** after sync of fixture S, counts match known totals; render p95 < 150 ms.

2. WHEN the stats panel is open and a sync completes, THEN the stats SHALL
   refresh automatically.

---

## REQUIREMENT V1-6: Settings

**User story:** As a user, I want to configure paths, preferred apps, and UI
preferences so that app fits into my existing workflow.

### Acceptance criteria

1. WHEN the user opens the settings panel (`Cmd+,` / `Ctrl+,`), THEN the system
   SHALL display four sections: **Paths**, **Apps**, **Display**, and **Advanced**.
2. WHEN the user edits the **Paths** section, THEN the system SHALL allow editing:

   - Config file path (with folder-picker via `rpc.showOpenDialog()`).
   - Database file path.
   - Sources directory.
      Save validates that parent directories are creatable and writes to `config.yaml`.

3. WHEN the user edits the **Apps** section, THEN the system SHALL allow picking:

   - **Terminal app** — used by `rpc.pasteInTerminal(cmd)` (default: system terminal).
   - **Editor app** — used by `rpc.openInEditor(path)` (default: `$EDITOR` or VS Code).
      Both fields accept a path or app bundle identifier; an app-picker dialog is provided.

4. WHEN the user edits the **Display** section, THEN the system SHALL allow setting:

   - **Page size** — number of entries loaded per page: 25 / 50 / 100 / 200 (default 50).
      Changes take effect immediately without a restart.

5. WHEN the user saves new paths, THEN the system SHALL:

   - Validate that the parent directories are creatable.
   - Write the updated values to `config.yaml`.
   - Reload the app service with the new paths (no restart required for path changes).

6. WHEN the user clicks "Reset to defaults", THEN the system SHALL restore all
   platform-default values in all sections.

---

## REQUIREMENT V1-7: Task Management

**User story:** As a user, I want to create, edit, and manage tasks from the desktop
UI so that I can maintain my task list without editing YAML files directly.

### Acceptance criteria

1. WHEN the user triggers "New Task" (⌘N / Ctrl+N), THEN the system SHALL open a
   task creation sheet with fields: key, description, status (default `todo`), priority
   (default `mid`), due date (optional), tags (multi-select with AI suggestion), and
   depends-on (entry picker, multi-select).
2. WHEN the user saves a new task, THEN the system SHALL:

   - Upsert the entry into SQLite with a stable id.
   - Write the entry back to the originating YAML source file (or create a new one if
      none is configured as the write target).
   - Refresh the list view automatically.

3. WHEN the user triggers "Edit Task" on a task entry, THEN the system SHALL open the
   same task sheet pre-populated with the current values.
4. WHEN the user triggers "Delete Task" (with confirmation), THEN the system SHALL
   remove the entry from SQLite and from the YAML source file.
5. WHEN the user presses the status cycle shortcut (`S`) on a focused task row,
   THEN the system SHALL cycle the status:
   `todo → doing → done → todo` (wraps). The update SHALL persist immediately.
6. WHEN the user presses the priority cycle shortcut (`P`) on a focused task row,
   THEN the system SHALL cycle the priority:
   `low → mid → high → urgent → low` (wraps). The update SHALL persist immediately.
7. WHEN the user reorders a task (drag-and-drop or `Cmd+↑` / `Cmd+↓` shortcut),
   THEN the system SHALL update `task_order` for the affected entries and persist the
   new order immediately.
8. WHEN the user adds a depends-on link that would create a circular dependency,
   THEN the system SHALL reject the link and show an error message. The system SHALL
   NOT traverse more than 3 dependency levels (max depth 3).
9. WHEN a task has blocking dependencies that are not yet `done`, THEN the list row
   SHALL display a `blocked` badge accessory (V1-3 §7) and the detail view SHALL list
   the blocking entries (V1-4 §3).

---

## REQUIREMENT V1-8: Actions (⌘K Palette)

**User story:** As a user, I want a keyboard-driven action palette that offers
context-sensitive actions for the focused entry so that I can act on knowledge without
leaving the keyboard.

### Acceptance criteria

1. WHEN the user presses `⌘K` (macOS) or `Ctrl+K` (Linux), THEN the system SHALL
   open the action palette scoped to the currently focused entry.
2. WHEN the palette is open, THEN the system SHALL display:

   - A **primary action** specific to the entry type:
      - **Bookmark** — "Open URL" (default browser via `rpc.openExternal`).
      - **Command** — "Paste in Terminal" (via `rpc.pasteInTerminal`).
      - **Cheat** — "Copy to Clipboard" (`navigator.clipboard.writeText`).
      - **Task** — "Edit Task" (opens task sheet, V1-7).

   - A **Copy** submenu: Copy Title, Copy Description, Copy Notes, Copy Tags.
   - **Open in Editor** — opens the YAML source file via `rpc.openInEditor`.
   - **Suggest Tags (AI)** — calls `rpc.suggestTags(entryId)`, shows a tag picker
      pre-populated with suggestions; user selects and saves.
   - For tasks: **Cycle Status**, **Cycle Priority** (same as V1-7 §5–6 shortcuts).

3. WHEN the user selects an action from the palette, THEN the system SHALL execute it
   and close the palette.
4. WHEN the user presses Escape while the palette is open, THEN the system SHALL
   close the palette without executing any action.
5. WHEN the palette is open, THEN the user MAY type to filter the action list.

   - **Measure:** palette open < 80 ms.

---

## Appendix A — Comparables and backlog

- **[Zed](https://zed.dev):** fast native app, file-based config — design model reference.
- **[Obsidian](https://obsidian.md):** local-first, YAML frontmatter — closest use-case comparable.
- **[Raycast](https://raycast.com):** keyboard-first quick access — future deep-link / spotlight integration.

**Backlog (Phase 2+):** Auto-update delivery (Electrobun binary diff patches),
tag management panel, bulk export, dry-run sync, shell completion, Windows support,
CEF option for consistent rendering across Linux distros, Spotlight / Raycast deep-link
integration.

---

## Appendix B — CLI parity map

| **KodexB CLI** | **app Desktop (this spec)** | **Status** |
| -------------- | --------------------------- | ---------- |
| `app config`   | Settings panel + first-run  | V1-1, V1-6 |
| `app import`   | Sync action                 | V1-2       |
| `app ls`       | List view                   | V1-3       |
| `app view`     | Detail panel                | V1-4       |
| `app db`       | Stats panel                 | V1-5       |
| `app cache`    | Deferred (Phase 2)          | —          |
| *(new)*        | Task management UI          | V1-7       |
| *(new)*        | ⌘K action palette           | V1-8       |
