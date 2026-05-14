import type { RpcKnowledge } from '@shared/rpc'
import type { MutableRefObject, RefObject } from 'react'
import { useCallback, useReducer, useRef } from 'react'
import { scheduleFocusSearchInputSelectAll } from '../../utils/list/schedule_double_raf.util'
import { type ViewState, viewReducer } from '../../utils/list/view_reducer.util'
import { primaryClipboardContent } from '../../utils/shared/clipboard_content.util'

export type { ViewState }

type ViewNavigationDeps = {
  rows: RpcKnowledge[]
  selectedId: number | null
  detailEntry: RpcKnowledge | null
  setSelectedId: (id: number | null) => void
  setDetailEntry: (entry: RpcKnowledge | null) => void
  searchInputRef?: RefObject<HTMLInputElement | null>
  hideWindow?: () => void
  pushToast?: (msg: string, type: 'success' | 'error') => void
}

type ViewNavigationKeyEvent = {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  preventDefault?: () => void
  target?: EventTarget | null
}

type ViewNavigationDepsSnapshot = {
  rows: RpcKnowledge[]
  selectedId: number | null
  detailEntry: RpcKnowledge | null
  viewState: ViewState
}

type ViewNavigationKeyCtx = {
  depsRef: MutableRefObject<ViewNavigationDepsSnapshot>
  advance: () => void
  retreat: () => void
  searchInputRef?: RefObject<HTMLInputElement | null>
  hideWindow?: () => void
  pushToast?: (msg: string, type: 'success' | 'error') => void
}

export type ViewNavigationResult = {
  viewState: ViewState
  advance: () => void
  retreat: () => void
  closeToList: () => void
  selectDetailEntry: (id: number) => void
  handleKey: (e: ViewNavigationKeyEvent) => void
}

function navTargetsFor(e: ViewNavigationKeyEvent): { isInput: boolean; isEditable: boolean } {
  const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
  const isEditable = e.target instanceof HTMLElement && e.target.isContentEditable
  return { isInput, isEditable }
}

function tryFocusSearchShortcut(e: ViewNavigationKeyEvent, ctx: ViewNavigationKeyCtx): boolean {
  if (!((e.metaKey || e.ctrlKey) && e.key === 'l')) return false
  e.preventDefault?.()
  const { viewState, detailEntry } = ctx.depsRef.current
  if (viewState === 'detail' && detailEntry !== null) {
    ctx.retreat()
    if (ctx.searchInputRef) {
      scheduleFocusSearchInputSelectAll(ctx.searchInputRef)
    }
    return true
  }
  if (ctx.searchInputRef?.current) {
    ctx.searchInputRef.current.focus({ preventScroll: true })
    ctx.searchInputRef.current.select()
    return true
  }
  return true
}

function tryCopyShortcut(
  e: ViewNavigationKeyEvent,
  ctx: ViewNavigationKeyCtx,
  isInput: boolean,
  isEditable: boolean
): boolean {
  if (!((e.metaKey || e.ctrlKey) && e.key === 'c' && !isInput && !isEditable)) return false
  const { rows: r, selectedId: sid } = ctx.depsRef.current
  const selected = r.find(row => row.id === sid)
  if (selected) {
    const content = primaryClipboardContent(selected)
    navigator.clipboard.writeText(content).then(
      () => ctx.pushToast?.('Copied!', 'success'),
      () => ctx.pushToast?.('Copy failed', 'error')
    )
  }
  return true
}

function tryEscapeKey(
  e: ViewNavigationKeyEvent,
  ctx: ViewNavigationKeyCtx,
  isInput: boolean,
  isEditable: boolean
): boolean {
  if (e.key !== 'Escape') return false
  if (isInput) {
    e.preventDefault?.()
    ;(e.target as HTMLElement).blur()
    return true
  }
  if (!isEditable) {
    if (ctx.depsRef.current.detailEntry !== null) {
      e.preventDefault?.()
      ctx.retreat()
      return true
    }
    e.preventDefault?.()
    ctx.hideWindow?.()
    return true
  }
  return true
}

function tryArrowKeys(e: ViewNavigationKeyEvent, ctx: ViewNavigationKeyCtx): void {
  if (e.key === 'ArrowRight') {
    e.preventDefault?.()
    if (ctx.depsRef.current.viewState !== 'detail') ctx.advance()
    return
  }
  if (e.key === 'ArrowLeft' && ctx.depsRef.current.detailEntry !== null) {
    e.preventDefault?.()
    ctx.retreat()
  }
}

function handleViewNavigationKey(e: ViewNavigationKeyEvent, ctx: ViewNavigationKeyCtx): void {
  const { isInput, isEditable } = navTargetsFor(e)
  if (tryFocusSearchShortcut(e, ctx)) return
  if (tryCopyShortcut(e, ctx, isInput, isEditable)) return
  if (tryEscapeKey(e, ctx, isInput, isEditable)) return
  if (isInput || isEditable) return
  tryArrowKeys(e, ctx)
}

export function useViewNavigation({
  rows,
  selectedId,
  detailEntry,
  setSelectedId,
  setDetailEntry,
  searchInputRef,
  hideWindow,
  pushToast
}: ViewNavigationDeps): ViewNavigationResult {
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
    (e: ViewNavigationKeyEvent) => {
      handleViewNavigationKey(e, { depsRef, advance, retreat, searchInputRef, hideWindow, pushToast })
    },
    [advance, retreat, searchInputRef, hideWindow, pushToast]
  )

  return {
    viewState,
    advance,
    retreat,
    closeToList,
    selectDetailEntry,
    handleKey
  }
}
