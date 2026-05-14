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

function handleListArrowUp(
  e: ReactKeyboardEvent<HTMLDivElement>,
  d: ListArrowNav,
  patchSelection: (nextId: number | null, rowIfDetail?: RpcKnowledge | null) => void
): 'leave' | 'moved' | false {
  if (e.key !== 'ArrowUp') return false
  e.preventDefault()
  if (d.rows.length > 0) {
    const idx = d.rows.findIndex(r => r.id === d.selectedId)
    if (idx < 0) {
      const last = d.rows[d.rows.length - 1] ?? null
      patchSelection(last?.id ?? null, last)
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

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: selection + detail sync stay with view nav wiring
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

  const patchSelection = (nextId: number | null, rowIfDetail?: RpcKnowledge | null) => {
    setSelectedId(nextId)
    if (detailEntry !== null && rowIfDetail) setDetailEntry(rowIfDetail)
  }

  const moveSelection = (delta: number) => {
    if (rows.length === 0) return
    const idx = rows.findIndex(r => r.id === selectedId)
    const base = idx < 0 ? -1 : idx
    const next = Math.max(0, Math.min(rows.length - 1, base + delta))
    const nextRow = rows[next]
    patchSelection(nextRow?.id ?? null, nextRow ?? null)
  }

  const selectFirst = () => {
    const first = rows[0] ?? null
    patchSelection(first?.id ?? null, first)
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
    const arrowUp = handleListArrowUp(e, nav, patchSelection)
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
