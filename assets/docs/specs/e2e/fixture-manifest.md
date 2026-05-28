<!-- markdownlint-disable-file -->
# E2e fixture manifest

Normative seed data for the release e2e harness. Feature files, step
definitions, and quality scoring SHALL treat these names, tags, and ordering as
the contract unless a scenario explicitly mutates fixture state (sync, task CRUD,
settings save).

Implementation lives in `e2e/support/seed_fixture.support.ts` (or equivalent).
The manifest is the single source of truth for Gherkin strings such as
`"Release Bookmark"` and `"regression"`.

## Environment

Browser e2e uses the **test** profile (`NODE_ENV=test`). Development
(`bun dev`) uses `~/.config/kb/…` and MUST NOT share this database. See
`design.md#database-environments-structural-isolation`.

| Variable                 | Purpose                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`               | SHALL be `test` for all `mise run test e2e …` and Playwright e2e runs. Selects the test config profile (T2.4). |
| `APP_CONFIG_PATH`        | Points at the isolated `config.yaml` for the current run (set by harness; override for any profile).           |
| `E2E_PRESERVE_ARTIFACTS` | When set, keep temp config, DB, and sources after a run for debugging.                                         |
| `PORT` / `PREVIEW_PORT`  | Preview server port (default `3456`).                                                                          |

Default page size in the seeded config: **50** (batch fetch size for infinite
scroll, not paginated “pages”). Settings scenarios that change page size to
`25` assert config persistence and list batch behavior, not footer page numbers.

## Source files

All paths are relative to the isolated sources directory created at harness
startup.

| File                    | Entry types | Purpose                                                         |
| ----------------------- | ----------- | --------------------------------------------------------------- |
| `bookmarks/release.yml` | bookmark    | Primary bookmark flows, tag filter, frecency, detail, open/copy |
| `commands/release.yml`  | command     | Command search, primary action, frecency                        |
| `cheats/release.yml`    | cheat       | Detail notes, copy action                                       |
| `tasks/release.yml`     | task        | Task views, CRUD, reorder, dependency visibility                |
| `shortcuts/release.yml` | shortcut    | Overlay, list filter, keymap/chord detail, collision glyphs     |

Optional harness-only files (not part of initial seed; written by Given steps):

| File                   | When created                                               |
| ---------------------- | ---------------------------------------------------------- |
| `bookmarks/synced.yml` | `Given the fixture sources include a new bookmark named …` |
| `sources/invalid.yml`  | `Given the fixture sources include an invalid source file` |

## Entries (initial seed)

### Bookmarks

| Display title     | YAML key / anchor  | Tags                    | Search hooks                  | Notes                                    |
| ----------------- | ------------------ | ----------------------- | ----------------------------- | ---------------------------------------- |
| Release Bookmark  | `Release Bookmark` | `regression`, `release` | `release bookmark`, `release` | URL + notes; primary open/copy scenarios |
| Release Docs Link | secondary bookmark | `release`               | `release`                     | Keeps multi-row search/filter meaningful |

### Commands

| Display title   | Tags                    | Search hooks                  | Shell / notes                                                 |
| --------------- | ----------------------- | ----------------------------- | ------------------------------------------------------------- |
| Release Command | `regression`, `release` | `release`, `terminal command` | Runnable shell snippet in notes (for primary-action feedback) |

### Cheats

| Display title | Tags                    | Search hooks | Notes                                     |
| ------------- | ----------------------- | ------------ | ----------------------------------------- |
| Release Cheat | `regression`, `release` | `release`    | Markdown body for detail + copy scenarios |

### Tasks

| Display title      | Status  | Priority | Due                | Tags      | Task views            |
| ------------------ | ------- | -------- | ------------------ | --------- | --------------------- |
| Release Todo Task  | `todo`  | `mid`    | none               | `release` | `actionable`          |
| Release Doing Task | `doing` | `high`   | today              | `release` | `actionable`, `today` |
| Release Done Task  | `done`  | `urgent` | overdue (relative) | `release` | `overdue`             |

**Dependency:** `Release Done Task` depends on `Release Todo Task` (visible in
detail / task graph assertions).

### Shortcuts (keymaps)

| Entry key (app slug) | Display title    | Tags                    | Bindings (action → chord)                   | Collision notes                          |
| -------------------- | ---------------- | ----------------------- | ------------------------------------------- | ---------------------------------------- |
| `release-macos`      | Release macOS    | `regression`, `release` | `Release Spotlight` → `meta+space` (global) | Hard vs `release-amethyst` on same chord |
| `release-amethyst`   | Release Amethyst | `regression`, `release` | `Release Spotlight` → `meta+space` (global) | Hard collision pair with `release-macos` |
| `release-vscode`     | Release VS Code  | `regression`, `release` | `Release Go To File` → `meta+p` (local)     | Soft advisory with `release-browser`     |
| `release-browser`    | Release Browser  | `release`               | `Release Print` → `meta+p` (local)          | Cross-app advisory with `release-vscode` |

Harness import SHALL denormalise bindings into `entry_bindings` so overlay and
RPC scenarios see collision badges without ad hoc SQL in steps.

**Initial list order (before frecency mutations):** seeded task entries with an
explicit `task_order` rank above non-task entries while all frecency scores are
zero. The detail-visit scenario relies on `Release Docs Link` starting below
`Release Todo Task`; one recorded visit SHALL move the bookmark above that task.

Frecency scenarios SHALL establish any other required ordering through explicit
visits. They SHALL NOT rely on tie-break ordering between zero-frecency entries
without an explicit `task_order`.

## Tag and filter contract

| Filter                 | Expected subset                                                              |
| ---------------------- | ---------------------------------------------------------------------------- |
| Type `bookmark`        | Release Bookmark, Release Docs Link                                          |
| Type `command`         | Release Command                                                              |
| Type `cheat`           | Release Cheat                                                                |
| Type `task`            | all Release * Task rows                                                      |
| Type `shortcut`        | Release macOS, Release Amethyst, Release VS Code, Release Browser            |
| Tag `regression`       | Release Bookmark, Release Command, Release Cheat (not necessarily all tasks) |
| Task view `actionable` | todo + doing tasks                                                           |
| Task view `today`      | Release Doing Task                                                           |
| Task view `overdue`    | Release Done Task                                                            |

## Footer semantics

After list UX changes, smoke assertions use **user-visible footer copy**, not
page indices:

- Unfiltered: `{total} total entries • Showing {visibleBatch}` (e.g. `3,992 total entries • Showing 50`).
- Filtered: footer reports **filtered result count** (exact pattern implemented in
  `FooterReportsFilteredCount` question — see `step-catalog.md`).

Scenarios SHALL NOT assert `Page N of M` unless product copy restores that model.

## Actor memory keys

Screenplay support SHALL use stable recall keys (see `design.md#screenplay-conventions`):

| Key                     | Set by               | Used by                           |
| ----------------------- | -------------------- | --------------------------------- |
| `selectedEntryTitle`    | select/move tasks    | detail, palette, action questions |
| `selectedEntryId`       | select/move tasks    | row highlight assertions          |
| `lastSearchQuery`       | search tasks         | filter + frecency scenarios       |
| `fixtureSourcesPath`    | harness boot         | settings + sync steps             |
| `fixtureDbPath`         | harness boot         | settings steps                    |
| `expectedFrecencyOrder` | Given ordering steps | frecency Then steps               |

## Dynamic mutations (scenario-local)

| Scenario family         | Mutation            | Public assertion surface                          |
| ----------------------- | ------------------- | ------------------------------------------------- |
| Task create/delete/edit | YAML under `tasks/` | `fixture task source includes/does not include …` |
| Settings save/reset     | config YAML on disk | settings UI + list batch size                     |
| Sync new bookmark       | new YAML file       | list includes title; sync completion UI           |
| Sync invalid file       | malformed YAML      | sync error report; valid rows remain              |

Then steps that read YAML or config SHALL assert **paths and content the user
could inspect**, not SQLite internals (Cucumber Then guidance).

## Infinite scroll (P1 extension)

When automated, seed **at least 60** bookmark rows (or lower page size in an
isolated config) so the second batch loads via scroll sentinel. Suggested
scenario (add to `search_and_filter.feature` when implementing):

```gherkin
Scenario: Scrolling loads the next batch of entries
  Given the release e2e fixture includes more entries than one batch
  When I scroll the knowledge list near the prefetch sentinel
  Then the footer shows a higher visible count than the first batch
```

## Traceability

| Manifest section   | Feature files                                           |
| ------------------ | ------------------------------------------------------- |
| Core four types    | `list_navigation.feature`                               |
| Search/filter tags | `search_and_filter.feature`                             |
| Named entries      | `detail_and_actions.feature`, `command_palette.feature` |
| Tasks              | `task_management.feature`                               |
| Config/sync        | `settings_and_sync.feature`                             |
| Order + frecency   | `frecency.feature`                                      |
