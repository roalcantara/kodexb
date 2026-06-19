<!-- markdownlint-disable-file -->
# E2e step catalog

Normative map from Gherkin phrases to Playwright BDD step definitions and
Screenplay artifacts. Implementors SHALL register every phrase here before
merging step code. T3.3 is blocked until this catalog and the matching step files
stay in sync.

**Cucumber rule:** step text must be unique across `Given`, `When`, and `Then`.
Do not reuse the same phrase under different keywords.

**References:** [Cucumber Gherkin reference](https://cucumber.io/docs/gherkin/reference/), [Screenplay fundamentals](https://serenity-bdd.github.io/docs/screenplay/screenplay_fundamentals), [BDD_GHERKIN_GUIDE.md#screenplay-mapping](../../../guides/BDD_GHERKIN_GUIDE.md#screenplay-mapping).

## Step definition files

| File                                      | Feature domain                           |
| ----------------------------------------- | ---------------------------------------- |
| `e2e/steps/harness.steps.ts`              | Fixture boot, config, sync mutations     |
| `e2e/steps/list_navigation.steps.ts`      | List surface, keyboard nav               |
| `e2e/steps/search_and_filter.steps.ts`    | Search, filters, footer                  |
| `e2e/steps/detail_and_actions.steps.ts`   | Detail panel, actions                    |
| `e2e/steps/command_palette.steps.ts`      | Palette                                  |
| `e2e/steps/task_management.steps.ts`      | Task CRUD                                |
| `e2e/steps/settings_and_sync.steps.ts`    | Settings + import                        |
| `e2e/steps/frecency.steps.ts`             | Ordering + refresh                       |
| `e2e/steps/shortcuts.steps.ts`            | Quick-lookup overlay + keymap detail     |
| `e2e/steps/entry_action_handoff.steps.ts` | Handoff footer, RPC intercept, shortcuts |

## Cucumber expression patterns

| Parameter  | Use                                            |
| ---------- | ---------------------------------------------- |
| `{string}` | Quoted titles, queries, section names          |
| `{word}`   | type names, field names (`status`, `priority`) |
| `{int}`    | page size, counts (if needed)                  |

## Harness steps

| Step                                                         | Keyword | Task / question             | Weak? | Notes                                             |
| ------------------------------------------------------------ | ------- | --------------------------- | ----- | ------------------------------------------------- |
| the app is running with the release e2e fixture              | Given   | `BootReleaseFixture`        | N     | Seeds manifest data; starts preview via webServer |
| the fixture sources include a new bookmark named {string}    | Given   | `WriteFixtureBookmark`      | N     | `@fixture-mutation`; writes YAML before sync      |
| the fixture sources include an invalid source file           | Given   | `WriteInvalidFixtureSource` | N     | Uses `mixed_invalid`-style content                |
| the release e2e fixture includes more entries than one batch | Given   | `SeedLargeListFixture`      | N     | P1 infinite-scroll extension                      |

## List navigation steps

| Step                                      | Keyword | Task / question                        | Weak?                  |
| ----------------------------------------- | ------- | -------------------------------------- | ---------------------- |
| I am viewing the knowledge list           | Given   | `ViewKnowledgeList`                    | N                      |
| I move to the first entry                 | When    | `SelectFirstEntry`                     | N                      |
| I move to the next entry                  | When    | `SelectNextEntry`                      | N                      |
| I open the detail preview                 | When    | `OpenDetailPreview.forSelectedEntry()` | N                      |
| I expand the detail view                  | When    | `ExpandDetailView`                     | N                      |
| I return to the split view                | When    | `ReturnToSplitView`                    | N                      |
| I return to the list view                 | When    | `ReturnToListView`                     | N                      |
| I see a bookmark entry                    | Then    | `EntryList.includesType('bookmark')`   | N                      |
| I see a command entry                     | Then    | `EntryList.includesType('command')`    | N                      |
| I see a cheat entry                       | Then    | `EntryList.includesType('cheat')`      | N                      |
| I see a task entry                        | Then    | `EntryList.includesType('task')`       | N                      |
| the list search is focused                | Then    | `SearchField.isFocused()`              | N                      |
| the list surface is focused               | Then    | `EntryList.surfaceFocused()`           | Listbox `Entries` role |
| no detail panel is visible                | Then    | `DetailPanel.isHidden()`               | N                      |
| the selected row changes                  | Then    | `EntryList.selectedRowChanged()`       | N                      |
| the detail panel shows the selected entry | Then    | `DetailPanel.matchesSelectedEntry()`   | N                      |

## Search and filter steps

| Step                                                         | Keyword | Task / question                      | Weak? |
| ------------------------------------------------------------ | ------- | ------------------------------------ | ----- |
| I search for {string}                                        | When    | `SearchEntries.for(query)`           | N     |
| I see only entries matching {string}                         | Then    | `EntryList.allMatchQuery(query)`     | N     |
| the footer reports the filtered result count                 | Then    | `FooterReportsFilteredCount()`       | N     |
| I open the filter overlay                                    | When    | `OpenFilterOverlay`                  | N     |
| I choose the {string} type filter                            | When    | `ChooseTypeFilter`                   | N     |
| every visible entry has type {string}                        | Then    | `EntryList.allHaveType(type)`        | N     |
| the active filter summary includes {string}                  | Then    | `FilterSummary.includes(type)`       | N     |
| I choose the {string} tag filter                             | When    | `ChooseTagFilter`                    | N     |
| every visible entry matches {string}                         | Then    | `EntryList.allMatchQuery(query)`     | N     |
| every visible entry includes the {string} tag                | Then    | `EntryList.allHaveTag(tag)`          | N     |
| I choose the {string} task view filter                       | When    | `ChooseTaskViewFilter`               | N     |
| every visible task belongs to the {string} task view         | Then    | `EntryList.allTasksInView(view)`     | N     |
| I scroll the knowledge list near the prefetch sentinel       | When    | `ScrollListToPrefetchSentinel`       | N     |
| the footer shows a higher visible count than the first batch | Then    | `FooterShowsIncreasedVisibleCount()` | N     |

## Detail and actions steps

| Step                                                     | Keyword | Task / question                         | Weak? |
| -------------------------------------------------------- | ------- | --------------------------------------- | ----- |
| I select the {string} entry                              | Given   | `SelectEntry.named(title)`              | N     |
| the detail panel shows {string}                          | Then    | `DetailPanel.showsTitle(title)`         | N     |
| the detail panel shows its source                        | Then    | `DetailPanel.showsSource()`             | N     |
| the detail panel shows its tags                          | Then    | `DetailPanel.showsTags()`               | N     |
| the detail panel shows its notes                         | Then    | `DetailPanel.showsNotes()`              | N     |
| I run the primary action                                 | When    | `RunPrimaryAction.forSelectedEntry()`   | N     |
| I see a successful action result for {string}            | Then    | `ActionFeedback.succeededFor(title)`    | N     |
| I copy the selected entry                                | When    | `CopySelectedEntry`                     | N     |
| the clipboard action reports the copied {string} content | Then    | `ActionFeedback.clipboardCopied(title)` | N     |
| I open the selected entry source                         | When    | `OpenSelectedEntrySource`               | N     |
| the source action targets the fixture source file        | Then    | `ActionFeedback.sourceTargetsFixture()` | N     |

## Command palette steps

| Step                                                | Keyword | Task / question                         | Weak? |
| --------------------------------------------------- | ------- | --------------------------------------- | ----- |
| no list row is selected                             | Given   | `ClearListSelection`                    | N     |
| I open the command palette                          | When    | `OpenCommandPalette`                    | N     |
| the palette shows the {string} section              | Then    | `CommandPalette.showsSection(name)`     | N     |
| the palette does not show the {string} section      | Then    | `CommandPalette.hidesSection(name)`     | N     |
| I search palette actions for {string}               | When    | `SearchPaletteActions.for(query)`       | N     |
| every visible palette action matches {string}       | Then    | `CommandPalette.allActionsMatch(query)` | N     |
| I dismiss the command palette                       | When    | `DismissCommandPalette`                 | N     |
| the command palette is closed                       | Then    | `CommandPalette.isClosed()`             | N     |
| the knowledge list is ready for keyboard navigation | Then    | `EntryList.isReadyForKeyboard()`        | N     |

## Task management steps

| Step                                              | Keyword | Task / question                         | Weak? |
| ------------------------------------------------- | ------- | --------------------------------------- | ----- |
| I create a task named {string}                    | When    | `CreateTask.named(name)`                | N     |
| the task list includes {string}                   | Then    | `EntryList.includesTitle(name)`         | N     |
| the fixture task source includes {string}         | Then    | `FixtureSources.taskFileIncludes(text)` | N     |
| I change the task description to {string}         | When    | `EditTaskDescription.to(text)`          | N     |
| I cycle the task {word}                           | When    | `CycleTaskField.named(field)`           | N     |
| the selected task shows the next {word} value     | Then    | `TaskDetail.showsNextFieldValue(field)` | N     |
| I am viewing task entries                         | Given   | `ViewTaskEntriesOnly`                   | N     |
| {string} is below {string}                        | Given   | `EntryOrdering.assertBelow(a, b)`       | N     |
| I move {string} upward                            | When    | `ReorderTask.upward(title)`             | N     |
| {string} appears above {string}                   | Then    | `EntryOrdering.assertAbove(a, b)`       | N     |
| I delete the {string} task                        | When    | `DeleteTask.named(title)`               | N     |
| the task list does not include {string}           | Then    | `EntryList.excludesTitle(name)`         | N     |
| the fixture task source does not include {string} | Then    | `FixtureSources.taskFileExcludes(text)` | N     |

## Settings and sync steps

| Step                                                    | Keyword | Task / question                          | Weak? |
| ------------------------------------------------------- | ------- | ---------------------------------------- | ----- |
| I open settings                                         | When    | `OpenSettings`                           | N     |
| settings shows the fixture sources directory            | Then    | `SettingsPage.showsSourcesPath()`        | N     |
| settings shows the fixture database path                | Then    | `SettingsPage.showsDatabasePath()`       | N     |
| settings shows the configured page size                 | Then    | `SettingsPage.showsPageSize()`           | N     |
| I change the page size to {string}                      | When    | `ChangePageSize.to(value)`               | N     |
| I save settings                                         | When    | `SaveSettings`                           | N     |
| settings reports that changes were saved                | Then    | `SettingsPage.reportsSaved()`            | N     |
| the knowledge list uses page size {string}              | Then    | `EntryList.usesBatchSize(size)`          | N     |
| I reset settings                                        | When    | `ResetSettings`                          | N     |
| settings shows the persisted page size                  | Then    | `SettingsPage.showsPersistedPageSize()`  | N     |
| I run sync                                              | When    | `RunSync` (⌘P → sync in palette)         | N     |
| sync reports completion                                 | Then    | `SyncModal.reportsCompletion()`          | N     |
| the knowledge list includes {string}                    | Then    | `EntryList.includesTitle(title)`         | N     |
| sync reports the invalid file                           | Then    | `SyncModal.reportsInvalidFile()`         | N     |
| the knowledge list still includes valid fixture entries | Then    | `EntryList.includesCoreFixtureEntries()` | N     |
| the knowledge list does not show a Sync toolbar button  | Then    | `shell_chrome.steps.ts`                  | N     |

## Shell chrome steps (`@spec:shell-chrome`)

Normative for `shell-chrome/requirements.md` (legacy archive). Feature:
[`shell_chrome.feature`](../shell_chrome.feature).

| Step                                                   | Keyword | Task / question                         | Weak? |
| ------------------------------------------------------ | ------- | --------------------------------------- | ----- |
| the knowledge list does not show a Sync toolbar button | Then    | Assert no `.cmp-toolbar--quick-actions` | N     |

## Sync resilience steps (`@spec:sync`)

Normative for `sync/requirements.md` (legacy archive). Implement in
`e2e/steps/` when adding `sync_resilience.feature`.

| Step                                                   | Keyword | Task / question                               | Weak? |
| ------------------------------------------------------ | ------- | --------------------------------------------- | ----- |
| the fixture sources include the sync resilience corpus | Given   | `WriteSyncResilienceFixtureSources`           | N     | Copies `src/__tests__/fixtures/sync/*` into isolated sources |
| sync finishes within 60 seconds                        | Then    | `SyncModal.finishesWithinMs(60000)`           | N     | Fails on hang                                                |
| sync modal lists failed file {string}                  | Then    | `SyncModal.listsFailedFile(basename)`         | N     | `ok: false` row visible                                      |
| sync error detail mentions {string}                    | Then    | `SyncModal.errorDetailContains(text)`         | N     | Inspect error or summary                                     |
| sync reports partial import from {string}              | Then    | `SyncModal.fileShowsPartialSuccess(basename)` | N     | `ok: true` with errors in summary                            |
| the knowledge list includes {string} after sync        | Then    | `EntryList.includesTitle(title)`              | N     | Valid row from partial file                                  |

Reuse **Settings and sync** steps `I run sync` and `sync reports completion` where applicable.

## Sync modal error UX steps (`@spec:sync` Phase 7)

Normative for `sync/requirements.md` SY-7 (legacy archive).

| Step                                               | Keyword | Task / question                               | Weak? |
| -------------------------------------------------- | ------- | --------------------------------------------- | ----- |
| sync summary shows at least {int} file with errors | Then    | `SyncModal.showsAtLeastNFilesWithErrors(n)`   | N     |
| sync summary shows file totals                     | Then    | `SyncModal.showsFileTotalsStrip()`            | N     | Verifies processed / imported / with errors present |
| I expand sync errors for file {string}             | When    | `SyncModal.expandErrorsForFile(basename)`     | N     |
| sync error accordion for {string} shows {string}   | Then    | `SyncModal.accordionContains(basename, text)` | N     |
| the first sync error row is visible                | Then    | `SyncModal.firstErrorRowInView()`             | N     |

## Frecency steps

| Step                                               | Keyword | Task / question                                 | Weak? |
| -------------------------------------------------- | ------- | ----------------------------------------------- | ----- |
| I open the detail for {string}                     | When    | `OpenDetailFor.named(title)`                    | N     |
| I refresh the list                                 | When    | `RefreshListOrdering`                           | N     |
| {string} ranks above {string}                      | Then    | `EntryOrdering.ranksAbove(a, b)`                | N     |
| I run the primary action for {string}              | When    | `RunPrimaryAction.for(title)`                   | N     |
| {string} has the highest frecency score            | Given   | `SeedFrecencyLeader(title)`                     | N     |
| the list shows entries matching {string}           | Then    | `EntryList.allMatchQuery(query)`                | N     |
| {string} is not shown unless it matches the search | Then    | `EntryList.excludedUnlessMatches(title, query)` | N     |

### `I refresh the list` semantics

**Not** a browser reload. Implementation SHALL re-navigate to the list surface
(clear search/filters if needed) so frecency order is observable — see
`RefreshListOrdering` task.

## Weak assertion policy

| Tier    | Example                                      | P0 allowed? |
| ------- | -------------------------------------------- | ----------- |
| Strong  | Detail region contains selected title + tags | Yes         |
| Medium  | Footer matches filtered-count pattern        | Yes         |
| Weak    | `.cmp-detail` or container visible only      | **No**      |
| Invalid | SQLite row count, RPC private fields         | **Never**   |

Mark `Weak? = Y` in this catalog only after review; none of the cataloged steps
above should ship as weak for P0.

## Scenario IDs

Metrics registry IDs follow `{feature_file_stem}.{scenario_slug}`:

| Feature                | Scenario                               | ID                                                     |
| ---------------------- | -------------------------------------- | ------------------------------------------------------ |
| `list_navigation`      | Seeded list shows the main entry types | `list_navigation.seeded_list_shows_main_types`         |
| `list_navigation`      | Keyboard navigation cycles…            | `list_navigation.keyboard_cycles_views`                |
| `list_navigation`      | Row selection follows arrow keys…      | `list_navigation.row_selection_in_split_view`          |
| `search_and_filter`    | Search narrows the visible entries     | `search_and_filter.search_narrows_entries`             |
| `search_and_filter`    | Type filters (outline)                 | `search_and_filter.type_filters`                       |
| `search_and_filter`    | Tag filters combine with search        | `search_and_filter.tag_filters_with_search`            |
| `search_and_filter`    | Task view filters (outline)            | `search_and_filter.task_view_filters`                  |
| `detail_and_actions`   | Detail shows metadata…                 | `detail_and_actions.detail_shows_metadata`             |
| `detail_and_actions`   | Primary action (outline)               | `detail_and_actions.primary_action_result`             |
| `detail_and_actions`   | Copy action…                           | `detail_and_actions.copy_action`                       |
| `detail_and_actions`   | Opening source…                        | `detail_and_actions.open_source`                       |
| `command_palette`      | Palette opens with library…            | `command_palette.library_when_unselected`              |
| `command_palette`      | Palette includes entry actions…        | `command_palette.entry_sections_when_selected`         |
| `command_palette`      | Palette search narrows actions         | `command_palette.search_narrows_actions`               |
| `command_palette`      | Palette escape restores list           | `command_palette.escape_restores_list`                 |
| `task_management`      | Create a task…                         | `task_management.create_task`                          |
| `task_management`      | Edit an existing task                  | `task_management.edit_task`                            |
| `task_management`      | Cycle task fields (outline)            | `task_management.cycle_fields`                         |
| `task_management`      | Reorder tasks                          | `task_management.reorder_tasks`                        |
| `task_management`      | Delete a task                          | `task_management.delete_task`                          |
| `settings_and_sync`    | Settings shows active fixture…         | `settings_and_sync.settings_shows_fixture_config`      |
| `settings_and_sync`    | Saving page size refreshes…            | `settings_and_sync.save_page_size`                     |
| `settings_and_sync`    | Reset restores persisted settings      | `settings_and_sync.reset_settings`                     |
| `settings_and_sync`    | Sync imports fixture changes           | `settings_and_sync.sync_imports_changes`               |
| `settings_and_sync`    | Sync reports invalid source…           | `settings_and_sync.sync_invalid_file`                  |
| `frecency`             | Opening detail records…                | `frecency.detail_visit_ranks_entry`                    |
| `frecency`             | Running primary action…                | `frecency.primary_action_ranks_entry`                  |
| `frecency`             | Search relevance constrains frecency   | `frecency.search_constrains_frecency`                  |
| `shortcuts_overlay`    | Quick-lookup opens/closes              | `shortcuts_overlay.open_and_close`                     |
| `shortcuts_overlay`    | Text search finds binding              | `shortcuts_overlay.text_search`                        |
| `shortcuts_overlay`    | Chord search conflicts card            | `shortcuts_overlay.chord_conflicts_card`               |
| `shortcuts_overlay`    | Hard collision warning glyph           | `shortcuts_overlay.hard_collision_glyph`               |
| `shortcuts_overlay`    | Overlay filter modal by app            | `shortcuts_overlay.filter_by_app`                      |
| `shortcuts_list`       | Shortcut type filter                   | `shortcuts_list.type_filter`                           |
| `shortcuts_list`       | Search finds keymap by action          | `shortcuts_list.search_by_action`                      |
| `shortcuts_list`       | Keymap ↔ chord detail navigation       | `shortcuts_list.keymap_chord_navigation`               |
| `shortcuts_import`     | Sync reports hard global collision     | `shortcuts_import.sync_reports_hard_global_collision`  |
| `entry_action_handoff` | Footer shows Open In Browser…          | `entry_action_handoff.footer_bookmark_open_in_browser` |
| `entry_action_handoff` | Footer shows Paste and Run…            | `entry_action_handoff.footer_command_paste_and_run`    |
| `entry_action_handoff` | Footer shows Paste Doc…                | `entry_action_handoff.footer_cheat_paste_doc`          |
| `entry_action_handoff` | Bookmark primary requests…             | `entry_action_handoff.bookmark_open_external_rpc`      |
| `entry_action_handoff` | Command primary requests paste…        | `entry_action_handoff.command_paste_terminal_rpc`      |
| `entry_action_handoff` | Command secondary requests run…        | `entry_action_handoff.command_run_terminal_rpc`        |
| `entry_action_handoff` | Cheat primary requests paste doc…      | `entry_action_handoff.cheat_paste_doc_rpc`             |
| `entry_action_handoff` | Copy Title shortcut…                   | `entry_action_handoff.copy_title_shortcut`             |
| `entry_action_handoff` | Copy Description shortcut…             | `entry_action_handoff.copy_description_shortcut`       |
| `entry_action_handoff` | Open Source shortcut…                  | `entry_action_handoff.open_source_shortcut`            |
| `entry_action_handoff` | Handoff failure shows error…           | `entry_action_handoff.handoff_failure_keeps_list`      |

## Entry action handoff steps (`@spec:entry-action-handoff`)

Normative feature: [`entry_action_handoff.feature`](../entry_action_handoff.feature).
Spec: `entry-action-handoff/requirements.md` (legacy archive).
Fixture: [`fixture-manifest.md#handoff-e2e-entry-action-handoff`](fixture-manifest.md#handoff-e2e-entry-action-handoff).

Implement **`e2e/steps/entry_action_handoff.steps.ts`** only — do **not** change the `.feature` prose unless requirements change.

### Intercept harness

| Step                                    | Keyword | Task / question                  | Notes                                                                                                                                                                  |
| --------------------------------------- | ------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the e2e handoff API intercept is active | Given   | `HandoffIntercept.activate()`    | Playwright `page.route` on `/api/openExternal`, `/api/pasteInTerminal`, `/api/runInTerminal`, `/api/openInEditor`; append bodies to actor memory `handoffInterceptLog` |
| external handoff is stubbed to fail     | Given   | `HandoffIntercept.stubFailure()` | Return HTTP 422 JSON `{ error: 'e2e stub' }` for all handoff routes                                                                                                    |

### Footer affordances

Primary label: `.cmp-footer-primary` button text (trim ↵ hint).
Secondary label: `.cmp-footer-secondary` when rank=secondary is surfaced in footer (Phase 5 renderer — command only).
When secondary is keyboard-only before footer work lands, step MAY assert `data-footer-secondary-label` on `.cmp-footer` until UI ships; prefer visible secondary button.

| Step                                        | Keyword | Task / question                         | Weak? |
| ------------------------------------------- | ------- | --------------------------------------- | ----- |
| the footer primary action is {string}       | Then    | `FooterHandoff.primaryLabelIs(label)`   | N     |
| the footer secondary action is {string}     | Then    | `FooterHandoff.secondaryLabelIs(label)` | N     |
| the footer does not show a secondary action | Then    | `FooterHandoff.hasNoSecondary()`        | N     |

### When — actions and shortcuts

| Step                                                 | Keyword | Task / question                         | Notes                                                              |
| ---------------------------------------------------- | ------- | --------------------------------------- | ------------------------------------------------------------------ |
| I run the secondary action                           | When    | `RunSecondaryAction.forSelectedEntry()` | `Meta+Enter` / `Control+Enter` via `press_shortcut.interaction.ts` |
| I press the copy title shortcut                      | When    | `PressCopyTitleShortcut`                | `Meta+C` / `Control+C` on list focus                               |
| I press the copy description shortcut                | When    | `PressCopyDescriptionShortcut`          | `Meta+Alt+C` / `Control+Alt+C`                                     |
| I press the open source shortcut                     | When    | `PressOpenSourceShortcut`               | `Meta+O` / `Control+O`                                             |
| I run the primary action in the native desktop shell | When    | `@todo` — Electrobun CDP only           | `@native-handoff` scenarios                                        |

Reuse **`I run the primary action`** from `detail_and_actions.steps.ts` (`RunPrimaryAction.forSelectedEntry`).

### Then — RPC assertions

Parse `handoffInterceptLog` entries (method, path, JSON body). Questions SHALL NOT assert SQLite or private hook fields.

| Step                                                                     | Keyword | Task / question                                | Weak? |
| ------------------------------------------------------------------------ | ------- | ---------------------------------------------- | ----- |
| the handoff API receives an open external request for {string}           | Then    | `HandoffApi.receivedOpenExternal(url)`         | N     |
| the handoff API receives a paste in terminal request containing {string} | Then    | `HandoffApi.receivedPasteInTerminal(matching)` | N     |
| the handoff API receives a run in terminal request containing {string}   | Then    | `HandoffApi.receivedRunInTerminal(matching)`   | N     |
| the handoff API receives a paste doc handoff request                     | Then    | `HandoffApi.receivedPasteDoc()`                | N     |
| the handoff API receives an open in editor request                       | Then    | `HandoffApi.receivedOpenInEditor()`            | N     |
| the handoff API received no successful open external response            | Then    | `HandoffApi.noSuccessfulOpenExternal()`        | N     |

Paste-doc MAY map to `/api/pasteInTerminal` with cheat payload or a dedicated route — assert the contract implemented in Phase 4 (design §Handoff registry).

### Then — toasts and surface

| Step                                                 | Keyword | Task / question                                  | Notes                     |
| ---------------------------------------------------- | ------- | ------------------------------------------------ | ------------------------- |
| a success action toast is shown                      | Then    | `ActionToast.isSuccess()`                        | Reuse `.cmp-action-toast` |
| a success action toast is shown for copy title       | Then    | `ActionToast.isSuccessFor('Title copied')`       | Distinct message fragment |
| a success action toast is shown for copy description | Then    | `ActionToast.isSuccessFor('Description copied')` |                           |
| an error action toast is shown                       | Then    | `ActionToast.isError()`                          | Failure stub scenario     |
| the knowledge list surface is visible                | Then    | `EntryList.surfaceVisible()`                     | Listbox `Entries` role    |

### `@native-handoff` (optional)

| Step                         | Keyword | Task / question                          |
| ---------------------------- | ------- | ---------------------------------------- |
| the kb main window is hidden | Then    | `@todo` `NativeShell.mainWindowHidden()` |

Keep `@todo` on native scenarios until desktop harness exists; P1 green set excludes them via tag filter if needed.

## Shortcuts steps (Phase 7)

| Step                                                              | Keyword | Task / question                        | Notes                                                                                               |
| ----------------------------------------------------------------- | ------- | -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| I open the shortcuts quick-lookup overlay                         | When    | `OpenShortcutsOverlay`                 | Platform chord: `Meta+Slash` (darwin) / `Control+Slash` (linux) via `press_shortcut.interaction.ts` |
| I dismiss the shortcuts quick-lookup overlay                      | When    | `DismissShortcutsOverlay`              | `Escape`                                                                                            |
| the shortcuts quick-lookup overlay is open with search focused    | Then    | `ShortcutsOverlay.isOpenWithFocus`     |                                                                                                     |
| the shortcuts quick-lookup overlay is closed                      | Then    | `ShortcutsOverlay.isClosed`            |                                                                                                     |
| I search shortcuts for {string}                                   | When    | `SearchShortcutsText`                  | Text mode                                                                                           |
| I search shortcuts by chord {string}                              | When    | `SearchShortcutsChord`                 | Chord mode input                                                                                    |
| the shortcuts overlay shows a row with action {string}            | Then    | `ShortcutsOverlay.showsAction`         |                                                                                                     |
| the shortcuts overlay shows a conflicts card for {string}         | Then    | `ShortcutsOverlay.showsConflictsCard`  | Variant C                                                                                           |
| the shortcuts overlay lists bindings for {string} and {string}    | Then    | `ShortcutsOverlay.listsAppsOnCard`     |                                                                                                     |
| the shortcuts overlay row {string} shows a hard collision warning | Then    | `ShortcutsOverlay.rowHasHardCollision` | `⚠` glyph                                                                                           |
| I open the shortcuts overlay filter modal                         | When    | `OpenShortcutsOverlayFilter`           | `Meta+K` / `Control+K` while overlay open                                                           |
| I select shortcuts overlay filter app {string}                    | When    | `SelectShortcutsOverlayFilterApp`      | Tab apply inside modal                                                                              |
| every visible shortcuts overlay row belongs to app {string}       | Then    | `ShortcutsOverlay.rowsMatchAppFilter`  |                                                                                                     |
| I open the keymap detail for the selected shortcut entry          | When    | `OpenShortcutKeymapDetail`             | From list/detail                                                                                    |
| I select keymap binding {string}                                  | When    | `SelectKeymapBinding`                  |                                                                                                     |
| I open chord detail for the selected binding                      | When    | `OpenChordDetailForBinding`            | Primary `Enter`                                                                                     |
| the chord detail shows bindings for chord {string}                | Then    | `ChordDetail.showsChord`               |                                                                                                     |
| I navigate back from chord detail to keymap                       | When    | `NavigateBackFromChordDetail`          | `ArrowLeft`                                                                                         |
| the keymap binding {string} is selected                           | Then    | `KeymapDetail.bindingSelected`         |                                                                                                     |
| the list row {string} shows the shortcut entry glyph              | Then    | `ListRow.showsShortcutGlyph`           | `⌨`                                                                                                 |

## Shortcuts import steps (S-10 AC10)

| Step                                                                                           | Keyword | Task / question              | Notes                            |
| ---------------------------------------------------------------------------------------------- | ------- | ---------------------------- | -------------------------------- |
| the fixture sources include a new global shortcut binding that clashes with an existing global | Given   | `WriteClashingGlobalBinding` | Extends harness fixture mutation |
| sync reports a hard collision for the clashing chord                                           | Then    | `SyncReportsHardCollision`   | S-3 AC8; asserts `meta+space`    |

Reuse **Settings and sync** steps `I run sync` and overlay steps from **Shortcuts steps** above.
Feature file: [`shortcuts_import.feature`](../shortcuts_import.feature).

## Step definition shape (required)

```ts
When('I open the detail preview', async ({ actor }) => {
  await actor.attemptsTo(OpenDetailPreview.forSelectedEntry())
})

Then('the detail panel shows the selected entry', async ({ actor }) => {
  await actor.asksWhether(DetailPanel.matchesSelectedEntry())
})
```

Reject combined action+assertion steps (see [BDD_GHERKIN_GUIDE.md#screenplay-mapping](../../../guides/BDD_GHERKIN_GUIDE.md#screenplay-mapping)).
