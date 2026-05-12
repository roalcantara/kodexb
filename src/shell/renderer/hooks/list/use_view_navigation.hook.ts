import { useCallback, useReducer, useRef } from 'react'
import type { RpcKnowledge } from '@shared/rpc'
import { viewReducer, type ViewState } from '../../utils/list/view_reducer.util'

export type { ViewState }

type ViewNavigationDeps = {
  rows: RpcKnowledge[]
  selectedId: number | null
  detailEntry: RpcKnowledge | null
  setSelectedId: (id: number | null) => void
  setDetailEntry: (entry: RpcKnowledge | null) => void
}

export function useViewNavigation({
  rows,
  selectedId,
  detailEntry,
  setSelectedId,
  setDetailEntry
}: ViewNavigationDeps) {
  const [viewState, dispatch] = useReducer(viewReducer, 'list')
  const depsRef = useRef({ rows, selectedId, detailEntry, viewState })
  depsRef.current = { rows, selectedId, detailEntry, viewState }

  const advance = useCallback(() => {
    const { rows: r, selectedId: sid, viewState: vs } = depsRef.current

    // Auto-select first entry if nothing selected
    if (sid === null && r.length > 0) {
      setSelectedId(r[0]?.id ?? null)
    }

    const currentId = sid ?? r[0]?.id
    if (currentId === undefined) return

    const entry = r.find(e => e.id === currentId) ?? null
    if (!entry) return

    if (vs === 'list' || vs === 'split') {
      setDetailEntry(entry)
    }
    dispatch('ADVANCE')
  }, [setSelectedId, setDetailEntry])

  const retreat = useCallback(() => {
    const { viewState: vs } = depsRef.current
    if (vs === 'split') {
      setDetailEntry(null)
    }
    dispatch('RETREAT')
  }, [setDetailEntry])

  const closeToList = useCallback(() => {
    setDetailEntry(null)
    dispatch('CLOSE_TO_LIST')
  }, [setDetailEntry])

  // Keyboard handler for ArrowRight/ArrowLeft — called from list surface onKeyDown
  // with the same input guard as before.
  const handleKey = useCallback(
    (e: { key: string; preventDefault?: () => void; target?: EventTarget | null }) => {
      // Skip when user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.target instanceof HTMLElement && e.target.isContentEditable) return

      if (e.key === 'ArrowRight') {
        e.preventDefault?.()
        if (depsRef.current.viewState !== 'detail') advance()
        return
      }
      if (e.key === 'ArrowLeft') {
        if (depsRef.current.detailEntry !== null) {
          e.preventDefault?.()
          retreat()
        }
        return
      }
    },
    [advance, retreat]
  )

  return { viewState, advance, retreat, closeToList, handleKey }
}
