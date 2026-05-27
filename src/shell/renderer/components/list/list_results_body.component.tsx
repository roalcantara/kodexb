import type { RpcListEntry } from '@shared/rpc'
import type { KeyboardEventHandler, RefObject } from 'react'
import type { ListPageShell } from '../../hooks/list/use_list_page_shell.hook'
import type { ListSentinelSpacers, VirtualListWindow } from '../../utils/list/virtual_list.util'
import { EntryRow } from './entry_row.component'

export type ListResultsBodyProps = {
  listSurfaceRef: RefObject<HTMLDivElement | null>
  listSentinelRef: RefObject<HTMLDivElement | null>
  selectedId: number | null
  onKeyDown: KeyboardEventHandler<HTMLDivElement>
  emptyDb: boolean
  noResults: boolean
  emptyList: boolean
  syncInfo: ListPageShell['data']['syncInfo']
  onSync: () => void
  emptySyncButtonRef: RefObject<HTMLButtonElement | null>
  rows: RpcListEntry[]
  visibleRows: RpcListEntry[]
  virtualWindow: VirtualListWindow
  sentinelSpacers: ListSentinelSpacers | null
  hasMore: boolean
  maxFrecencyScore: number
  onSelectEntry: (id: number) => void
  dragDrop?: ListPageShell['dragDrop']
  onCycleStatus: (id: number) => void
  onCyclePriority: (id: number) => void
}

export function ListResultsBody({
  listSurfaceRef,
  listSentinelRef,
  selectedId,
  onKeyDown,
  emptyDb,
  noResults,
  emptyList,
  syncInfo,
  onSync,
  emptySyncButtonRef,
  rows,
  visibleRows,
  virtualWindow,
  sentinelSpacers,
  hasMore,
  maxFrecencyScore,
  onSelectEntry,
  dragDrop,
  onCycleStatus,
  onCyclePriority
}: ListResultsBodyProps) {
  return (
    <div
      ref={listSurfaceRef}
      className="cmp-results custom-scrollbar"
      tabIndex={0}
      data-list-selection={selectedId === null ? 'false' : 'true'}
      onKeyDown={onKeyDown}
      role="listbox"
      aria-label="Entries"
    >
      {emptyDb ? (
        <div className="cmp-empty-state">
          <p>No entries yet</p>
          <div className="cmp-empty-state-detail">
            {syncInfo ? (
              <p>
                Sources: <code>{syncInfo.sourcesDir}</code>
              </p>
            ) : null}
            {syncInfo ? (
              <p>
                {syncInfo.fileCount} source file{syncInfo.fileCount === 1 ? '' : 's'} found
              </p>
            ) : null}
            <button ref={emptySyncButtonRef} type="button" onClick={onSync}>
              ↺ Sync — press Enter to start
            </button>
          </div>
        </div>
      ) : null}
      {noResults ? (
        <div className="cmp-empty-state">
          <p>No results for this search.</p>
        </div>
      ) : null}
      {emptyList ? (
        <div className="cmp-empty-state">
          <p>No entries match the current filters.</p>
        </div>
      ) : null}
      {virtualWindow.paddingTop > 0 ? <div style={{ height: virtualWindow.paddingTop }} aria-hidden /> : null}
      {visibleRows.map(entry => (
        <EntryRow
          key={entry.id}
          entry={entry}
          allEntries={rows}
          maxFrecencyScore={maxFrecencyScore}
          selected={entry.id === selectedId}
          onSelect={onSelectEntry}
          dragHandlers={dragDrop?.getDragHandlers(entry)}
          dragOver={dragDrop?.dragOverId === entry.id}
          onCycleStatus={onCycleStatus}
          onCyclePriority={onCyclePriority}
          compact
        />
      ))}
      {hasMore && sentinelSpacers !== null ? (
        <>
          {sentinelSpacers.beforeSentinel > 0 ? (
            <div style={{ height: sentinelSpacers.beforeSentinel }} aria-hidden />
          ) : null}
          <div ref={listSentinelRef} className="cmp-list-sentinel" aria-hidden />
          {sentinelSpacers.afterSentinel > 0 ? (
            <div style={{ height: sentinelSpacers.afterSentinel }} aria-hidden />
          ) : null}
        </>
      ) : virtualWindow.paddingBottom > 0 ? (
        <div style={{ height: virtualWindow.paddingBottom }} aria-hidden />
      ) : null}
    </div>
  )
}
