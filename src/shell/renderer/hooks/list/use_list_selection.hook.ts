import type { RpcKnowledge } from '@shared/rpc'
import { type KeyboardEvent as ReactKeyboardEvent, useState } from 'react'

const REPEAT_MOVE_STEP = 5

export type ListSelectionLayout = {
  onFirstDetailOpen: () => void
  onDetailClose: () => void
}

type DetailState = {
  rows: RpcKnowledge[]
  selectedId: number | null
  detailEntry: RpcKnowledge | null
  setDetailEntry: (v: RpcKnowledge | null) => void
  layout?: ListSelectionLayout
}

function closeDetail(
  detailEntry: RpcKnowledge | null,
  setDetailEntry: (v: RpcKnowledge | null) => void,
  layout?: ListSelectionLayout
): void {
  if (detailEntry === null) return
  layout?.onDetailClose()
  setDetailEntry(null)
}

function openDetail(
  rows: RpcKnowledge[],
  selectedId: number | null,
  detailEntry: RpcKnowledge | null,
  setDetailEntry: (v: RpcKnowledge | null) => void,
  layout?: ListSelectionLayout
): void {
  const row = rows.find(r => r.id === selectedId)
  if (row === undefined) return
  const openingFirst = detailEntry === null
  setDetailEntry(row)
  if (openingFirst) layout?.onFirstDetailOpen()
}

function toggleDetail(state: DetailState): void {
  const { rows, selectedId, detailEntry, setDetailEntry, layout } = state
  const row = rows.find(r => r.id === selectedId)
  if (row === undefined) return
  if (detailEntry !== null && detailEntry.id === row.id) {
    closeDetail(detailEntry, setDetailEntry, layout)
    return
  }
  openDetail(rows, selectedId, detailEntry, setDetailEntry, layout)
}

type ListArrowNav = {
  rows: RpcKnowledge[]
  selectedId: number | null
  detailEntry: RpcKnowledge | null
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
  if (d.detailEntry === null && d.rows.length > 0) {
    const idx = d.rows.findIndex(r => r.id === d.selectedId)
    if (idx === 0) {
      d.setSelectedId(null)
      d.onLeaveListUpward?.()
      return 'leave'
    }
  }
  d.moveSelection(e.repeat ? -REPEAT_MOVE_STEP : -1)
  return 'moved'
}

function handleDetailKey(e: ReactKeyboardEvent<HTMLDivElement>, state: DetailState): boolean {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    openDetail(state.rows, state.selectedId, state.detailEntry, state.setDetailEntry, state.layout)
    return true
  }
  if (e.key === '[' && (e.metaKey || e.ctrlKey)) {
    if (state.detailEntry !== null) {
      e.preventDefault()
      closeDetail(state.detailEntry, state.setDetailEntry, state.layout)
    }
    return true
  }
  if (e.key !== 'ArrowLeft' && e.key !== 'Escape') return false
  if (state.detailEntry !== null) {
    e.preventDefault()
    closeDetail(state.detailEntry, state.setDetailEntry, state.layout)
  }
  return true
}

export function useListSelection(
  rows: RpcKnowledge[],
  layout?: ListSelectionLayout,
  onLeaveListUpward?: () => void,
  onRestoreListSurfaceFocus?: () => void
) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailEntry, setDetailEntry] = useState<RpcKnowledge | null>(null)

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

  const onListKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const nav: ListArrowNav = {
      rows,
      selectedId,
      detailEntry,
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
      return
    }
    const detailState = { rows, selectedId, detailEntry, setDetailEntry, layout }
    if (handleDetailKey(e, detailState)) return
    if (e.key !== 'Enter') return
    e.preventDefault()
    toggleDetail(detailState)
  }

  return { selectedId, setSelectedId, detailEntry, setDetailEntry, selectFirst, onListKeyDown }
}
