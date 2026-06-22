import { copyTextForEntry } from '@core'
import { resolveCurrentEntry } from '@core/helpers/entry_action/resolve_current_entry.util'
import type { RpcKnowledge } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import type { RefObject } from 'react'
import { useCallback, useReducer, useRef } from 'react'
import type { EntryActionContext } from '../../actions/panel/panel.types'
import { executeEntryAction } from '../../actions/execute.executor'
import { clipboardCopiedToastMessage } from '../../utils/list/list_formatters.util'
import { type ViewState, viewReducer } from '../../utils/list/list_page_state.util'
import { scheduleFocusSearchInputSelectAll } from '../../utils/list/list_scroll.util'

export type { ViewState }

type ViewNavigationDeps = {
  rows: RpcKnowledge[]
  selectedId: number | null
  detailEntry: RpcKnowledge | null
  setSelectedId: (id: number | null) => void
  setDetailEntry: (entry: RpcKnowledge | null) => void
  searchInputRef?: RefObject<HTMLInputElement | null>
  /** Blur search and focus the list surface (Escape from search). */
  onEscapeFromSearch?: () => void
  hideWindow?: () => void
  pushToast?: (msg: string, type: 'success' | 'error') => void
  actionCtx?: EntryActionContext
}

export type ViewNavigationKeyEvent = {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
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
  depsRef: RefObject<ViewNavigationDepsSnapshot>
  advance: () => void
  retreat: () => void
  searchInputRef?: RefObject<HTMLInputElement | null>
  onEscapeFromSearch?: () => void
  hideWindow?: () => void
  pushToast?: (msg: string, type: 'success' | 'error') => void
  actionCtx?: EntryActionContext
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
  if (!((e.metaKey || e.ctrlKey) && e.key === 'c' && !e.altKey && !isInput && !isEditable)) return false
  e.preventDefault?.()
  const { rows: r, selectedId: sid, detailEntry, viewState } = ctx.depsRef.current
  const actionCtx = ctx.actionCtx
  const entry = actionCtx
    ? resolveCurrentEntry({
        viewState,
        selectedId: sid,
        detailEntry,
        rows: r,
        detailPanelHasFocus: false
      })
    : r.find(row => row.id === sid)
  if (entry && actionCtx) {
    fireAndForget(executeEntryAction(entry, 'copy', { ...actionCtx, entry }))
  } else if (entry) {
    const content = copyTextForEntry(entry)
    const msg = clipboardCopiedToastMessage(content)
    navigator.clipboard.writeText(content).then(
      () => ctx.pushToast?.(msg, 'success'),
      () => ctx.pushToast?.('Copy failed', 'error')
    )
  } else {
    ctx.pushToast?.('Select an entry to copy', 'success')
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
    const t = e.target as HTMLElement
    if (ctx.searchInputRef?.current === t) {
      e.preventDefault?.()
      if (ctx.onEscapeFromSearch) {
        ctx.onEscapeFromSearch()
      } else {
        t.blur()
      }
      return true
    }
    e.preventDefault?.()
    t.blur()
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
    const vs = ctx.depsRef.current.viewState
    if (vs === 'detail') {
      ctx.retreat()
    } else {
      ctx.advance()
    }
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

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: reducer + stable callbacks stay co-located with handleKey
export function useViewNavigation({
  rows,
  selectedId,
  detailEntry,
  setSelectedId,
  setDetailEntry,
  searchInputRef,
  onEscapeFromSearch,
  hideWindow,
  pushToast,
  actionCtx
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
      handleViewNavigationKey(e, {
        depsRef,
        advance,
        retreat,
        searchInputRef,
        onEscapeFromSearch,
        hideWindow,
        pushToast,
        actionCtx
      })
    },
    [advance, retreat, searchInputRef, onEscapeFromSearch, hideWindow, pushToast, actionCtx]
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
