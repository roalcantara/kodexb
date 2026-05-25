import { fireAndForget } from '@shared/utils'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFilterDropdownStats } from '../../hooks/list/use_filter_dropdown_stats.hook'
import { useListMainEntryKeys } from '../../hooks/list/use_list_main_entry_keys.hook'
import type { ListPageShell } from '../../hooks/list/use_list_page_shell.hook'
import { useListSurfaceScrollRestore } from '../../hooks/list/use_list_surface_scroll_restore.hook'
import { useVirtualListWindow } from '../../hooks/list/use_virtual_list_window.hook'
import { useWindowViewNavKeys } from '../../hooks/list/use_window_view_nav_keys.hook'
import { DetailPage } from '../../pages/detail/detail.page'
import { cyclePriority, cycleStatus, getListStats } from '../../rpc/client'
import { listFilterSummary } from '../../utils/list/list_filters.util'
import { formatListFooterStatus } from '../../utils/list/list_formatters.util'
import { focusListSurface } from '../../utils/list/list_keyboard.util'
import { scheduleDoubleRaf } from '../../utils/list/list_scroll.util'
import { ListFooter } from './list_footer.component'
import { ListOverlayHosts } from './list_overlay_hosts.component'
import { ListResultsBody } from './list_results_body.component'
import { ListSearchFilterChrome } from './list_search_filter_chrome.component'

export type ListMainProps = {
  p: ListPageShell
  showSettings: boolean
  setShowSettings: (value: boolean | ((prev: boolean) => boolean)) => void
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: shell composition remains tracked in codebase-quality-audit
export function ListMain({ p, showSettings, setShowSettings }: ListMainProps) {
  const maxFrecencyScore = useMemo(() => Math.max(0, ...p.data.rows.map(row => row.frecencyScore)), [p.data.rows])
  const emptySyncButtonRef = useRef<HTMLButtonElement>(null)
  const detailScrollRef = useRef<HTMLDivElement>(null)
  const filterDropdownStats = useFilterDropdownStats(getListStats, {
    filterOpen: p.filter.filterOpen,
    baseStats: p.data.stats,
    debouncedSearch: p.data.debouncedSearch,
    types: p.data.types,
    tags: p.data.tags,
    taskView: p.data.taskView
  })

  useLayoutEffect(() => {
    if (p.flags.emptyDb) {
      emptySyncButtonRef.current?.focus()
    }
  }, [p.flags.emptyDb])

  const handleCycleStatus = (id: number) => {
    fireAndForget(cycleStatus(id, 'forward').then(() => p.data.refreshList(false)))
  }

  const handleCyclePriority = (id: number) => {
    fireAndForget(cyclePriority(id, 'forward').then(() => p.data.refreshList(false)))
  }

  const detailEntry = p.sel.detailEntry
  const viewState = p.sel.viewState

  const handleEntryReturn = useListMainEntryKeys({
    disabled: showSettings || p.taskSheetVisible || p.palette.open,
    viewState,
    rows: p.data.rows,
    selectedId: p.sel.selectedId,
    detailEntry,
    detailScrollRef,
    actionCtx: p.actionCtx,
    entryPanelDeps: p.entryPanelDeps
  })

  const footerStatus = formatListFooterStatus({
    matchTotal: p.data.matchTotal,
    showing: p.data.rows.length,
    pageSize: p.data.pageSize,
    loading: p.data.loading
  })

  const listPanelClass =
    detailEntry === null
      ? 'kb-pt-list-panel'
      : viewState === 'split'
        ? 'kb-pt-list-panel kb-pt-list-panel--narrow'
        : 'kb-pt-list-panel kb-pt-list-panel--hidden'
  const detailPanelClass =
    detailEntry === null ? '' : viewState === 'detail' ? 'kb-pt-detail kb-pt-detail--full' : 'kb-pt-detail'

  useListSurfaceScrollRestore(p.listSurfaceRef, detailEntry)

  useEffect(() => {
    if (detailEntry !== null && viewState === 'detail' && p.filter.filterOpen) {
      p.filter.setFilterOpen(false)
    }
  }, [detailEntry, viewState, p.filter.filterOpen, p.filter.setFilterOpen])

  // Restore focus to list surface after detail closes so arrow keys work
  useEffect(() => {
    if (detailEntry) return
    let attempts = 0
    const tryFocus = () => {
      const surface = p.listSurfaceRef?.current
      if (!surface) return
      surface.focus({ preventScroll: true })
      if (document.activeElement === surface) return
      if (++attempts < 2) scheduleDoubleRaf(tryFocus)
    }
    scheduleDoubleRaf(tryFocus)
  }, [detailEntry, p.listSurfaceRef])

  const onSelectEntry = useCallback(
    (id: number) => {
      p.sel.setSelectedId(id)
      focusListSurface(p.listSurfaceRef)
    },
    [p.listSurfaceRef, p.sel.setSelectedId]
  )

  const selectedIndex = p.data.rows.findIndex(e => e.id === p.sel.selectedId)
  const virtualWindow = useVirtualListWindow(p.data.rows.length, p.listSurfaceRef, selectedIndex, p.sel.selectedId)
  const visibleRows = p.data.rows.slice(virtualWindow.startIndex, virtualWindow.endIndex)

  const filterSummary = listFilterSummary(p.data.types, p.data.tags, p.data.taskView)
  const filterActive = p.data.taskView !== undefined || p.data.types.length > 0 || p.data.tags.length > 0
  const filterChipCls = `kb-pt-filter-chip${filterActive ? ' kb-pt-filter-chip--active' : ''}`

  const toggleFilter = () => {
    if (p.filter.filterOpen) {
      p.filter.setFilterOpen(false)
    } else {
      p.filter.openFilter()
    }
  }

  const focusMainSearch = useCallback(() => {
    scheduleDoubleRaf(() => p.searchInputRef.current?.focus({ preventScroll: true }))
  }, [p.searchInputRef])

  const viewNavKeysDisabled = showSettings || p.taskSheetVisible || p.palette.open
  useWindowViewNavKeys({
    disabled: viewNavKeysDisabled,
    skipEscapeCapture: p.filter.filterOpen,
    handleKey: p.sel.handleKey,
    handleModL: p.handleWindowModL,
    handleListArrows: e => {
      p.onListKeyDown(e as unknown as ReactKeyboardEvent<HTMLDivElement>)
    },
    handleEntryReturn,
    detailScrollRef,
    detailScrollActive: detailEntry !== null
  })

  const powertoysClass = viewState === 'detail' ? 'kb-powertoys kb-powertoys--detail-full' : 'kb-powertoys'

  const closeDetailToList = useCallback(() => {
    p.sel.closeToList()
    focusListSurface(p.listSurfaceRef)
  }, [p.listSurfaceRef, p.sel.closeToList])

  const isFullDetail = detailEntry !== null && viewState === 'detail'
  const showBackWithSearch = detailEntry !== null && viewState === 'split'

  return (
    <>
      <div className={powertoysClass} role="application" aria-label="Knowledge list">
        <ListSearchFilterChrome
          isFullDetail={isFullDetail}
          showBackWithSearch={showBackWithSearch}
          closeDetailToList={closeDetailToList}
          searchInputRef={p.searchInputRef}
          search={p.data.search}
          onSearchChange={p.data.setSearch}
          onSearchArrowDown={p.onSearchArrowDown}
          filterButtonRef={p.filter.filterButtonRef}
          filterChipCls={filterChipCls}
          filterSummary={filterSummary}
          onToggleFilter={toggleFilter}
          filterOpen={p.filter.filterOpen}
          stats={filterDropdownStats ?? p.data.stats}
          types={p.data.types}
          tags={p.data.tags}
          taskView={p.data.taskView}
          onFilterChange={p.onFilterChange}
          onFilterClose={() => {
            p.filter.setFilterOpen(false)
            focusMainSearch()
          }}
          pushToast={p.pushToast}
          anchorRect={p.filter.anchorRect}
        />

        <div className="kb-pt-main">
          <div className={listPanelClass}>
            <ListResultsBody
              listSurfaceRef={p.listSurfaceRef}
              listSentinelRef={p.listSentinelRef}
              selectedId={p.sel.selectedId}
              onKeyDown={p.onListSurfaceKeyDown}
              emptyDb={p.flags.emptyDb}
              noResults={p.flags.noResults}
              emptyList={p.flags.emptyList}
              syncInfo={p.data.syncInfo}
              onSync={p.data.onSync}
              emptySyncButtonRef={emptySyncButtonRef}
              rows={p.data.rows}
              visibleRows={visibleRows}
              virtualWindow={virtualWindow}
              hasMore={p.data.hasMore}
              maxFrecencyScore={maxFrecencyScore}
              onSelectEntry={onSelectEntry}
              dragDrop={p.dragDrop}
              onCycleStatus={handleCycleStatus}
              onCyclePriority={handleCyclePriority}
            />
          </div>

          {detailEntry ? (
            <div ref={detailScrollRef} className={detailPanelClass}>
              <DetailPage
                entryId={detailEntry.id}
                allEntries={p.data.rows}
                onClose={closeDetailToList}
                onSelectEntry={id => {
                  p.sel.selectDetailEntry(id)
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <ListFooter
        footerStatus={footerStatus}
        isFullDetail={isFullDetail}
        detailEntry={detailEntry}
        closeDetailToList={closeDetailToList}
      />

      <ListOverlayHosts
        p={p}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        focusMainSearch={focusMainSearch}
      />
    </>
  )
}
