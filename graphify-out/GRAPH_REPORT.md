# Graph Report - /Users/roalcantara/Work/bun/kb/src  (2026-05-27)

## Corpus Check
- 377 files · ~75,352 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1671 nodes · 3634 edges · 106 communities (105 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_src|src]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_db|db]]
- [[_COMMUNITY_db|db]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_rpc|rpc]]
- [[_COMMUNITY_actions|actions]]
- [[_COMMUNITY_src|src]]
- [[_COMMUNITY_rpc|rpc]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_lib|lib]]
- [[_COMMUNITY_rpc|rpc]]
- [[_COMMUNITY_db|db]]
- [[_COMMUNITY_src|src]]
- [[_COMMUNITY_app|app]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_factories|factories]]
- [[_COMMUNITY_validation|validation]]
- [[_COMMUNITY_shared|shared]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_schemas|schemas]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_src|src]]
- [[_COMMUNITY_helpers|helpers]]
- [[_COMMUNITY_schemas|schemas]]
- [[_COMMUNITY_detail|detail]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_logging|logging]]
- [[_COMMUNITY_factories|factories]]
- [[_COMMUNITY_window|window]]
- [[_COMMUNITY_main|main]]
- [[_COMMUNITY_frecency|frecency]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_schemas|schemas]]
- [[_COMMUNITY_task|task]]
- [[_COMMUNITY_shared|shared]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_logging|logging]]
- [[_COMMUNITY_src|src]]
- [[_COMMUNITY_parsers|parsers]]
- [[_COMMUNITY_settings|settings]]
- [[_COMMUNITY_task|task]]
- [[_COMMUNITY_detail|detail]]
- [[_COMMUNITY_schemas|schemas]]
- [[_COMMUNITY_actions|actions]]
- [[_COMMUNITY_logging|logging]]
- [[_COMMUNITY_schemas|schemas]]
- [[_COMMUNITY_app|app]]
- [[_COMMUNITY_config|config]]
- [[_COMMUNITY_src|src]]
- [[_COMMUNITY_helpers|helpers]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_db|db]]
- [[_COMMUNITY_detail|detail]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_rpc|rpc]]
- [[_COMMUNITY_settings|settings]]
- [[_COMMUNITY_actions|actions]]
- [[_COMMUNITY_logging|logging]]
- [[_COMMUNITY_logging|logging]]
- [[_COMMUNITY_detail|detail]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_window|window]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_src|src]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_helpers|helpers]]
- [[_COMMUNITY_detail|detail]]
- [[_COMMUNITY_src|src]]
- [[_COMMUNITY_config|config]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_main|main]]
- [[_COMMUNITY_rpc|rpc]]
- [[_COMMUNITY_window|window]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_detail|detail]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_logging|logging]]
- [[_COMMUNITY_types|types]]
- [[_COMMUNITY_detail|detail]]
- [[_COMMUNITY_detail|detail]]
- [[_COMMUNITY_src|src]]
- [[_COMMUNITY_actions|actions]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_parsers|parsers]]
- [[_COMMUNITY_shared|shared]]
- [[_COMMUNITY_shared|shared]]
- [[_COMMUNITY_shared|shared]]
- [[_COMMUNITY_detail|detail]]
- [[_COMMUNITY_entry|entry]]
- [[_COMMUNITY_helpers|helpers]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_shared|shared]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_shared|shared]]
- [[_COMMUNITY_list|list]]
- [[_COMMUNITY_helpers|helpers]]
- [[_COMMUNITY_helpers|helpers]]
- [[_COMMUNITY_list|list]]

## God Nodes (most connected - your core abstractions)
1. `RpcKnowledge` - 50 edges
2. `factoryFor` - 43 edges
3. `App` - 41 edges
4. `Knowledge` - 28 edges
5. `EntryType` - 25 edges
6. `fireAndForget()` - 24 edges
7. `ListStats` - 21 edges
8. `TaskView` - 19 edges
9. `openDatabase()` - 16 edges
10. `findAll()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Harness()` --calls--> `useRecordDetailVisit()`  [INFERRED]
  src/shell/renderer/hooks/list/use_record_detail_visit.hook.spec.tsx → src/shell/renderer/hooks/list/use_record_detail_visit.hook.ts
- `row()` --calls--> `factoryFor`  [EXTRACTED]
  src/core/domain/models/knowledges/copy_text_for_entry.util.spec.ts → src/__tests__/factories/factories.builder.ts
- `taskRow()` --calls--> `factoryFor`  [EXTRACTED]
  src/core/domain/models/knowledges/tags/cooccurrence.util.spec.ts → src/__tests__/factories/factories.builder.ts
- `taskRow()` --calls--> `factoryFor`  [EXTRACTED]
  src/core/domain/models/knowledges/tags/rank_suggested_tags.util.spec.ts → src/__tests__/factories/factories.builder.ts
- `bookmarkEntry()` --calls--> `factoryFor`  [EXTRACTED]
  src/shell/renderer/components/shared/bookmark_entry_icon.component.spec.tsx → src/__tests__/factories/factories.builder.ts

## Communities (106 total, 1 thin omitted)

### Community 0 - "src"
Cohesion: 0.06
Nodes (29): MARKDOWN_SUPPORTED_LANGS, MarkdownLang, isNoteLang(), AppLog, removeTaskFromSource(), parsed, shape, stubLog() (+21 more)

### Community 1 - "list"
Cohesion: 0.10
Nodes (31): appendTagFacetRows(), appendTaskViewFacetRows(), appendTypeFacetRows(), buildFilterRows(), FilterRow, FilterSectionBlock, groupFilterRowsIntoSections(), includeFacetRow() (+23 more)

### Community 2 - "list"
Cohesion: 0.08
Nodes (26): useListPageData(), useListPageFilters(), useListPageRows(), getListStatsMock, getStatsMock, getSyncInfoMock, Harness(), listStats (+18 more)

### Community 3 - "db"
Cohesion: 0.07
Nodes (32): DbHandle, rebuildFts(), all, bookmarks, both, { db }, [entry], found (+24 more)

### Community 4 - "db"
Cohesion: 0.10
Nodes (30): openDatabase(), DbStats, deleteById(), findAll(), findAllRowsFts(), findAllRowsPlain(), findById(), getDbStats() (+22 more)

### Community 5 - "list"
Cohesion: 0.10
Nodes (22): ENTRY_TYPE_VALUES, TASK_VIEW_LABEL, TYPE_FILTER_LABEL, DbRaw, ListStatsFilterInput, CompactFilterSectionList(), filterRowIconBasename(), FilterRowIconKind (+14 more)

### Community 6 - "rpc"
Cohesion: 0.08
Nodes (27): initialModal, UseListPageStatsSyncParams, bridgeFetch(), deleteTask(), extractErrorMessage(), extractHeaders(), getConfig(), getListStats() (+19 more)

### Community 7 - "actions"
Cohesion: 0.16
Nodes (24): buildEntryActionPanel(), libraryActions(), paletteQuitShortcut(), quitAction(), ctxBase, noopDeps, panel, panelFor() (+16 more)

### Community 8 - "src"
Cohesion: 0.11
Nodes (17): ENTRY_TYPE_GLYPH, ENTRY_TYPE_DEFAULT_SVG_BASENAME, TAG_BRAND_GLYPHS, TAG_BRAND_SVG_BASENAME, BookmarkEntryIcon(), BookmarkEntryIconProps, bookmarkEntry(), entry (+9 more)

### Community 9 - "rpc"
Cohesion: 0.12
Nodes (29): configPatchSchema, dirSchema, emptyBodySchema, entryTypeSchema, getEntryParams, getWindowPositionSchema, hideWindowSchema, idWithDirSchema (+21 more)

### Community 10 - "list"
Cohesion: 0.09
Nodes (26): blurDescendantsKeepingRoot(), collectTabOrderedFocusables(), focusListSurface(), focusSearchInputCaretAt(), isTabFocusableCandidate(), ListPageFocusRingContext, listPageFocusRingElements(), ListPageFocusRingRefs (+18 more)

### Community 11 - "list"
Cohesion: 0.08
Nodes (23): sampleListStats(), stats, commands, rows, sections, stats, tagRows, allOption (+15 more)

### Community 12 - "list"
Cohesion: 0.12
Nodes (23): CompactFilterKeyCtx, compactFilterOptionNodes(), CompactFilterRowToggle, dispatchCompactFilterKeyDown(), handleCompactFilterArrowDown(), handleCompactFilterArrowUp(), KEY_HANDLERS, scrollCompactFilterHighlightIntoView() (+15 more)

### Community 13 - "lib"
Cohesion: 0.13
Nodes (14): LoadedConfig, AppShellHooks, WindowPosition, getWindowPositionFor(), hideWindowFor(), openExternalUrl(), openInEditorFor(), pasteInTerminalFor() (+6 more)

### Community 14 - "rpc"
Cohesion: 0.14
Nodes (17): formatBundleError(), ImportResult, ImportService, ParsedSourceBundle, AppLog, SyncEmitHandlers, ConfigPatch, DesktopRpcSchema (+9 more)

### Community 15 - "db"
Cohesion: 0.08
Nodes (22): a, b, bad, bm, c, c1, c2, child (+14 more)

### Community 16 - "src"
Cohesion: 0.14
Nodes (15): entryActionKindFromKeyboardEvent(), entryActionShortcutsAllowed(), EntryActionShortcutsFocusState, keyTargetIsTextField(), entryActionShortcutFromKey(), EntryActionShortcutKind, ResolveCurrentEntryOpts, ViewStateForEntry (+7 more)

### Community 17 - "app"
Cohesion: 0.22
Nodes (3): App, runSourceImportSync(), Knowledge

### Community 18 - "list"
Cohesion: 0.12
Nodes (15): compactFilterPortalBox(), FilterDropdown(), FilterDropdownProps, PanelProps, anchor, box, stats, { unmount } (+7 more)

### Community 19 - "factories"
Cohesion: 0.13
Nodes (17): deriveId(), a, b, entry, expected, k, toKnowledge(), parseSourceSection() (+9 more)

### Community 20 - "validation"
Cohesion: 0.15
Nodes (18): checkCache, compile(), formatErrors(), makeGuard(), parse(), check, errors, first (+10 more)

### Community 21 - "shared"
Cohesion: 0.12
Nodes (14): ListSyncMessageHandlerDeps, listSyncMessageHandlers(), handlers, openModel, refreshList, refreshStats, result, setSyncUi (+6 more)

### Community 22 - "list"
Cohesion: 0.12
Nodes (16): resolveCurrentEntry(), bookmarkRow, commandRow, rows, ListArrowNav, handleViewNavigationKey(), navTargetsFor(), tryArrowKeys() (+8 more)

### Community 23 - "schemas"
Cohesion: 0.12
Nodes (18): DEFAULT_ENTRY_ICONS, ENTRY_KEYS, ENTRY_TYPE_SECTIONS, SECTION_ENTRY_TYPES, TASK_PRIORITY_VALUES, TASK_STATUS_VALUES, BookmarkEntry, bookmarkEntrySchema (+10 more)

### Community 24 - "list"
Cohesion: 0.19
Nodes (17): isArrowLeftOrRight(), isModC(), isModL(), keyTargetIsTextField(), runListWindowKeydown(), EscapeHarness(), Harness(), input (+9 more)

### Community 25 - "src"
Cohesion: 0.15
Nodes (8): SECTION_ENTRY_TYPE_VALUES, isEntryType(), isEntryTypeSection(), approxEntryKeyLine(), escapeRegex(), nextTopLevelSectionLine(), yaml, SectionEntryType

### Community 26 - "helpers"
Cohesion: 0.12
Nodes (12): ELECTROVIEW_DEFINE_RPC, ElectroviewMock, getElectrobunMessageHandler(), messageHandlers, RpcCallParams, RpcCallResponse, setRpcCallHandler(), call (+4 more)

### Community 27 - "schemas"
Cohesion: 0.19
Nodes (16): e, raw, toEntry(), toEntryWithSourceHint(), parseBaseEntryFields(), parseTaskDependsOnFromSource(), parseTaskDueDateFromSource(), parseTaskOrderFromSource() (+8 more)

### Community 28 - "detail"
Cohesion: 0.21
Nodes (14): buildBookmarkPreamble(), baseEntry, entry, out, extractYouTubeId(), candidates, YOUTUBE_THUMB_JPEG_STEMS, youTubeEmbedUrl() (+6 more)

### Community 29 - "list"
Cohesion: 0.18
Nodes (13): EntryRow, listFilterSummary(), formatListFooterStatus(), ListMain(), ListMainProps, ListResultsBody(), ListResultsBodyProps, { container } (+5 more)

### Community 30 - "logging"
Cohesion: 0.12
Nodes (8): RequestContext, rpcLog, rpcLogger, CapturedRecord, errors, id, ids, records

### Community 31 - "factories"
Cohesion: 0.14
Nodes (15): bookmarkFactory, cheatFactory, commandFactory, envFactory, factories, knowledgeFtsStrongerFactory, knowledgeFtsWeakerFactory, loadedConfigFactory (+7 more)

### Community 32 - "window"
Cohesion: 0.21
Nodes (13): loadWindowStateFrom(), bounds, result, windowStatePathForConfigFile(), loadWindowStateAsync(), loadWindowStateSync(), parseWindowStateJson(), saveWindowState() (+5 more)

### Community 33 - "main"
Cohesion: 0.11
Nodes (16): MAIN_WINDOW_RENDERER_URL, debug, emit, frame, hooks, mkSyncEmitter, openExternal, openFileDialog (+8 more)

### Community 34 - "frecency"
Cohesion: 0.17
Nodes (13): recordEntryVisit(), rowToState(), left, { raw }, row, stored, bumpFrecency(), FrecencyState (+5 more)

### Community 35 - "list"
Cohesion: 0.18
Nodes (9): ListSentinelPaginationArgs, DepsSnapshot, handleCycleKey(), handleReorderKey(), TaskKeyboardDeps, cyclePriority(), cycleStatus(), reorderTask() (+1 more)

### Community 36 - "schemas"
Cohesion: 0.18
Nodes (10): nonEmpty, NoteBlock, noteBlockSchema, ParsedSourceBaseFields, httpUrlSchema, LinkItem, linkItemSchema, linkMapValueSchema (+2 more)

### Community 37 - "task"
Cohesion: 0.15
Nodes (12): PRIORITY_CYCLE, STATUS_CYCLE, TaskSheetFormState, toDateInputValue(), useTaskSheet(), createTask(), updateTask(), PRIORITY_CLASS (+4 more)

### Community 38 - "shared"
Cohesion: 0.24
Nodes (13): BadgeAccessoryComponent(), BadgeAccessoryProps, bookmarkPill(), cheatPill(), commandPill(), formatDueShort(), PRIORITY_CLASS, STATUS_CLASS (+5 more)

### Community 39 - "list"
Cohesion: 0.15
Nodes (9): defaultLoadEntry(), defaultOpenExternal(), DetailPage(), DetailPageProps, DetailPanel(), DetailPanelProps, aside, btn (+1 more)

### Community 40 - "logging"
Cohesion: 0.19
Nodes (7): rpcCommonPlugins, rpcErrorContract, echoSchema, parsed, parsed, result, rpc

### Community 41 - "src"
Cohesion: 0.23
Nodes (5): fetchPreviewImageFromUrl(), isWebUrl(), previewImageFromHtml(), youtubePreviewImage(), PreviewImageResult

### Community 42 - "parsers"
Cohesion: 0.20
Nodes (9): r, raw, result, parseMetaFromSource(), makeError(), parseNoteBlock(), parseNoteBlocksFromSource(), sourceBaseEntryRowObjectSchema (+1 more)

### Community 43 - "settings"
Cohesion: 0.16
Nodes (12): defaultRpc, formatBytes(), SettingsPage(), SettingsPageProps, baseCfg, baseStats, browseButtons, onConfigSaved (+4 more)

### Community 44 - "task"
Cohesion: 0.30
Nodes (10): isDueThisWeek(), isDueToday(), TASK_VIEW_MATCH, isActionablePlaceholder(), TaskKnowledge, isOverdue(), addDays(), parseDue() (+2 more)

### Community 45 - "detail"
Cohesion: 0.16
Nodes (12): DetailPageViewProps, baseProps, closeBtn, doingEls, entry, highEls, linkBtn, makeBookmark() (+4 more)

### Community 46 - "schemas"
Cohesion: 0.19
Nodes (11): buildCommandPreamble(), cmd, out, bookmarkKnowledgeSchema, cheatKnowledgeSchema, CommandKnowledge, commandKnowledgeSchema, knowledgeSchema (+3 more)

### Community 47 - "actions"
Cohesion: 0.16
Nodes (9): COMMAND_PALETTE_SECTION_LABEL, CommandPalette(), CommandPaletteAction, CommandPaletteProps, CommandPaletteSection, actions, handler, input (+1 more)

### Community 48 - "logging"
Cohesion: 0.29
Nodes (9): isLogVerbosity(), LEVELS, LogtapeLevel, LogVerbosity, LOWEST_BY_VERBOSITY, lowestLogtapeLevelForVerbosity(), parseLogVerbosity(), configureMainLogging() (+1 more)

### Community 49 - "schemas"
Cohesion: 0.21
Nodes (9): PATTERNS, normalizeKnowledgeTag(), parseTagsFromSource(), isValidSourceRowMin(), SourceRowMin, sourceRowMinChecker, sourceRowMinSchema, Tags (+1 more)

### Community 50 - "app"
Cohesion: 0.16
Nodes (12): app, calls, cfg, importedAppFixture(), importer, loadedFixture(), opened, seededFixture() (+4 more)

### Community 51 - "config"
Cohesion: 0.26
Nodes (9): loadConfig(), resolveConfig(), saveConfig(), cfgPath, invalidFixture, parseConfig(), expandPath(), Env (+1 more)

### Community 52 - "src"
Cohesion: 0.26
Nodes (8): countKnowledgeForOpts(), DbRaw, listKnowledgeForOpts(), FindAllOpts, stableListCacheKey(), toFindAllOpts(), ListOpts, filterKnowledgeByTaskView()

### Community 53 - "helpers"
Cohesion: 0.24
Nodes (9): createFactoryFor(), FactoryLike, factories, factoryForLocal, row, FactoryBuildOpts, isFactoryOpts(), OPTION_KEYS (+1 more)

### Community 54 - "list"
Cohesion: 0.23
Nodes (10): expectViewState(), fireArrowKey(), fireTwoRightsExpectSplitThenDetail(), Harness(), onLeaveListUpward, row(), rows, surface (+2 more)

### Community 55 - "db"
Cohesion: 0.24
Nodes (11): CREATE_INDEXES_SQL, EntryFrecencyRow, KnowledgeRow, findDependencies(), findDependents(), initStmts(), maxTaskOrder(), parseDependsOnJson() (+3 more)

### Community 56 - "detail"
Cohesion: 0.19
Nodes (10): DependencyGraph(), DependencyGraphProps, dependencyKeys(), DependencyRow(), review, setup, statusText(), BadgeAccessory (+2 more)

### Community 57 - "list"
Cohesion: 0.28
Nodes (10): listPageEmptyFlags(), useListFilterOverlay(), useListPageShell(), useListSentinelPagination(), useListSurfaceKeyDown(), useListViewportPageSize(), DragDropReorderArgs, useTaskDragDrop() (+2 more)

### Community 58 - "list"
Cohesion: 0.18
Nodes (9): { container }, flushPendingDragSetup(), getWindowPosition, Harness(), mouseDown(), RafQueue, RafTask, setWindowPosition (+1 more)

### Community 59 - "rpc"
Cohesion: 0.21
Nodes (9): createTempDir(), file, TempDir, app, calls, data, importedAppFixture(), loadedFixture() (+1 more)

### Community 60 - "settings"
Cohesion: 0.23
Nodes (10): PAGE_SIZE_OPTIONS, PageSizeOption, useEscapeToClose(), useSettingsFilePickers(), useSettingsFormFields(), useSettingsPage(), UseSettingsPageArgs, useSettingsRpcLoad() (+2 more)

### Community 61 - "actions"
Cohesion: 0.23
Nodes (10): installEntryActionPanelDepsMock(), installRecordEntryVisitMock(), withMockClipboard(), actionCtx, bookmark, actionCtx, HarnessModule, recordEntryVisitFireAndForget (+2 more)

### Community 62 - "logging"
Cohesion: 0.21
Nodes (8): repositoryStmts, resolveEntry(), bag(), SqlEntry, StatementMethod, wrapIterate(), wrapMethod(), WrappableMethod

### Community 63 - "logging"
Cohesion: 0.18
Nodes (8): binds, CapturedRecord, db, errors, firstSqliteProps(), records, sqliteRecords(), stmts

### Community 64 - "detail"
Cohesion: 0.30
Nodes (9): assembleDoc(), assembleNotesDoc(), AssemblyError, buildPreamble(), renderFragment(), renderNoteFragments(), toBase64(), parseNotes() (+1 more)

### Community 65 - "list"
Cohesion: 0.18
Nodes (11): cheat, cmd, copy, ids, libraryAndApp, paletteCallbacks, quit, renderPalette() (+3 more)

### Community 66 - "list"
Cohesion: 0.18
Nodes (11): renderViewNavSurfaceFocused(), flushSearchFocusSchedule(), hide, ladder, nextAnimationFrame(), onEscape, pushToast, search (+3 more)

### Community 67 - "window"
Cohesion: 0.18
Nodes (10): centerBoundsInWorkArea(), clamp(), display, frame(), invalidCases, result, safeFallbackFrame, window (+2 more)

### Community 68 - "list"
Cohesion: 0.25
Nodes (6): ListOverlayHosts(), ListOverlayHostsProps, ListPageShell, ActionToastHost(), ActionToastHostProps, ActionToast

### Community 69 - "src"
Cohesion: 0.27
Nodes (4): RENDERER_BUILD_ENV, configureRendererLogging(), rendererLoggingLowestLevelFromEnv(), rootEl

### Community 70 - "list"
Cohesion: 0.27
Nodes (6): EntryRowFrecencyIndicator(), EntryRowFrecencyIndicatorProps, { container }, frecencyDisplayTier(), recordEntryVisitFireAndForget(), recordEntryVisit()

### Community 71 - "helpers"
Cohesion: 0.31
Nodes (9): KeyCaptureMode, ViewNavigationCopyHarness(), ViewNavigationDesyncHarness(), ViewNavigationHarness(), ViewNavigationSearchHarness(), ViewNavigationVisitHarness(), ViewNavKeyCapture(), useRecordDetailVisit() (+1 more)

### Community 72 - "detail"
Cohesion: 0.20
Nodes (7): badges, body, bookmark, link, onOpenExternal, tags, task

### Community 73 - "src"
Cohesion: 0.24
Nodes (5): executePanelAction(), entryActionRecordsVisit(), RECORDS_VISIT, entryActionPrimaryRowHint(), PRIMARY_HINT

### Community 74 - "config"
Cohesion: 0.22
Nodes (8): configSchema, DEFAULT_CONFIG_BODY, DisplayConfig, PAGE_SIZE_VALUES, PageSize, RawConfig, ResolvedConfig, DEFAULTS

### Community 75 - "list"
Cohesion: 0.27
Nodes (6): rpcBookmarkRow(), viewNavBookmarkRow(), Harness(), recordEntryVisitFireAndForget, { rerender }, row

### Community 76 - "main"
Cohesion: 0.31
Nodes (8): bootstrap(), WebviewRpc, buildBrowserWindowCreateOptions(), createDeferredSyncEmit(), createShellHooks(), createSyncEmitter(), createWebviewRpc(), createRpcServer()

### Community 77 - "rpc"
Cohesion: 0.27
Nodes (9): SyncEmitter, ALLOWED_HEADERS, bridge_error_codes, bridgeRejection(), filterHeaders(), forwardToRpcApp(), RequestHandler, testing_helpers (+1 more)

### Community 78 - "window"
Cohesion: 0.38
Nodes (8): computeInitialFrameFromDisplay(), MainWindowLike, ShellHooksUtils, isFiniteNumber(), isUsableWorkArea(), resolveInitialFrame(), Size, WindowFrame

### Community 79 - "list"
Cohesion: 0.33
Nodes (7): DragHandlers, EntryRowComponent(), EntryRowProps, subtitleLine(), titleLine(), typeChip(), getIcon()

### Community 80 - "detail"
Cohesion: 0.22
Nodes (5): doc, entries, knowledge, NOW, result

### Community 81 - "list"
Cohesion: 0.33
Nodes (6): ListPage(), ListPageFocusRingDeps, list, RingHarness(), search, useListPageFocusRing()

### Community 82 - "logging"
Cohesion: 0.22
Nodes (3): errors, records, templates

### Community 83 - "types"
Cohesion: 0.22
Nodes (8): ConsoleMethod, CreateLoggerOpts, FormattedMessage, Loggers, LogProps, Logs, LogWithProps, PhaseLabel

### Community 84 - "detail"
Cohesion: 0.43
Nodes (7): DetailPageView(), LinkDisplay, LinkItem, linksToDisplay(), primaryUrl(), pushLinksFromObjectRecord(), safeHostname()

### Community 85 - "detail"
Cohesion: 0.36
Nodes (5): formatDateString(), formatTime(), MetadataSidebar(), MetadataSidebarProps, task

### Community 86 - "src"
Cohesion: 0.32
Nodes (3): buildCheatPreamble(), cheatEntry, CheatKnowledge

### Community 87 - "actions"
Cohesion: 0.36
Nodes (6): action(), copyAction(), entryTypeActions(), openEditorAction(), copyTextForEntry(), row()

### Community 88 - "list"
Cohesion: 0.32
Nodes (6): clipboardCopiedToastMessage(), ListFooterStatusInput, previewForClipboardCopiedToast(), inner, long, msg

### Community 89 - "parsers"
Cohesion: 0.50
Nodes (5): makeError(), parseLinksFromSource(), parseSingleLinkItem(), parseTitledLink(), safeParse()

### Community 90 - "shared"
Cohesion: 0.29
Nodes (5): onDismiss, success, withErrors, SyncToast(), SyncToastProps

### Community 91 - "shared"
Cohesion: 0.29
Nodes (4): defaultFetchImage(), defaultOpenUrl(), PreviewImage(), PreviewImageProps

### Community 92 - "shared"
Cohesion: 0.33
Nodes (5): MdView(), MdViewProps, code, hasLangClass, p

### Community 93 - "detail"
Cohesion: 0.38
Nodes (5): buildTaskPreamble(), baseTask, out, t, TaskKnowledge

### Community 94 - "entry"
Cohesion: 0.43
Nodes (5): actionRankForEntry(), PRIMARY_BY_TYPE, primaryActionIdForEntryType(), SECONDARY_BY_TYPE, secondaryActionIdForEntryType()

### Community 95 - "helpers"
Cohesion: 0.33
Nodes (5): ConfigLoadErrorDeps, reportConfigLoadErrorAndExit(), exit, logError, showMessageBox

### Community 96 - "list"
Cohesion: 0.33
Nodes (4): bookmarkGithub, btn, img, taskCompact

### Community 97 - "shared"
Cohesion: 0.33
Nodes (5): bookmarkGithub, bookmarkNoBrand, cheatGit, img, noBrand

### Community 98 - "list"
Cohesion: 0.40
Nodes (4): ListFooter(), ListFooterProps, { container }, keys

### Community 99 - "shared"
Cohesion: 0.40
Nodes (3): bar, SyncProgress, SyncProgressProps

### Community 100 - "list"
Cohesion: 0.33
Nodes (4): ActiveDrag, DragSession, getWindowPosition(), setWindowPosition()

### Community 101 - "helpers"
Cohesion: 0.70
Nodes (3): configureQuietLogtape(), installQuietConsole(), noopLogSink()

### Community 102 - "helpers"
Cohesion: 0.50
Nodes (3): braceVar, EXPAND_PATH_CASES, mockEnv

## Knowledge Gaps
- **577 isolated node(s):** `ENTRY_TYPE_SECTIONS`, `DEFAULT_ENTRY_ICONS`, `raw`, `result`, `r` (+572 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `EntryType` connect `list` to `list`, `db`, `src`, `parsers`, `list`, `list`, `factories`, `src`, `schemas`, `src`, `schemas`, `entry`, `list`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `factoryFor` connect `detail` to `src`, `db`, `db`, `actions`, `src`, `db`, `list`, `helpers`, `list`, `factories`, `window`, `main`, `frecency`, `list`, `app`, `helpers`, `detail`, `rpc`, `actions`, `list`, `window`, `detail`, `list`, `detail`, `actions`, `list`, `shared`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `Knowledge` connect `app` to `detail`, `src`, `db`, `shared`, `task`, `lib`, `schemas`, `rpc`, `detail`, `db`, `list`, `factories`, `db`, `actions`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `ENTRY_TYPE_SECTIONS`, `DEFAULT_ENTRY_ICONS`, `raw` to the rest of the system?**
  _577 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `src` be split into smaller, more focused modules?**
  _Cohesion score 0.060408163265306125 - nodes in this community are weakly interconnected._
- **Should `list` be split into smaller, more focused modules?**
  _Cohesion score 0.09634146341463415 - nodes in this community are weakly interconnected._
- **Should `list` be split into smaller, more focused modules?**
  _Cohesion score 0.08258258258258258 - nodes in this community are weakly interconnected._