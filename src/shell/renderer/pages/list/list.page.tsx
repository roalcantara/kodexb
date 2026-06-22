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
    searchInputRef: p.searchInputRef,
    listSurfaceRef: p.listSurfaceRef
  })

  return (
    <div ref={listPageRef} className="cmp-list-page" onKeyDownCapture={onListPageKeyDownCapture}>
      <ListMain p={p} showSettings={showSettings} setShowSettings={setShowSettings} />
    </div>
  )
}
