import { useRef, useState } from 'react'
import { ListMain } from '../../components/list/main.component'
import { useListPageFocusRing } from '../../hooks/list/use_list_page_focus_ring.hook'
import { useListPageShell } from '../../hooks/list/use_list_page_shell.hook'

export function ListPage() {
  const [showSettings, setShowSettings] = useState(false)
  const listPageRef = useRef<HTMLDivElement>(null)
  const p = useListPageShell({ showSettings, onOpenSettings: () => setShowSettings(true) })
  const { onListPageKeyDownCapture } = useListPageFocusRing({
    showSettings,
    filterOpen: p.filter.filterOpen,
    detailEntry: p.sel.detailEntry,
    selectedId: p.sel.selectedId,
    listPageRef,
    filterButtonRef: p.filter.filterButtonRef,
    searchInputRef: p.refs.searchInputRef,
    listSurfaceRef: p.refs.listSurfaceRef
  })

  return (
    <div ref={listPageRef} className="cmp-list-page" onKeyDownCapture={onListPageKeyDownCapture}>
      <ListMain
        listData={p.data}
        listFilter={p.filter}
        listSelection={p.sel}
        listOverlays={{ taskSheet: p.taskSheet, palette: p.palette, quickLookup: p.quickLookup }}
        listActions={{
          handlers: p.handlers,
          refs: p.refs,
          flags: p.flags,
          dragDrop: p.dragDrop,
          actionCtx: p.actionCtx,
          entryPanelDeps: p.entryPanelDeps,
          actionToasts: p.actionToasts,
          dismissActionToast: p.dismissActionToast,
          pushToast: p.pushToast,
          mutationError: p.mutationError,
          clearMutationError: p.clearMutationError
        }}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
      />
    </div>
  )
}
