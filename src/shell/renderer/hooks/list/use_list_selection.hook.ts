import type { RpcKnowledge } from '@shared/rpc'
import type { RefObject } from 'react'
import { type KeyboardEvent as ReactKeyboardEvent, useState } from 'react'
import { useViewNavigation } from './use_view_navigation.hook'

const REPEAT_MOVE_STEP = 5

type ListArrowNav = {
  rows: RpcKnowledge[]
  selectedId: number | null
  setSelectedId: (id: number | null) => void
  moveSelection: (delta: number) => void
  onLeaveListUpward?: () => void
}

function handleListArrowDown(e: ReactKeyboardEvent<HTMLDivElement>, moveSelection: (delta: number) => void): boolean {
  if (e.key !== 'ArrowDown') return false
  e.preventDefault()
  moveSelection(e.repeat ? REPEAT_MOVE_STEP : 1)
  return true
}

function handleListArrowUp(e: ReactKeyboardEvent<HTMLDivElement>, d: ListArrowNav): 'leave' | 'moved' | false {
  if (e.key !== 'ArrowUp') return false
  e.preventDefault()
  if (d.rows.length > 0) {
    const idx = d.rows.findIndex(r => r.id === d.selectedId)
    if (idx < 0) {
      // Nothing selected — select last row
      d.setSelectedId(d.rows[d.rows.length - 1]?.id ?? null)
      return 'moved'
    }
    if (idx === 0) {
      d.setSelectedId(null)
      d.onLeaveListUpward?.()
      return 'leave'
    }
  }
  d.moveSelection(e.repeat ? -REPEAT_MOVE_STEP : -1)
  return 'moved'
}

export function useListSelection(
  rows: RpcKnowledge[],
  onLeaveListUpward?: () => void,
  onRestoreListSurfaceFocus?: () => void,
  searchInputRef?: RefObject<HTMLInputElement | null>,
  hideWindow?: () => void,
  pushToast?: (msg: string, type: 'success' | 'error') => void,
  onEscapeFromSearch?: () => void
) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailEntry, setDetailEntry] = useState<RpcKnowledge | null>(null)

  const { advance, retreat, closeToList, selectDetailEntry, viewState, handleKey } = useViewNavigation({
    rows,
    selectedId,
    detailEntry,
    setSelectedId,
    setDetailEntry,
    searchInputRef,
    onEscapeFromSearch,
    hideWindow,
    pushToast
  })

  const moveSelection = (delta: number) => {
    if (rows.length === 0) return
    const idx = rows.findIndex(r => r.id === selectedId)
    const base = idx < 0 ? -1 : idx
    const next = Math.max(0, Math.min(rows.length - 1, base + delta))
    setSelectedId(rows[next]?.id ?? null)
  }

  const selectFirst = () => {
    setSelectedId(rows[0]?.id ?? null)
  }

  // List surface handler: ArrowUp/Down for selection, ArrowRight/Left for view nav
  const onListKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const nav: ListArrowNav = {
      rows,
      selectedId,
      setSelectedId,
      moveSelection,
      onLeaveListUpward
    }
    if (handleListArrowDown(e, moveSelection)) {
      onRestoreListSurfaceFocus?.()
      return
    }
    const arrowUp = handleListArrowUp(e, nav)
    if (arrowUp === 'leave') return
    if (arrowUp === 'moved') {
      onRestoreListSurfaceFocus?.()
    }
    // ArrowLeft/ArrowRight and ⌘L: handled via `useWindowViewNavKeys` (window capture)
    // so keys still run when focus is inside the detail panel.
  }

  return {
    selectedId,
    setSelectedId,
    detailEntry,
    setDetailEntry,
    viewState,
    selectFirst,
    onListKeyDown,
    advance,
    retreat,
    closeToList,
    selectDetailEntry,
    handleKey
  }
}
