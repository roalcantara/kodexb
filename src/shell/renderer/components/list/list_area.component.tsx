import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { useCallback } from 'react'
import type { useListDetailResize } from '../../hooks/list/use_list_detail_resize.hook'
import type { useListPageData } from '../../hooks/list/use_list_page_data.hook'
import type { useListSelection } from '../../hooks/list/use_list_selection.hook'
import { useListSurfaceScrollRestore } from '../../hooks/list/use_list_surface_scroll_restore.hook'
import type { useTaskDragDrop } from '../../hooks/list/use_task_drag_drop.hook'
import { useVirtualListWindow } from '../../hooks/list/use_virtual_list_window.hook'
import { focusListSurface } from '../../utils/list/list_surface_focus.util'
import { DetailPanel } from './detail_panel.component'
import { EntryRow } from './entry_row.component'

type ListData = ReturnType<typeof useListPageData>
type ListSel = ReturnType<typeof useListSelection>
type DetailLayout = ReturnType<typeof useListDetailResize>
type DragDrop = ReturnType<typeof useTaskDragDrop>

export type ListAreaProps = {
  data: ListData
  sel: ListSel
  detailLayout: DetailLayout
  flags: { emptyDb: boolean; noResults: boolean; emptyList: boolean }
  syncInfo?: { sourcesDir: string; fileCount: number } | null
  listSurfaceRef: RefObject<HTMLDivElement | null>
  listSentinelRef: RefObject<HTMLDivElement | null>
  onListKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void
  onSync: () => void
  dragDrop?: DragDrop
  onCycleStatus?: (id: number) => void
  onCyclePriority?: (id: number) => void
}

export function ListArea({
  data,
  sel,
  detailLayout,
  flags,
  syncInfo,
  listSurfaceRef,
  listSentinelRef,
  onListKeyDown,
  onSync,
  dragDrop,
  onCycleStatus,
  onCyclePriority
}: ListAreaProps) {
  useListSurfaceScrollRestore(listSurfaceRef, sel.detailEntry)

  const onSelectEntry = useCallback(
    (id: number) => {
      sel.setSelectedId(id)
      focusListSurface(listSurfaceRef)
    },
    [listSurfaceRef, sel.setSelectedId]
  )

  const selectedIndex = data.rows.findIndex(entry => entry.id === sel.selectedId)
  const virtualWindow = useVirtualListWindow(data.rows.length, listSurfaceRef, selectedIndex)
  const visibleRows = data.rows.slice(virtualWindow.startIndex, virtualWindow.endIndex)

  return (
    <div className="kb-listBody">
      <div
        ref={listSurfaceRef}
        className="kb-listSurface"
        tabIndex={0}
        data-list-selection={sel.selectedId === null ? 'false' : 'true'}
        onKeyDown={onListKeyDown}
        role="listbox"
        aria-label="Entries"
      >
        {flags.emptyDb ? (
          <div className="kb-empty">
            <p>No entries yet</p>
            {syncInfo ? (
              <div className="kb-empty-detail">
                <p>
                  Sources: <code>{syncInfo.sourcesDir}</code>
                </p>
                <p>
                  {syncInfo.fileCount} YAML file{syncInfo.fileCount === 1 ? '' : 's'} found
                </p>
                {/* biome-ignore lint/a11y/noAutofocus: pre-existing interactive empty-db shortcut */}
                <button type="button" className="kb-toolbar-sync" onClick={onSync} autoFocus>
                  ↺ Sync — press Enter to start
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {flags.noResults ? <p className="kb-empty">No results for this search.</p> : null}
        {flags.emptyList ? <p className="kb-empty">No entries match the current filters.</p> : null}
        {virtualWindow.paddingTop > 0 ? <div style={{ height: virtualWindow.paddingTop }} aria-hidden /> : null}
        {visibleRows.map(entry => (
          <EntryRow
            key={entry.id}
            entry={entry}
            allEntries={data.rows}
            selected={entry.id === sel.selectedId}
            onSelect={onSelectEntry}
            dragHandlers={dragDrop?.getDragHandlers(entry)}
            dragOver={dragDrop?.dragOverId === entry.id}
            onCycleStatus={onCycleStatus}
            onCyclePriority={onCyclePriority}
          />
        ))}
        {virtualWindow.paddingBottom > 0 ? <div style={{ height: virtualWindow.paddingBottom }} aria-hidden /> : null}
        {data.hasMore && data.rows.length > 0 ? (
          <div ref={listSentinelRef} className="kb-listSentinel" aria-hidden />
        ) : null}
      </div>
      <DetailPanel
        entryId={sel.detailEntry?.id ?? null}
        allEntries={data.rows}
        onClose={() => {
          detailLayout.onDetailClose()
          sel.setDetailEntry(null)
        }}
        onSelectEntry={id => {
          sel.setSelectedId(id)
          sel.setDetailEntry(data.rows.find(row => row.id === id) ?? null)
        }}
      />
    </div>
  )
}
