import { resolveCurrentEntry } from '@core/helpers/entry_action/resolve_current_entry.util'
import { fireAndForget } from '@shared/utils'
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { executeEntryAction } from '../../actions/execute.executor'
import { useFilterDropdownStats } from '../../hooks/list/use_filter_dropdown_stats.hook'
import { useListMainEntryKeys } from '../../hooks/list/use_list_main_entry_keys.hook'
import { useListPointerSelection } from '../../hooks/list/use_list_pointer_selection.hook'
import { useListSurfaceScrollRestore } from '../../hooks/list/use_list_surface_scroll_restore.hook'
import { useVirtualListWindow } from '../../hooks/list/use_virtual_list_window.hook'
import { useWindowDrag } from '../../hooks/list/use_window_drag.hook'
import { useWindowViewNavKeys } from '../../hooks/list/use_window_view_nav_keys.hook'
import { cyclePriority, cycleStatus, getListStats } from '../../rpc/client'
import { listFilterSummary } from '../../utils/list/list_filters.util'
import { formatListFooterStatus } from '../../utils/list/list_formatters.util'
import { focusListSurface } from '../../utils/list/list_keyboard.util'
import { scheduleDoubleRaf } from '../../utils/list/list_scroll.util'
import { listSentinelSpacers } from '../../utils/list/virtual_list.util'
import type { ListActions, ListData, ListFilter, ListOverlays, ListSelection } from './use_list_page_shell.hook'

export type ListMainProps = {
  listData: ListData
  listFilter: ListFilter
  listSelection: ListSelection
  listOverlays: ListOverlays
  listActions: ListActions
  showSettings: boolean
  setShowSettings: (value: boolean | ((prev: boolean) => boolean)) => void
}

export function useListMainDerived(props: ListMainProps) {
  const { listData, listFilter, listSelection } = props
  const { detailEntry, viewState } = listSelection

  const maxFrecencyScore = useMemo(() => Math.max(0, ...listData.rows.map(row => row.frecencyScore)), [listData.rows])
  const filterDropdownStats = useFilterDropdownStats(getListStats, {
    filterOpen: listFilter.filterOpen,
    baseStats: listData.stats,
    debouncedSearch: listData.debouncedSearch,
    types: listData.types,
    tags: listData.tags,
    taskView: listData.taskView
  })
  const footerStatus = formatListFooterStatus({
    matchTotal: listData.matchTotal,
    showing: listData.rows.length,
    pageSize: listData.pageSize,
    loading: listData.loading
  })
  const listPanelClass =
    detailEntry === null
      ? 'cmp-list-panel'
      : viewState === 'split'
        ? 'cmp-list-panel cmp-list-panel--narrow'
        : 'cmp-list-panel cmp-list-panel--hidden'
  const detailPanelClass =
    detailEntry === null ? '' : viewState === 'detail' ? 'cmp-detail cmp-detail--full' : 'cmp-detail'
  const filterSummary = listFilterSummary(listData.types, listData.tags, listData.taskView)
  const filterActive = listData.taskView !== undefined || listData.types.length > 0 || listData.tags.length > 0
  const filterChipCls = `cmp-filter-chip${filterActive ? ' cmp-filter-chip--active' : ''}`
  const powertoysClass = viewState === 'detail' ? 'cmp-app-shell cmp-app-shell--detail-full' : 'cmp-app-shell'
  const isFullDetail = detailEntry !== null && viewState === 'detail'
  const showBackWithSearch = detailEntry !== null && viewState === 'split'

  return {
    detailEntry,
    viewState,
    maxFrecencyScore,
    filterDropdownStats,
    footerStatus,
    listPanelClass,
    detailPanelClass,
    filterSummary,
    filterChipCls,
    powertoysClass,
    isFullDetail,
    showBackWithSearch
  }
}

export function useListMainVirtualRows(props: ListMainProps) {
  const { listData, listSelection, listActions } = props
  const selectedIndex = listData.rows.findIndex(e => e.id === listSelection.selectedId)
  const { window: virtualWindow, rowHeight } = useVirtualListWindow(
    listData.rows.length,
    listActions.refs.listSurfaceRef,
    selectedIndex,
    listSelection.selectedId
  )
  const visibleRows = listData.rows.slice(virtualWindow.startIndex, virtualWindow.endIndex)
  const sentinelSpacersRes =
    listData.hasMore && listData.rows.length > 0
      ? listSentinelSpacers({ totalRows: listData.rows.length, rowHeight, virtualWindow })
      : null
  return { virtualWindow, visibleRows, sentinelSpacersRes }
}

export function useListMainEffects(
  props: ListMainProps,
  derived: ReturnType<typeof useListMainDerived>,
  emptySyncButtonRef: RefObject<HTMLButtonElement | null>
) {
  const { listFilter, listActions } = props
  const { detailEntry, viewState } = derived

  useLayoutEffect(() => {
    if (listActions.flags.emptyDb) emptySyncButtonRef.current?.focus()
  }, [listActions.flags.emptyDb, emptySyncButtonRef])

  useListSurfaceScrollRestore(listActions.refs.listSurfaceRef, detailEntry)

  useEffect(() => {
    if (detailEntry !== null && viewState === 'detail' && listFilter.filterOpen) {
      listFilter.setFilterOpen(false)
    }
  }, [detailEntry, viewState, listFilter.filterOpen, listFilter.setFilterOpen])

  useEffect(() => {
    if (detailEntry) return
    let attempts = 0
    const tryFocus = () => {
      const surface = listActions.refs.listSurfaceRef?.current
      if (!surface) return
      surface.focus({ preventScroll: true })
      if (document.activeElement === surface) return
      if (++attempts < 2) scheduleDoubleRaf(tryFocus)
    }
    scheduleDoubleRaf(tryFocus)
  }, [detailEntry, listActions.refs.listSurfaceRef])
}

function useGlobalShortcut(props: ListMainProps, derived: ReturnType<typeof useListMainDerived>) {
  const { listData, listSelection, listActions } = props
  const { detailEntry, viewState } = derived
  return useCallback(
    (action: 'open-editor' | 'copy-desc') => {
      const entry = resolveCurrentEntry({
        viewState,
        selectedId: listSelection.selectedId,
        detailEntry,
        rows: listData.rows,
        detailPanelHasFocus: false
      })
      if (!entry) return
      fireAndForget(executeEntryAction(entry, action, { ...listActions.actionCtx, entry }))
    },
    [viewState, listSelection.selectedId, detailEntry, listData.rows, listActions.actionCtx]
  )
}

export function useListMainHandlers(props: ListMainProps, derived: ReturnType<typeof useListMainDerived>) {
  const { listData, listSelection, listOverlays, listActions, listFilter, showSettings } = props
  const { detailEntry, viewState } = derived
  const detailScrollRef = useRef<HTMLDivElement>(null)

  const handleCycleStatus = (id: number) => {
    fireAndForget(cycleStatus(id, 'forward').then(() => listData.refreshList(false)))
  }
  const handleCyclePriority = (id: number) => {
    fireAndForget(cyclePriority(id, 'forward').then(() => listData.refreshList(false)))
  }

  const handleEntryReturn = useListMainEntryKeys({
    disabled: showSettings || listOverlays.taskSheet.taskSheetVisible || listOverlays.palette.open,
    viewState,
    rows: listData.rows,
    selectedId: listSelection.selectedId,
    detailEntry,
    detailScrollRef,
    actionCtx: listActions.actionCtx,
    entryPanelDeps: listActions.entryPanelDeps
  })

  const onSelectEntry = useCallback(
    (id: number) => {
      listSelection.setSelectedId(id)
      focusListSurface(listActions.refs.listSurfaceRef)
    },
    [listActions.refs.listSurfaceRef, listSelection.setSelectedId]
  )

  const onHoverEntry = useCallback(
    (id: number) => {
      listSelection.setSelectedId(id)
    },
    [listSelection.setSelectedId]
  )

  const focusMainSearch = useCallback(() => {
    scheduleDoubleRaf(() => listActions.refs.searchInputRef.current?.focus({ preventScroll: true }))
  }, [listActions.refs.searchInputRef])

  const handleGlobalShortcut = useGlobalShortcut(props, derived)

  const closeDetailToList = useCallback(() => {
    listSelection.closeToList()
    focusListSurface(listActions.refs.listSurfaceRef)
  }, [listActions.refs.listSurfaceRef, listSelection.closeToList])

  const toggleFilter = () => {
    if (listFilter.filterOpen) listFilter.setFilterOpen(false)
    else listFilter.openFilter()
  }

  return {
    detailScrollRef,
    handleCycleStatus,
    handleCyclePriority,
    handleEntryReturn,
    onSelectEntry,
    onHoverEntry,
    focusMainSearch,
    handleGlobalShortcut,
    closeDetailToList,
    toggleFilter
  }
}

export function useListMain(props: ListMainProps) {
  const emptySyncButtonRef = useRef<HTMLButtonElement>(null)
  const derived = useListMainDerived(props)
  const virtual = useListMainVirtualRows(props)
  const handlers = useListMainHandlers(props, derived)
  useListMainEffects(props, derived, emptySyncButtonRef)

  const listPointerSelectionActive =
    !props.showSettings &&
    !props.listOverlays.taskSheet.taskSheetVisible &&
    !props.listOverlays.palette.open &&
    derived.detailEntry === null &&
    props.listData.rows.length > 0
  useListPointerSelection({
    scrollRootRef: props.listActions.refs.listSurfaceRef,
    active: listPointerSelectionActive,
    onHoverEntry: handlers.onHoverEntry
  })

  const viewNavKeysDisabled =
    props.showSettings || props.listOverlays.taskSheet.taskSheetVisible || props.listOverlays.palette.open
  useWindowViewNavKeys({
    disabled: viewNavKeysDisabled,
    skipEscapeCapture: props.listFilter.filterOpen,
    handleKey: props.listSelection.handleKey,
    handleModL: props.listActions.handlers.handleWindowModL,
    handleListArrows: e => {
      props.listSelection.onListKeyDown(e as unknown as ReactKeyboardEvent<HTMLDivElement>)
    },
    handleEntryReturn: handlers.handleEntryReturn,
    handleGlobalShortcut: handlers.handleGlobalShortcut,
    detailScrollRef: handlers.detailScrollRef,
    detailScrollActive: derived.detailEntry !== null
  })

  const { onMouseDown: onDragStripeMouseDown } = useWindowDrag()

  return { derived, virtual, handlers, emptySyncButtonRef, onDragStripeMouseDown }
}

export type ListMainViewModel = ReturnType<typeof useListMain>
