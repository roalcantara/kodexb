# Graph Report - src/ + assets/docs/  (2026-05-12)

## Corpus Check
- 239 files · ~101,964 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1071 nodes · 1797 edges · 102 communities (75 shown, 27 thin omitted)
- Extraction: 96% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]

## God Nodes (most connected - your core abstractions)
1. `App` - 33 edges
2. `useListPageShell()` - 14 edges
3. `ImportService` - 11 edges
4. `toEntry()` - 10 edges
5. `openDatabase()` - 10 edges
6. `useSettingsPage()` - 9 edges
7. `useListPageData()` - 9 edges
8. `upsert()` - 9 edges
9. `Phase 2 CI Build Packaging Design` - 9 edges
10. `Phase 7 Implementation Plan` - 9 edges

## Surprising Connections (you probably didn't know these)
- `readMinimalFixtureEntries()` --calls--> `parseSourceFile()`  [INFERRED]
  __tests__/helpers/testing.seed.ts → core/domain/models/entries/parsers/source_document.parser.ts
- `deriveId()` --calls--> `crc32()`  [INFERRED]
  core/domain/models/knowledges/factories/knowledge.factory.ts → shared/utils/crc32.ts
- `bootstrap()` --calls--> `createLogger()`  [INFERRED]
  shell/main/main.ts → shared/logging/console.logger.ts
- `loadedFixture()` --calls--> `createTempDir()`  [INFERRED]
  shell/main/rpc/server.spec.ts → __tests__/helpers/testing.tmp.ts
- `loadedFixture()` --calls--> `factoryFor`  [INFERRED]
  shell/main/rpc/server.spec.ts → __tests__/factories/factories.builder.ts

## Hyperedges (group relationships)
- **Renderer HTML shell → entry → React root** — index_html_renderer_shell, index_ts_renderer_entry, app_tsx_root_mount [INFERRED 0.85]
- **RPC transport architecture — RpcApp, Eden Treaty client, Electrobun host bridge, Preview server** — requirements_rpcapp, requirements_eden_treaty_client, implementation_plan_electrobun_host, implementation_plan_preview_server_parity [INFERRED 0.85]
- **Entry type system — Bookmark, Command, Cheat, Task with YAML fixture representations** — requirements_entry_model, entries_four_entry_types, bookmarks_youtube_notes_pattern, commands_markdown_notes_pattern, cheats_plantuml_notes_pattern, tasks_all_statuses_priorities [INFERRED 0.85]
- **Imperative shell main process entry and FCIS model** — shell_main_electrobun_window, design_fcis_zones, foundation_design_doc [INFERRED 0.78]
- **GitHub Actions review, release, publish pipeline** — workflow_review_yml, workflow_release_yml, workflow_publish_yml [EXTRACTED 1.00]
- **Doc Assembly Pipeline: toKnowledge calls assembleDoc, writes doc field** — requirements_to_knowledge, requirements_assemble_doc, requirements_doc_field [EXTRACTED 1.00]
- **Detail View Implementation Cluster across spec documents** — roadmap_phase_7, requirements_detail_page_view, design_detail_view_component, tasks_detail_view_spec [EXTRACTED 1.00]
- **TypeBox schema/parser split and shared validation helper** — validators_design_decision_pure_schema_boundary, validators_design_decision_typebox_helper, entry_factory_toentry, knowledge_factory_toknowledge [INFERRED 0.82]
- **Data layer substrate — knowledges schema, entry repository, import service, FTS5** — design_knowledges_schema, design_entry_repository_api, design_import_service_flow, requirements_entry_model [INFERRED 0.85]
- **Phase 9 Task Management Full Stack** — task_sheet_modal, rpc_bridge, typebox, task_mutation, sqlite, yaml_write_back [1.0]
- **Core Type Promotion from meta to First-Class** — task_knowledge, due_date_field, task_order_field, dependency_cycle_detection, entry_repository [1.0]
- **Superpowers Gated Development Loop** — superpowers_workflow, kb_quality_gate, phase_9_task_management [1.0]

## Communities (102 total, 27 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (44): DetailLayout, DragDrop, ListArea(), ListAreaProps, ListData, ListSel, ListData, listPageEmptyFlags() (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (42): addDays(), countTasksByView(), isDueThisWeek(), isDueToday(), isOverdue(), parseDue(), startOfDay(), TASK_VIEW_MATCH (+34 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (27): assembleDoc(), assembleNotesDoc(), AssemblyError, buildPreamble(), renderFragment(), renderNoteFragments(), toBase64(), buildCheatPreamble() (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (24): ListPage(), collectTabOrderedFocusables(), isTabFocusableCandidate(), ListPageFocusRingContext, listPageFocusRingElements(), ListPageFocusRingRefs, chain, els (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (23): getConfig(), saveConfig(), showOpenDialog(), defaultRpc, SettingsPage(), SettingsPageProps, baseCfg, browseButtons (+15 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (26): KnowledgeRow, findDependencies(), findDependents(), a, b, bad, bm, c (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (19): TAG_BRAND_GLYPHS, TAG_BRAND_SVG_BASENAME, DragHandlers, EntryRow, EntryRowComponent(), EntryRowProps, bookmarkGithub, btn (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (4): App, deleteById(), maxTaskOrder(), updateTaskOrder()

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (27): detail_view.component.tsx, doc.assembler.spec.ts, entry.repository.ts, factories.builder.ts, knowledge.factory.ts, knowledge.schema.ts, rowToKnowledge() Function, rowToParams() Function (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (15): DbHandle, openDatabase(), rebuildFts(), formatBundleError(), ImportResult, ImportService, ParsedSourceBundle, dbPath (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (26): pageSize must be 25|50|100|200 constraint, AppService (app.ts) deferred to Phase 5 — heavy @shared/rpc coupling, assembleDoc() integration deferred to Phase 7 — doc column stays empty default, Entry repository — 6 public functions (upsert, rebuildFts, findAll, findById, getDbStats, getTagCounts), Fishery factories for typed test row creation — no drizzle-seed, no YAML in unit tests, Four future columns (doc, task_order, due_date, depends_on) added early to avoid migrations, ImportService.runOnce — glob YAML → parse → validate → transaction → upsert → rebuildFts, SQLite knowledges table DDL with FTS5 virtual table and 3 indexes (+18 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (20): e, raw, toEntry(), toEntryWithSourceHint(), parseBaseEntryFields(), approxEntryKeyLine(), escapeRegex(), nextTopLevelSectionLine() (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (17): TaskKeyboardDeps, bridgeFetch(), cycleStatus(), deleteTask(), extractErrorMessage(), extractHeaders(), getListStats(), kbWebviewRpc (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (22): configPatchSchema, dirSchema, emptyBodySchema, entryTypeSchema, getEntryParams, idWithDirSchema, idWithReorderDirSchema, listOptsSchema (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (13): TASK_VIEW_LABEL, TYPE_FILTER_LABEL, ENTRY_TYPES, FilterDropdown(), FilterDropdownPanel(), FilterDropdownProps, PanelProps, showTaskSection() (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (18): DEFAULT_ENTRY_ICONS, ENTRY_KEYS, ENTRY_TYPE_SECTIONS, ENTRY_TYPE_VALUES, SECTION_ENTRY_TYPE_VALUES, SECTION_ENTRY_TYPES, TASK_PRIORITY_VALUES, TASK_STATUS_VALUES (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (16): deriveId(), a, b, entry, expected, k, toKnowledge(), parseSourceSection() (+8 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (18): checkCache, compile(), formatErrors(), makeGuard(), parse(), check, errors, first (+10 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (15): closeDetail(), DetailState, handleDetailKey(), ListArrowNav, ListSelectionLayout, openDetail(), Harness(), onDetailClose (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (12): AppShellHooks, previewImageFromHtml(), stableListCacheKey(), SyncEmitter, TaskKnowledge, toFindAllOpts(), youtubePreviewImage(), filterKnowledgeByTaskView() (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (17): getDbStats(), getTagCounts(), all, bookmarks, { db }, [entry], found, idx (+9 more)

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (15): loadConfig(), resolveConfig(), saveConfig(), cfgPath, invalidFixture, configSchema, DEFAULT_CONFIG_BODY, DisplayConfig (+7 more)

### Community 22 - "Community 22"
Cohesion: 0.15
Nodes (19): Circular Dependency Detection, dueDate Field, Entry Repository (DB Row Mapping), KB Quality Gate, KB Implementation Roadmap, Phase 9 — Task Management, Requirement V1-7 — Task Management, SQLite Database (+11 more)

### Community 23 - "Community 23"
Cohesion: 0.21
Nodes (14): buildBookmarkPreamble(), baseEntry, entry, out, extractYouTubeId(), candidates, YOUTUBE_THUMB_JPEG_STEMS, youTubeEmbedUrl() (+6 more)

### Community 24 - "Community 24"
Cohesion: 0.14
Nodes (13): PATTERNS, Elysia + Eden Treaty RPC, nonEmpty, NoteBlock, noteBlockSchema, ParsedSourceBaseFields, sourceBaseEntryRowObjectSchema, SourceRowMin (+5 more)

### Community 25 - "Community 25"
Cohesion: 0.17
Nodes (10): createLogger(), syncLogging(), ConsoleMethod, CreateLoggerOpts, FormattedMessage, Loggers, LogProps, Logs (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (9): defaultLoadEntry(), defaultOpenExternal(), DetailPage(), DetailPageProps, DetailPanel(), DetailPanelProps, aside, btn (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (12): PRIORITY_CYCLE, STATUS_CYCLE, TaskSheetFormState, toDateInputValue(), useTaskSheet(), createTask(), updateTask(), PRIORITY_CLASS (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.24
Nodes (10): makeError(), parseLinksFromSource(), parseSingleLinkItem(), parseTitledLink(), httpUrlSchema, LinkItem, linkItemSchema, linkMapValueSchema (+2 more)

### Community 29 - "Community 29"
Cohesion: 0.16
Nodes (14): Single atomic commit per foundation phase (3 and 4), Phase 2 CI Build Packaging Design, Phase 3 Core Domain Design, Env-gated macOS codesign and notarize in electrobun.config, Foundation Design, Bun test documentation, @release-it/conventional-changelog, release-it (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.31
Nodes (11): bootstrap(), loadWindowState(), loadWindowStateSync(), parseWindowStateJson(), saveWindowState(), bounds, cfg, statePath (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.21
Nodes (10): bookmarkFactory, cheatFactory, commandFactory, envFactory, factories, loadedConfigFactory, rawConfigFactory, taskFactory (+2 more)

### Community 32 - "Community 32"
Cohesion: 0.17
Nodes (10): app, importedAppFixture(), importer, loadedFixture(), opened, shell, showOpenDialog, sizes (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.21
Nodes (9): createFactoryFor(), FactoryLike, factories, factoryForLocal, row, FactoryBuildOpts, isFactoryOpts(), OPTION_KEYS (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.21
Nodes (5): isEntryType(), isEntryTypeSection(), EntryKey, EntryType, SectionEntryType

### Community 35 - "Community 35"
Cohesion: 0.26
Nodes (6): r, raw, result, parseMetaFromSource(), normalizeKnowledgeTag(), parseTagsFromSource()

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (6): doc, entries, knowledge, NOW, result, parseSourceFile()

### Community 37 - "Community 37"
Cohesion: 0.24
Nodes (7): listFilterSummary(), ListMain(), ListMainProps, Toolbar(), ToolbarProps, ListPageShell, cyclePriority()

### Community 38 - "Community 38"
Cohesion: 0.18
Nodes (8): DetailPageViewProps, baseProps, closeBtn, doingEls, entry, highEls, linkBtn, openExternalMock

### Community 39 - "Community 39"
Cohesion: 0.31
Nodes (4): isNoteLang(), makeError(), parseNoteBlock(), parseNoteBlocksFromSource()

### Community 40 - "Community 40"
Cohesion: 0.2
Nodes (7): badges, body, bookmark, link, onOpenExternal, tags, task

### Community 41 - "Community 41"
Cohesion: 0.2
Nodes (6): call, completes, ElectroviewMock, messageHandlers, progress, rpcCallMock

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (9): DbStats, findAll(), FindAllOpts, findById(), parseJson(), rowToKnowledge(), rowToParams(), toFts5MatchQuery() (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.31
Nodes (7): DependencyGraph(), DependencyGraphProps, dependencyKeys(), DependencyRow(), review, setup, statusText()

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (7): createRpcServer(), app, calls, data, importedAppFixture(), loadedFixture(), rpc

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (4): defaultFetchImage(), defaultOpenUrl(), PreviewImage(), PreviewImageProps

### Community 46 - "Community 46"
Cohesion: 0.43
Nodes (7): DetailPageView(), LinkDisplay, LinkItem, linksToDisplay(), primaryUrl(), pushLinksFromObjectRecord(), safeHostname()

### Community 47 - "Community 47"
Cohesion: 0.36
Nodes (5): formatDateString(), formatTime(), MetadataSidebar(), MetadataSidebarProps, task

### Community 48 - "Community 48"
Cohesion: 0.48
Nodes (4): parseNotes(), parseNotesFromBlocks(), NoteFragment, RawNotes

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (5): MdView(), MdViewProps, code, hasLangClass, p

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (5): ConfigLoadErrorDeps, reportConfigLoadErrorAndExit(), exit, logError, showMessageBox

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (4): expandPath(), braceVar, EXPAND_PATH_CASES, mockEnv

### Community 52 - "Community 52"
Cohesion: 0.29
Nodes (6): bookmark, cfg, cheat, command, row, task

### Community 53 - "Community 53"
Cohesion: 0.53
Nodes (4): EntryTypeOption, loadListRows(), ListPageRowsInput, listEntries()

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (5): getListStatsMock, Harness(), listStats, setSyncMessageHandlersMock, syncRpcMock

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (4): parsed, rpc, testing_helpers, rpcErrorContract

### Community 56 - "Community 56"
Cohesion: 0.5
Nodes (3): crc32(), r, TABLE

### Community 57 - "Community 57"
Cohesion: 0.5
Nodes (3): createTempDir(), file, TempDir

### Community 58 - "Community 58"
Cohesion: 0.5
Nodes (4): Bun Runtime, Electrobun, FCIS Architecture, KB Knowledge Base App

### Community 60 - "Community 60"
Cohesion: 0.83
Nodes (4): kb desktop design, Validators TypeBox migration design, Validators migration requirements, Validators implementation tasks

### Community 61 - "Community 61"
Cohesion: 0.5
Nodes (4): Barrel-only path aliases — no wildcards, explicit named sub-barrels, 5 nested-superset stashes collapsed to single phase-pending stash, Validation boundaries — TypeBox at YAML→core, config→loaded, row→Knowledge, Single atomic feat(data) commit — all Phase 4 work in one commit

## Knowledge Gaps
- **399 isolated node(s):** `MARKDOWN_SUPPORTED_LANGS`, `MarkdownLang`, `EntryKey`, `SectionEntryType`, `ENTRY_TYPE_VALUES` (+394 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toKnowledge()` connect `Community 16` to `Community 17`, `Community 2`, `Community 36`, `Community 7`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `App` connect `Community 7` to `Community 32`, `Community 44`, `Community 13`, `Community 19`, `Community 20`, `Community 25`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `ImportService` connect `Community 9` to `Community 32`, `Community 36`, `Community 44`, `Community 19`, `Community 25`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `MARKDOWN_SUPPORTED_LANGS`, `MarkdownLang`, `EntryKey` to the rest of the system?**
  _399 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._