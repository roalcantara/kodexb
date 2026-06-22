import { resolveCurrentEntry } from '@core/helpers/entry_action/resolve_current_entry.util'
import { fireAndForget } from '@shared/utils'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { executeEntryAction } from '../../actions/execute.executor'
import { useFilterDropdownStats } from '../../hooks/list/use_filter_dropdown_stats.hook'
import { useListMainEntryKeys } from '../../hooks/list/use_list_main_entry_keys.hook'
import type {
  ListActions,
  ListData,
  ListFilter,
  ListOverlays,
  ListSelection
} from '../../hooks/list/use_list_page_shell.hook'
import { useListPointerSelection } from '../../hooks/list/use_list_pointer_selection.hook'
import { useListSurfaceScrollRestore } from '../../hooks/list/use_list_surface_scroll_restore.hook'
import { useVirtualListWindow } from '../../hooks/list/use_virtual_list_window.hook'
import { useWindowDrag } from '../../hooks/list/use_window_drag.hook'
import { useWindowViewNavKeys } from '../../hooks/list/use_window_view_nav_keys.hook'
import { DetailPage } from '../../pages/detail/detail.page'
import { cyclePriority, cycleStatus, getListStats } from '../../rpc/client'
import { listFilterSummary } from '../../utils/list/list_filters.util'
import { formatListFooterStatus } from '../../utils/list/list_formatters.util'
import { focusListSurface } from '../../utils/list/list_keyboard.util'
import { scheduleDoubleRaf } from '../../utils/list/list_scroll.util'
import { listSentinelSpacers } from '../../utils/list/virtual_list.util'
import { ListFooter } from './footer.component'
import { ListOverlayHosts } from './overlay_hosts.component'
import { ListResultsBody } from './results_body.component'
import { ListSearchFilterChrome } from './search_filter_chrome.component'

const EMPTY_TAG_COUNTS: Readonly<Record<string, number>> = Object.freeze({})

export { EMPTY_TAG_COUNTS }

export type ListMainProps = {
  listData: ListData
  listFilter: ListFilter
  listSelection: ListSelection
  listOverlays: ListOverlays
  listActions: ListActions
  showSettings: boolean
  setShowSettings: (value: boolean | ((prev: boolean) => boolean)) => void
}

const MUTATION_ERROR_DURATION_MS = 5000

function MutationErrorBanner({ error, onClear }: { error: string | null; onClear: () => void }) {
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(onClear, MUTATION_ERROR_DURATION_MS)
    return () => clearTimeout(timer)
  }, [error, onClear])

  if (!error) return null

  return (
    <div className="cmp-list-mutation-error" role="alert">
      {error}
    </div>
  )
}

export function ListMain({
  listData,
  listFilter,
  listSelection,
  listOverlays,
  listActions,
  showSettings,
  setShowSettings
}: ListMainProps) {
  const maxFrecencyScore = useMemo(() => Math.max(0, ...listData.rows.map(row => row.frecencyScore)), [listData.rows])
  const emptySyncButtonRef = useRef<HTMLButtonElement>(null)
  const detailScrollRef = useRef<HTMLDivElement>(null)
  const filterDropdownStats = useFilterDropdownStats(getListStats, {
    filterOpen: listFilter.filterOpen,
    baseStats: listData.stats,
    debouncedSearch: listData.debouncedSearch,
    types: listData.types,
    tags: listData.tags,
    taskView: listData.taskView
  })

  useLayoutEffect(() => {
    if (listActions.flags.emptyDb) {
      emptySyncButtonRef.current?.focus()
    }
  }, [listActions.flags.emptyDb])

  const handleCycleStatus = (id: number) => {
    fireAndForget(cycleStatus(id, 'forward').then(() => listData.refreshList(false)))
  }

  const handleCyclePriority = (id: number) => {
    fireAndForget(cyclePriority(id, 'forward').then(() => listData.refreshList(false)))
  }
  const { detailEntry, viewState } = listSelection

  const handleEntryReturn = useListMainEntryKeys({
    disabled: showSettings || listOverlays.taskSheet.taskSheetVisible || listOverlays.palette.open,
    viewState,
    rows: listData.rows,
    selectedId: listSelection.selectedId,
    detailEntry,
    detailScrollRef,
    actionCtx: listActions.actionCtx,
    entryPanelDeps: listActions.entryPanelDeps
  })

  const footerStatus = formatListFooterStatus({
    matchTotal: listData.matchTotal,
    showing: listData.rows.length,
    pageSize: listData.pageSize,
    loading: listData.loading
  })

  const listPanelClass =
    detailEntry === null
      ? 'cmp-list-panel'
      : viewState === 'split'
        ? 'cmp-list-panel cmp-list-panel--narrow'
        : 'cmp-list-panel cmp-list-panel--hidden'
  const detailPanelClass =
    detailEntry === null ? '' : viewState === 'detail' ? 'cmp-detail cmp-detail--full' : 'cmp-detail'

  useListSurfaceScrollRestore(listActions.refs.listSurfaceRef, detailEntry)

  useEffect(() => {
    if (detailEntry !== null && viewState === 'detail' && listFilter.filterOpen) {
      listFilter.setFilterOpen(false)
    }
  }, [detailEntry, viewState, listFilter.filterOpen, listFilter.setFilterOpen])

  useEffect(() => {
    if (detailEntry) return
    let attempts = 0
    const tryFocus = () => {
      const surface = listActions.refs.listSurfaceRef?.current
      if (!surface) return
      surface.focus({ preventScroll: true })
      if (document.activeElement === surface) return
      if (++attempts < 2) scheduleDoubleRaf(tryFocus)
    }
    scheduleDoubleRaf(tryFocus)
  }, [detailEntry, listActions.refs.listSurfaceRef])

  const onSelectEntry = useCallback(
    (id: number) => {
      listSelection.setSelectedId(id)
      focusListSurface(listActions.refs.listSurfaceRef)
    },
    [listActions.refs.listSurfaceRef, listSelection.setSelectedId]
  )

  const onHoverEntry = useCallback(
    (id: number) => {
      listSelection.setSelectedId(id)
    },
    [listSelection.setSelectedId]
  )

  const listPointerSelectionActive =
    !showSettings &&
    !listOverlays.taskSheet.taskSheetVisible &&
    !listOverlays.palette.open &&
    detailEntry === null &&
    listData.rows.length > 0
  useListPointerSelection({
    scrollRootRef: listActions.refs.listSurfaceRef,
    active: listPointerSelectionActive,
    onHoverEntry
  })

  const selectedIndex = listData.rows.findIndex(e => e.id === listSelection.selectedId)
  const { window: virtualWindow, rowHeight } = useVirtualListWindow(
    listData.rows.length,
    listActions.refs.listSurfaceRef,
    selectedIndex,
    listSelection.selectedId
  )
  const visibleRows = listData.rows.slice(virtualWindow.startIndex, virtualWindow.endIndex)
  const sentinelSpacersRes =
    listData.hasMore && listData.rows.length > 0
      ? listSentinelSpacers({ totalRows: listData.rows.length, rowHeight, virtualWindow })
      : null

  const filterSummary = listFilterSummary(listData.types, listData.tags, listData.taskView)
  const filterActive = listData.taskView !== undefined || listData.types.length > 0 || listData.tags.length > 0
  const filterChipCls = `cmp-filter-chip${filterActive ? ' cmp-filter-chip--active' : ''}`

  const toggleFilter = () => {
    if (listFilter.filterOpen) {
      listFilter.setFilterOpen(false)
    } else {
      listFilter.openFilter()
    }
  }

  const focusMainSearch = useCallback(() => {
    scheduleDoubleRaf(() => listActions.refs.searchInputRef.current?.focus({ preventScroll: true }))
  }, [listActions.refs.searchInputRef])

  const handleGlobalShortcut = useCallback(
    (action: 'open-editor' | 'copy-desc') => {
      const entry = resolveCurrentEntry({
        viewState,
        selectedId: listSelection.selectedId,
        detailEntry,
        rows: listData.rows,
        detailPanelHasFocus: false
      })
      if (!entry) return
      fireAndForget(executeEntryAction(entry, action, { ...listActions.actionCtx, entry }))
    },
    [viewState, listSelection.selectedId, detailEntry, listData.rows, listActions.actionCtx]
  )

  const viewNavKeysDisabled = showSettings || listOverlays.taskSheet.taskSheetVisible || listOverlays.palette.open
  useWindowViewNavKeys({
    disabled: viewNavKeysDisabled,
    skipEscapeCapture: listFilter.filterOpen,
    handleKey: listSelection.handleKey,
    handleModL: listActions.handlers.handleWindowModL,
    handleListArrows: e => {
      listSelection.onListKeyDown(e as unknown as ReactKeyboardEvent<HTMLDivElement>)
    },
    handleEntryReturn,
    handleGlobalShortcut,
    detailScrollRef,
    detailScrollActive: detailEntry !== null
  })

  const powertoysClass = viewState === 'detail' ? 'cmp-app-shell cmp-app-shell--detail-full' : 'cmp-app-shell'

  const { onMouseDown: onDragStripeMouseDown } = useWindowDrag()

  const closeDetailToList = useCallback(() => {
    listSelection.closeToList()
    focusListSurface(listActions.refs.listSurfaceRef)
  }, [listActions.refs.listSurfaceRef, listSelection.closeToList])

  const isFullDetail = detailEntry !== null && viewState === 'detail'
  const showBackWithSearch = detailEntry !== null && viewState === 'split'

  return (
    <>
      <div className={powertoysClass} role="application" aria-label="Knowledge list">
        <div className="cmp-window-drag-stripe" role="presentation" aria-hidden onMouseDown={onDragStripeMouseDown} />
        <ListSearchFilterChrome
          isFullDetail={isFullDetail}
          showBackWithSearch={showBackWithSearch}
          closeDetailToList={closeDetailToList}
          searchInputRef={listActions.refs.searchInputRef}
          search={listData.search}
          onSearchChange={listData.setSearch}
          onSearchArrowDown={listActions.handlers.onSearchArrowDown}
          filterButtonRef={listFilter.filterButtonRef}
          filterChipCls={filterChipCls}
          filterSummary={filterSummary}
          onToggleFilter={toggleFilter}
          filterOpen={listFilter.filterOpen}
          stats={filterDropdownStats ?? listData.stats}
          types={listData.types}
          tags={listData.tags}
          taskView={listData.taskView}
          onFilterChange={listActions.handlers.onFilterChange}
          onFilterClose={() => {
            listFilter.setFilterOpen(false)
            focusMainSearch()
          }}
          pushToast={listActions.pushToast}
          anchorRect={listFilter.anchorRect}
        />

        <div className="cmp-main">
          <div className={listPanelClass}>
            <ListResultsBody
              listSurfaceRef={listActions.refs.listSurfaceRef}
              listSentinelRef={listActions.refs.listSentinelRef}
              selectedId={listSelection.selectedId}
              onKeyDown={listActions.handlers.onListSurfaceKeyDown}
              emptyDb={listActions.flags.emptyDb}
              noResults={listActions.flags.noResults}
              emptyList={listActions.flags.emptyList}
              syncInfo={listData.syncInfo}
              onSync={listData.onSync}
              emptySyncButtonRef={emptySyncButtonRef}
              tagCounts={listData.stats?.tags ?? EMPTY_TAG_COUNTS}
              rows={listData.rows}
              visibleRows={visibleRows}
              virtualWindow={virtualWindow}
              sentinelSpacers={sentinelSpacersRes}
              hasMore={listData.hasMore}
              maxFrecencyScore={maxFrecencyScore}
              onSelectEntry={onSelectEntry}
              onHoverEntry={onHoverEntry}
              dragDrop={listActions.dragDrop}
              onCycleStatus={handleCycleStatus}
              onCyclePriority={handleCyclePriority}
            />
          </div>

          {detailEntry ? (
            <div ref={detailScrollRef} className={detailPanelClass}>
              <DetailPage
                entryId={detailEntry.id}
                allEntries={listData.rows}
                onClose={closeDetailToList}
                onSelectEntry={id => {
                  listSelection.selectDetailEntry(id)
                }}
              />
            </div>
          ) : null}
        </div>

        <MutationErrorBanner error={listActions.mutationError} onClear={listActions.clearMutationError} />
        <ListFooter
          footerStatus={footerStatus}
          isFullDetail={isFullDetail}
          detailEntry={detailEntry}
          closeDetailToList={closeDetailToList}
          viewState={viewState}
          selectedId={listSelection.selectedId}
          rows={listData.rows}
          actionCtx={listActions.actionCtx}
          entryPanelDeps={listActions.entryPanelDeps}
          onOpenPalette={listOverlays.palette.openPalette}
        />
      </div>

      <ListOverlayHosts
        listData={listData}
        listOverlays={listOverlays}
        listActions={listActions}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        focusMainSearch={focusMainSearch}
      />
    </>
  )
}
