import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFilterDropdownStats } from '../../hooks/list/use_filter_dropdown_stats.hook'
import type { ListPageShell } from '../../hooks/list/use_list_page_shell.hook'
import { useListSurfaceScrollRestore } from '../../hooks/list/use_list_surface_scroll_restore.hook'
import { useVirtualListWindow } from '../../hooks/list/use_virtual_list_window.hook'
import { useWindowViewNavKeys } from '../../hooks/list/use_window_view_nav_keys.hook'
import { DetailPage } from '../../pages/detail/detail.page'
import { SettingsPage } from '../../pages/settings/settings.page'
import { cyclePriority, cycleStatus, getListStats } from '../../rpc/client'
import { listFilterSummary } from '../../utils/list/list_filter_summary.util'
import { formatListFooterStatus } from '../../utils/list/list_footer_status.util'
import { focusListSurface } from '../../utils/list/list_surface_focus.util'
import { CommandPalette } from '../actions/command_palette.component'
import { ActionToastHost } from '../shared/action_toast_host.component'
import { SyncModal } from '../shared/sync_modal.component'
import { TaskSheet } from '../task/task_sheet.component'
import { EntryRow } from './entry_row.component'
import { FilterDropdown } from './filter_dropdown.component'

export type ListMainProps = {
  p: ListPageShell
  showSettings: boolean
  setShowSettings: (value: boolean | ((prev: boolean) => boolean)) => void
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: pre-existing pattern outside Phase 9 scope
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing inline rendering
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
    cycleStatus(id, 'forward')
      .then(() => p.data.refreshList(false).catch(() => undefined))
      .catch(() => undefined)
  }

  const handleCyclePriority = (id: number) => {
    cyclePriority(id, 'forward')
      .then(() => p.data.refreshList(false).catch(() => undefined))
      .catch(() => undefined)
  }

  const detailEntry = p.sel.detailEntry
  const viewState = p.sel.viewState

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
      if (++attempts < 2) requestAnimationFrame(tryFocus)
    }
    queueMicrotask(() => requestAnimationFrame(() => requestAnimationFrame(tryFocus)))
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
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => p.searchInputRef.current?.focus({ preventScroll: true }))
      })
    })
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
        {isFullDetail ? <div className="kb-windowDragStripe kb-windowDragStripe--detail" aria-hidden /> : null}
        {isFullDetail ? null : (
          <div className="kb-pt-search">
            <div className="kb-pt-search-wrap kb-pt-search-wrap--withBack">
              <button
                type="button"
                className={`kb-pt-back${showBackWithSearch ? '' : ' kb-pt-back--inactive'}`}
                aria-label="Back to list"
                title={showBackWithSearch ? 'Back to list (Escape)' : undefined}
                aria-hidden={!showBackWithSearch}
                tabIndex={showBackWithSearch ? 0 : -1}
                onClick={() => {
                  if (showBackWithSearch) closeDetailToList()
                }}
              >
                ←
              </button>
              <search className="kb-pt-bar">
                <input
                  ref={p.searchInputRef}
                  type="search"
                  placeholder="Search your knowledge base…"
                  value={p.data.search}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  onChange={e => p.data.setSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key !== 'ArrowDown') return
                    e.preventDefault()
                    p.onSearchArrowDown()
                  }}
                  aria-label="Search"
                />
                <span aria-hidden className="kb-pt-bar-divider" />
                <button ref={p.filter.filterButtonRef} type="button" className={filterChipCls} onClick={toggleFilter}>
                  {filterSummary} ▾
                </button>
              </search>
            </div>
          </div>
        )}

        {p.filter.filterOpen && p.data.stats !== null ? (
          <FilterDropdown
            open={p.filter.filterOpen}
            anchorRect={p.filter.anchorRect}
            stats={filterDropdownStats ?? p.data.stats}
            types={p.data.types}
            tags={p.data.tags}
            taskView={p.data.taskView}
            onChange={p.onFilterChange}
            onClose={() => {
              p.filter.setFilterOpen(false)
              focusMainSearch()
            }}
            pushToast={p.pushToast}
            closeToList={closeDetailToList}
            isFullDetail={isFullDetail}
            compact
          />
        ) : null}

        <div className="kb-pt-main">
          <div className={listPanelClass}>
            <div
              ref={p.listSurfaceRef}
              className="kb-pt-results"
              tabIndex={0}
              data-list-selection={p.sel.selectedId === null ? 'false' : 'true'}
              onKeyDown={p.onListSurfaceKeyDown}
              role="listbox"
              aria-label="Entries"
            >
              {p.flags.emptyDb ? (
                <div className="kb-pt-empty">
                  <p>No entries yet</p>
                  <div className="kb-pt-empty-detail">
                    {p.data.syncInfo ? (
                      <p>
                        Sources: <code>{p.data.syncInfo.sourcesDir}</code>
                      </p>
                    ) : null}
                    {p.data.syncInfo ? (
                      <p>
                        {p.data.syncInfo.fileCount} YAML file{p.data.syncInfo.fileCount === 1 ? '' : 's'} found
                      </p>
                    ) : null}
                    <button ref={emptySyncButtonRef} type="button" onClick={p.data.onSync}>
                      ↺ Sync — press Enter to start
                    </button>
                  </div>
                </div>
              ) : null}
              {p.flags.noResults ? (
                <div className="kb-pt-empty">
                  <p>No results for this search.</p>
                </div>
              ) : null}
              {p.flags.emptyList ? (
                <div className="kb-pt-empty">
                  <p>No entries match the current filters.</p>
                </div>
              ) : null}
              {virtualWindow.paddingTop > 0 ? <div style={{ height: virtualWindow.paddingTop }} aria-hidden /> : null}
              {visibleRows.map(entry => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  allEntries={p.data.rows}
                  maxFrecencyScore={maxFrecencyScore}
                  selected={entry.id === p.sel.selectedId}
                  onSelect={onSelectEntry}
                  dragHandlers={p.dragDrop?.getDragHandlers(entry)}
                  dragOver={p.dragDrop?.dragOverId === entry.id}
                  onCycleStatus={handleCycleStatus}
                  onCyclePriority={handleCyclePriority}
                  compact
                />
              ))}
              {virtualWindow.paddingBottom > 0 ? (
                <div style={{ height: virtualWindow.paddingBottom }} aria-hidden />
              ) : null}
              {p.data.hasMore && p.data.rows.length > 0 ? (
                <div ref={p.listSentinelRef} className="kb-listSentinel" aria-hidden />
              ) : null}
            </div>
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

        <div className="kb-pt-footer">
          <span>{footerStatus}</span>
          <span className="kb-pt-footer-right">
            <span className="kb-pt-footer-keys">
              <span
                className={`kb-pt-footer-keysPrefix${isFullDetail ? '' : ' kb-pt-footer-keysPrefix--inactive'}`}
                aria-hidden={!isFullDetail}
              >
                <button
                  type="button"
                  className="kb-pt-footer-keyBack"
                  aria-label="Back to list"
                  title="Back to list (Escape)"
                  tabIndex={isFullDetail ? 0 : -1}
                  onClick={() => {
                    if (isFullDetail) closeDetailToList()
                  }}
                >
                  ⎋
                </button>
                <span className="kb-pt-footer-keysSep" aria-hidden>
                  {' · '}
                </span>
              </span>
              <span>⌘P · ⌘K · ⌘N · ⌘,{detailEntry === null ? '' : ' · ⌘↓ scroll'}</span>
            </span>
          </span>
        </div>
      </div>

      {p.taskSheetVisible ? (
        <TaskSheet key={p.taskSheetEntry?.id ?? 'new'} entry={p.taskSheetEntry} onClose={p.onCloseTaskSheet} />
      ) : null}
      {showSettings ? (
        <div className="kb-settingsHost">
          <SettingsPage
            onCloseRequest={() => setShowSettings(false)}
            onConfigSaved={cfg => {
              const ps = Number.parseInt(cfg.display.pageSize, 10)
              if (Number.isFinite(ps) && ps > 0) p.data.setPageSize(ps)
              p.data.refreshList(false).catch(() => undefined)
            }}
          />
        </div>
      ) : null}
      {p.palette.open && (
        <CommandPalette
          open={p.palette.open}
          actions={p.palette.actions}
          onClose={() => {
            p.palette.closePalette()
            focusMainSearch()
          }}
        />
      )}
      <SyncModal model={p.data.syncUi} onDismiss={p.data.dismissSyncModal} />
      <ActionToastHost toasts={p.actionToasts} onDismiss={p.dismissActionToast} />
    </>
  )
}
