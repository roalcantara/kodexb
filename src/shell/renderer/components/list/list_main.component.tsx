import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect } from 'react'
import type { ListPageShell } from '../../hooks/list/use_list_page_shell.hook'
import { useListSurfaceScrollRestore } from '../../hooks/list/use_list_surface_scroll_restore.hook'
import { useVirtualListWindow } from '../../hooks/list/use_virtual_list_window.hook'
import { DetailPage } from '../../pages/detail/detail.page'
import { SettingsPage } from '../../pages/settings/settings.page'
import { cyclePriority, cycleStatus } from '../../rpc/client'
import { listFilterSummary } from '../../utils/list/list_filter_summary.util'
import { focusListSurface } from '../../utils/list/list_surface_focus.util'
import { CmdkPalette } from '../actions/cmdk_palette.component'
import { SyncProgress } from '../shared/sync_progress.component'
import { SyncToast } from '../shared/sync_toast.component'
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
  const resultCount = p.data.stats?.total ?? p.data.rows.length

  const listPanelClass =
    detailEntry === null
      ? 'kb-pt-list-panel'
      : viewState === 'split'
        ? 'kb-pt-list-panel kb-pt-list-panel--narrow'
        : 'kb-pt-list-panel kb-pt-list-panel--hidden'
  const detailPanelClass =
    detailEntry === null ? '' : viewState === 'detail' ? 'kb-pt-detail kb-pt-detail--full' : 'kb-pt-detail'

  useListSurfaceScrollRestore(p.listSurfaceRef, detailEntry)

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
  const virtualWindow = useVirtualListWindow(p.data.rows.length, p.listSurfaceRef, selectedIndex)
  const visibleRows = p.data.rows.slice(virtualWindow.startIndex, virtualWindow.endIndex)

  const filterSummary = listFilterSummary(p.data.types, p.data.tags, p.data.taskView)
  const filterActive = p.data.taskView !== undefined || p.data.types.length > 0 || p.data.tags.length > 0
  const filterChipCls = `kb-pt-filter-chip${filterActive ? ' kb-pt-filter-chip--active' : ''}`

  const toggleFilter = () => {
    p.filter.setFilterOpen(!p.filter.filterOpen)
  }

  const onPowertoysViewNavCapture = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      p.sel.handleKey(e)
      if (e.defaultPrevented) e.stopPropagation()
    },
    [p.sel]
  )

  const powertoysClass = viewState === 'detail' ? 'kb-powertoys kb-powertoys--detail-full' : 'kb-powertoys'
  const searchRowClass = viewState === 'detail' ? 'kb-pt-search kb-pt-search--hidden' : 'kb-pt-search'

  return (
    <>
      <div
        className={powertoysClass}
        role="application"
        aria-label="Knowledge list"
        onKeyDownCapture={onPowertoysViewNavCapture}
      >
        <div className={searchRowClass}>
          <input
            ref={p.searchInputRef}
            type="search"
            placeholder="Search your knowledge base…"
            value={p.data.search}
            onChange={e => p.data.setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'ArrowDown') return
              e.preventDefault()
              p.onSearchArrowDown()
            }}
            aria-label="Search"
          />
          <button type="button" className={filterChipCls} onClick={toggleFilter}>
            {filterSummary} ▾
          </button>
        </div>

        {p.filter.filterOpen && p.data.stats !== null ? (
          <FilterDropdown
            open={p.filter.filterOpen}
            anchorRect={p.filter.anchorRect}
            stats={p.data.stats}
            types={p.data.types}
            tags={p.data.tags}
            taskView={p.data.taskView}
            onChange={p.onFilterChange}
            onClose={() => p.filter.setFilterOpen(false)}
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
                    {/* biome-ignore lint/a11y/noAutofocus: sync button must be focused for Enter-to-start */}
                    <button type="button" onClick={p.data.onSync} autoFocus>
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
            <div className={detailPanelClass}>
              <div className="kb-pt-nav-hint">← / Escape to close</div>
              <DetailPage
                entryId={detailEntry.id}
                allEntries={p.data.rows}
                onClose={() => {
                  p.sel.closeToList()
                  focusListSurface(p.listSurfaceRef)
                }}
                onSelectEntry={id => {
                  p.sel.selectDetailEntry(id)
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="kb-pt-footer">
          <span>{resultCount} results</span>
          <span>⌘K · ⌘N · ⌘,</span>
        </div>
      </div>

      {p.taskSheetVisible ? (
        <TaskSheet key={p.taskSheetEntry?.id ?? 'new'} entry={p.taskSheetEntry} onClose={p.onCloseTaskSheet} />
      ) : null}
      {p.data.syncing ? (
        <SyncProgress processed={p.data.syncProg?.processed ?? 0} total={p.data.syncProg?.total ?? 1} />
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
        <CmdkPalette open={p.palette.open} actions={p.palette.actions} onClose={p.palette.closePalette} />
      )}
      <SyncToast result={p.data.toastResult} onDismiss={p.data.dismissToast} />
    </>
  )
}
