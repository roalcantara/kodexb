# Graph Report - src/ + assets/docs/  (2026-05-11)

## Corpus Check
- 229 files · ~91,563 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 978 nodes · 1609 edges · 96 communities (67 shown, 29 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
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

## God Nodes (most connected - your core abstractions)
1. `App` - 30 edges
2. `useListPageShell()` - 12 edges
3. `ImportService` - 11 edges
4. `openDatabase()` - 10 edges
5. `useSettingsPage()` - 9 edges
6. `useListPageData()` - 9 edges
7. `Phase 2 CI Build Packaging Design` - 9 edges
8. `Phase 7 Implementation Plan` - 9 edges
9. `parseBaseEntryFields()` - 8 edges
10. `safeParse()` - 8 edges

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

## Communities (96 total, 29 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (51): SyncEmitter, ConfigLoadErrorDeps, reportConfigLoadErrorAndExit(), exit, logError, showMessageBox, createTempDir(), file (+43 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (37): TASK_VIEW_LABEL, TYPE_FILTER_LABEL, defaultLoadEntry(), defaultOpenExternal(), DetailPage(), DetailPageProps, DetailPanel(), DetailPanelProps (+29 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (37): bridgeFetch(), extractErrorMessage(), extractHeaders(), getConfig(), getListStats(), kbWebviewRpc, readInitBody(), resizeWindow() (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (35): badges, body, bookmark, link, onOpenExternal, tags, task, DetailPageView() (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (24): ListPage(), collectTabOrderedFocusables(), isTabFocusableCandidate(), ListPageFocusRingContext, listPageFocusRingElements(), ListPageFocusRingRefs, chain, els (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (24): DEP_KEYS, DependencyGraph(), DependencyGraphProps, dependencyKeys(), DependencyRow(), review, setup, statusText() (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (27): detail_view.component.tsx, doc.assembler.spec.ts, entry.repository.ts, factories.builder.ts, knowledge.factory.ts, knowledge.schema.ts, rowToKnowledge() Function, rowToParams() Function (+19 more)

### Community 7 - "Community 7"
Cohesion: 0.1
Nodes (15): DEFAULT_ENTRY_ICONS, ENTRY_KEYS, ENTRY_TYPE_SECTIONS, ENTRY_TYPE_VALUES, PATTERNS, SECTION_ENTRY_TYPE_VALUES, TASK_PRIORITY_VALUES, TASK_STATUS_VALUES (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (18): TAG_BRAND_GLYPHS, TAG_BRAND_SVG_BASENAME, EntryRow, EntryRowComponent(), EntryRowProps, bookmarkGithub, btn, img (+10 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (26): pageSize must be 25|50|100|200 constraint, AppService (app.ts) deferred to Phase 5 — heavy @shared/rpc coupling, assembleDoc() integration deferred to Phase 7 — doc column stays empty default, Entry repository — 6 public functions (upsert, rebuildFts, findAll, findById, getDbStats, getTagCounts), Fishery factories for typed test row creation — no drizzle-seed, no YAML in unit tests, Four future columns (doc, task_order, due_date, depends_on) added early to avoid migrations, ImportService.runOnce — glob YAML → parse → validate → transaction → upsert → rebuildFts, SQLite knowledges table DDL with FTS5 virtual table and 3 indexes (+18 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (15): doc, entries, knowledge, NOW, result, deriveId(), a, b (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (18): checkCache, compile(), formatErrors(), makeGuard(), parse(), check, errors, first (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (15): closeDetail(), DetailState, handleDetailKey(), ListArrowNav, ListSelectionLayout, openDetail(), Harness(), onDetailClose (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (12): AppShellHooks, previewImageFromHtml(), stableListCacheKey(), TaskKnowledge, toFindAllOpts(), youtubePreviewImage(), findAll(), FindAllOpts (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (17): BaseEntry, BookmarkEntry, bookmarkEntrySchema, CheatEntry, cheatEntrySchema, CommandEntry, commandEntrySchema, entrySchema (+9 more)

### Community 16 - "Community 16"
Cohesion: 0.21
Nodes (14): buildBookmarkPreamble(), baseEntry, entry, out, extractYouTubeId(), candidates, YOUTUBE_THUMB_JPEG_STEMS, youTubeEmbedUrl() (+6 more)

### Community 17 - "Community 17"
Cohesion: 0.19
Nodes (9): parseMetaFromSource(), makeError(), parseNoteBlock(), parseNoteBlocksFromSource(), nonEmpty, NoteBlock, noteBlockSchema, ParsedSourceBaseFields (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.21
Nodes (13): SECTION_ENTRY_TYPES, e, raw, toEntry(), toEntryWithSourceHint(), parseBaseEntryFields(), parseSourceSection(), SourceRow (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.21
Nodes (14): loadConfig(), resolveConfig(), saveConfig(), configSchema, DEFAULT_CONFIG_BODY, DisplayConfig, PAGE_SIZE_VALUES, PageSize (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (15): all, bookmarks, { db }, [entry], found, idx, knowledge, makeMemoryDb() (+7 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (15): ConfigPatch, KbDesktopRpcSchema, ListOpts, ListStats, OpenDialogOpts, PreviewImageResult, RpcCallParams, RpcCallResponse (+7 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (10): createLogger(), syncLogging(), ConsoleMethod, CreateLoggerOpts, FormattedMessage, Loggers, LogProps, Logs (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.24
Nodes (10): makeError(), parseLinksFromSource(), parseSingleLinkItem(), parseTitledLink(), httpUrlSchema, LinkItem, linkItemSchema, linkMapValueSchema (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (9): ListData, useListPageData(), useListPageFilters(), useListPageRows(), useListPageStatsSync(), ControlledProbe(), Probe(), { rerender } (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.23
Nodes (11): addDays(), countTasksByView(), isDueThisWeek(), isDueToday(), isOverdue(), parseDue(), startOfDay(), TASK_VIEW_MATCH (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.16
Nodes (14): Single atomic commit per foundation phase (3 and 4), Phase 2 CI Build Packaging Design, Phase 3 Core Domain Design, Env-gated macOS codesign and notarize in electrobun.config, Foundation Design, Bun test documentation, @release-it/conventional-changelog, release-it (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.27
Nodes (10): assembleDoc(), assembleNotesDoc(), AssemblyError, buildPreamble(), renderFragment(), renderNoteFragments(), toBase64(), buildCheatPreamble() (+2 more)

### Community 28 - "Community 28"
Cohesion: 0.21
Nodes (10): bookmarkFactory, cheatFactory, commandFactory, envFactory, factories, loadedConfigFactory, rawConfigFactory, taskFactory (+2 more)

### Community 29 - "Community 29"
Cohesion: 0.26
Nodes (4): effectiveListPageSize(), listViewportPageSize(), VirtualListMetrics, VirtualListWindow

### Community 30 - "Community 30"
Cohesion: 0.28
Nodes (9): listPageEmptyFlags(), useListDetailResize(), useListFilterOverlay(), useListPageCmdKeyStub(), useListPageShell(), ListSentinelPaginationArgs, useListSentinelPagination(), useListSurfaceKeyDown() (+1 more)

### Community 31 - "Community 31"
Cohesion: 0.21
Nodes (9): createFactoryFor(), FactoryLike, factories, factoryForLocal, row, FactoryBuildOpts, isFactoryOpts(), OPTION_KEYS (+1 more)

### Community 32 - "Community 32"
Cohesion: 0.18
Nodes (9): app, importedAppFixture(), importer, loadedFixture(), opened, shell, showOpenDialog, sizes (+1 more)

### Community 33 - "Community 33"
Cohesion: 0.27
Nodes (5): parseNotes(), parseNotesFromBlocks(), isNoteLang(), NoteFragment, RawNotes

### Community 34 - "Community 34"
Cohesion: 0.25
Nodes (4): formatBundleError(), ImportResult, ImportService, ParsedSourceBundle

### Community 35 - "Community 35"
Cohesion: 0.2
Nodes (6): call, completes, ElectroviewMock, messageHandlers, progress, rpcCallMock

### Community 36 - "Community 36"
Cohesion: 0.29
Nodes (8): DbStats, findById(), parseJson(), rowToKnowledge(), rowToParams(), upsert(), CREATE_INDEXES_SQL, KnowledgeRow

### Community 37 - "Community 37"
Cohesion: 0.25
Nodes (7): LoadedConfig, app, calls, data, importedAppFixture(), loadedFixture(), rpc

### Community 38 - "Community 38"
Cohesion: 0.31
Nodes (7): blurDescendantsKeepingRoot(), focusListSurface(), b, btn, ref, root, surf

### Community 39 - "Community 39"
Cohesion: 0.31
Nodes (7): DetailLayout, ListArea(), ListAreaProps, ListData, ListSel, useListSurfaceScrollRestore(), useVirtualListWindow()

### Community 40 - "Community 40"
Cohesion: 0.42
Nodes (6): DbHandle, openDatabase(), rebuildFts(), createSeededMemoryDb(), readMinimalFixtureEntries(), seedMinimalFixture()

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (6): parseSourceFile(), [e], entries, knowledge, result, task

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (6): Priority, priorityChecker, prioritySchema, statusChecker, TaskStatus, taskStatusSchema

### Community 43 - "Community 43"
Cohesion: 0.38
Nodes (5): buildTaskPreamble(), baseTask, out, t, TaskKnowledge

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (6): bookmark, cfg, cheat, command, row, task

### Community 45 - "Community 45"
Cohesion: 0.43
Nodes (3): focusSearchInputCaretAt(), ListSearchTypeaheadAction, ListSurfaceKeydownDeps

### Community 46 - "Community 46"
Cohesion: 0.6
Nodes (4): approxEntryKeyLine(), escapeRegex(), nextTopLevelSectionLine(), yaml

### Community 47 - "Community 47"
Cohesion: 0.47
Nodes (4): buildCommandPreamble(), cmd, out, CommandKnowledge

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (3): braceVar, EXPAND_PATH_CASES, mockEnv

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (4): dbPath, { raw }, rows, svc

### Community 50 - "Community 50"
Cohesion: 0.5
Nodes (3): crc32(), r, TABLE

### Community 52 - "Community 52"
Cohesion: 0.5
Nodes (3): r, raw, result

### Community 53 - "Community 53"
Cohesion: 0.83
Nodes (4): kb desktop design, Validators TypeBox migration design, Validators migration requirements, Validators implementation tasks

### Community 54 - "Community 54"
Cohesion: 0.5
Nodes (4): Barrel-only path aliases — no wildcards, explicit named sub-barrels, 5 nested-superset stashes collapsed to single phase-pending stash, Validation boundaries — TypeBox at YAML→core, config→loaded, row→Knowledge, Single atomic feat(data) commit — all Phase 4 work in one commit

## Knowledge Gaps
- **367 isolated node(s):** `MARKDOWN_SUPPORTED_LANGS`, `MarkdownLang`, `EntryKey`, `SectionEntryType`, `ENTRY_TYPE_VALUES` (+362 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `parseSourceFile()` connect `Community 41` to `Community 40`, `Community 18`, `Community 10`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `ImportService` connect `Community 34` to `Community 32`, `Community 37`, `Community 41`, `Community 13`, `Community 49`, `Community 22`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `err` connect `Community 19` to `Community 11`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **What connects `MARKDOWN_SUPPORTED_LANGS`, `MarkdownLang`, `EntryKey` to the rest of the system?**
  _367 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._