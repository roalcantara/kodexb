import type { RefObject } from 'react'
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
  searchInputRef?: RefObject<HTMLInputElement | null>
  hideWindow?: () => void
}

export function useViewNavigation({
  rows,
  selectedId,
  detailEntry,
  setSelectedId,
  setDetailEntry,
  searchInputRef,
  hideWindow
}: ViewNavigationDeps) {
  const [viewState, dispatch] = useReducer(viewReducer, 'list')
  const depsRef = useRef({ rows, selectedId, detailEntry, viewState })
  depsRef.current = { rows, selectedId, detailEntry, viewState }

  const advance = useCallback(() => {
    const { rows: r, selectedId: sid, viewState: vs } = depsRef.current

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

  /** In-panel detail switches (e.g. dependency links) must keep `viewState` aligned
   * with `detailEntry`. Setting detail alone while the reducer is still `list` hides
   * the list panel incorrectly; keyboard `advance()` always dispatches `ADVANCE`. */
  const selectDetailEntry = useCallback(
    (id: number) => {
      const { rows: r, viewState: vs } = depsRef.current
      const row = r.find(e => e.id === id) ?? null
      if (!row) return
      setSelectedId(id)
      setDetailEntry(row)
      if (vs === 'list') {
        dispatch('ADVANCE')
      }
    },
    [setSelectedId, setDetailEntry]
  )

  // Keyboard handler — called from list surface onKeyDown and root div onKeyDown
  const handleKey = useCallback(
    (e: { key: string; metaKey?: boolean; ctrlKey?: boolean; preventDefault?: () => void; target?: EventTarget | null }) => {
      // Skip when user is typing in an input
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      const isEditable = e.target instanceof HTMLElement && e.target.isContentEditable

      // ⌘L / Ctrl+L: focus search input
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault?.()
        if (searchInputRef?.current) {
          searchInputRef.current.focus()
          searchInputRef.current.select()
        }
        return
      }

      // Escape: blur search input, or hide window, or close detail
      if (e.key === 'Escape') {
        if (isInput) {
          // Escape from search input → blur
          e.preventDefault?.()
          ;(e.target as HTMLElement).blur()
          return
        }
        if (!isEditable) {
          if (depsRef.current.detailEntry !== null) {
            // Escape with detail open → close detail
            e.preventDefault?.()
            retreat()
            return
          }
          // Escape with no detail, not in input → hide window
          e.preventDefault?.()
          hideWindow?.()
          return
        }
        return
      }

      // Skip navigation keys when typing
      if (isInput || isEditable) return

      if (e.key === 'ArrowRight') {
        e.preventDefault?.()
        if (depsRef.current.viewState !== 'detail') advance()
        return
      }
      if (e.key === 'ArrowLeft' && depsRef.current.detailEntry !== null) {
        e.preventDefault?.()
        retreat()
      }
    },
    [advance, retreat, searchInputRef, hideWindow]
  )

  return { viewState, advance, retreat, closeToList, selectDetailEntry, handleKey }
}
