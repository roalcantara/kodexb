import { useRef, useState } from 'react'
import { ListMain } from '../../components/list/list_main.component'
import { useListPageFocusRing } from '../../hooks/list/use_list_page_focus_ring.hook'
import { useListPageShell } from '../../hooks/list/use_list_page_shell.hook'

export function ListPage() {
  const p = useListPageShell()
  const listPageRef = useRef<HTMLDivElement>(null)
  const [showSettings, setShowSettings] = useState(false)
  const { onListPageKeyDownCapture } = useListPageFocusRing({
    showSettings,
    filterOpen: p.filter.filterOpen,
    detailEntry: p.sel.detailEntry,
    listPageRef,
    filterButtonRef: p.filter.filterButtonRef,
    searchInputRef: p.searchInputRef,
    syncButtonRef: p.syncButtonRef,
    settingsButtonRef: p.settingsButtonRef,
    listSurfaceRef: p.listSurfaceRef
  })

  return (
    <div ref={listPageRef} className="kb-listPage" onKeyDownCapture={onListPageKeyDownCapture}>
      <ListMain p={p} showSettings={showSettings} setShowSettings={setShowSettings} />
    </div>
  )
}
