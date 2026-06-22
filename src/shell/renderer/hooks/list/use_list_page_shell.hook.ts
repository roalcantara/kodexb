import type { EntryType } from '@core/domain/types/entry.types'
import type { RpcKnowledge, TaskView } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { EntryActionContext } from '../../actions/panel.types'
import { defaultEntryActionPanelDeps } from '../../actions/panel_deps.util'
import { useQuickLookupState } from '../../hooks/shortcuts/use_quick_lookup_state.hook'
import { deleteTask, hideWindow, reorderTask } from '../../rpc/client'
import { focusListSurface } from '../../utils/list/list_keyboard.util'
import { listPageEmptyFlags } from '../../utils/list/list_page_state.util'
import { scheduleDoubleRaf } from '../../utils/list/list_scroll.util'
import { useActionToast } from '../shared/use_action_toast.hook'
import { useCommandPalette } from './use_command_palette.hook'
import { useListFilterOverlay } from './use_list_filter_overlay.hook'
import { useListPageData } from './use_list_page_data.hook'
import { useListSelection } from './use_list_selection.hook'
import { useListSentinelPagination } from './use_list_sentinel_pagination.hook'
import { useListSurfaceKeyDown } from './use_list_surface_keydown.hook'
import { useListSurfaceWheelScroll } from './use_list_surface_wheel_scroll.hook'
import { useMutationError } from './use_mutation_error.hook'
import { useTaskDragDrop } from './use_task_drag_drop.hook'
import { useTaskKeyboard } from './use_task_keyboard.hook'

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: shell composes list, palette, task sheet, toasts
export function useListPageShell({
  showSettings,
  onOpenSettings
}: {
  showSettings: boolean
  onOpenSettings: () => void
}) {
  const listSurfaceRef = useRef<HTMLDivElement>(null)
  const listSentinelRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { toasts: actionToasts, pushToast, dismissToast: dismissActionToast } = useActionToast()
  const data = useListPageData({ pushToast })
  const filter = useListFilterOverlay()
  const onLeaveListUpward = useCallback(() => {
    searchInputRef.current?.focus()
  }, [])
  const onEscapeFromSearch = useCallback(() => {
    searchInputRef.current?.blur()
    focusListSurface(listSurfaceRef)
  }, [])

  const [taskSheetEntry, setTaskSheetEntry] = useState<RpcKnowledge | null>(null)
  const [taskSheetOpen, setTaskSheetOpen] = useState(false)
  const taskSheetVisible = taskSheetOpen
  const { mutationError, setMutationError, clearMutationError } = useMutationError()

  const handleNewTask = useCallback(() => {
    setTaskSheetEntry(null)
    setTaskSheetOpen(true)
  }, [])

  const handleEditTask = useCallback((entry: RpcKnowledge) => {
    setTaskSheetEntry(entry)
    setTaskSheetOpen(true)
  }, [])

  const actionCtx = useMemo<EntryActionContext>(
    () => ({
      entry: null,
      pushToast,
      onEditTask: handleEditTask,
      onNewTask: handleNewTask,
      onSync: data.onSync,
      onOpenSettings
    }),
    [pushToast, handleEditTask, handleNewTask, data.onSync, onOpenSettings]
  )

  const entryPanelDeps = useMemo(() => defaultEntryActionPanelDeps(), [])

  const sel = useListSelection(
    data.rows,
    onLeaveListUpward,
    () => {
      focusListSurface(listSurfaceRef)
    },
    searchInputRef,
    hideWindow,
    pushToast,
    onEscapeFromSearch,
    actionCtx
  )

  const handleWindowModL = useCallback(
    (e: KeyboardEvent) => {
      if (data.syncUi.open) {
        data.dismissSyncModal()
        scheduleDoubleRaf(() => {
          sel.handleKey(e)
        })
        return
      }
      sel.handleKey(e)
    },
    [data.syncUi.open, data.dismissSyncModal, sel.handleKey]
  )
  const fetchMore = useCallback(() => data.refreshList(true), [data.refreshList])

  useListSentinelPagination({
    scrollRootRef: listSurfaceRef,
    sentinelRef: listSentinelRef,
    hasMore: data.hasMore,
    loading: data.loading,
    fetchMore
  })
  const quickLookup = useQuickLookupState({
    isBlocked: showSettings || taskSheetVisible || filter.filterOpen,
    onAfterClose: () => searchInputRef.current?.focus({ preventScroll: true })
  })

  const palette = useCommandPalette({
    selectedId: sel.selectedId,
    rows: data.rows,
    pushToast,
    actionCtx,
    onEditTask: handleEditTask,
    onNewTask: handleNewTask,
    onSync: data.onSync,
    onOpenSettings,
    setFilterOpen: filter.setFilterOpen,
    shortcutsBlocked: showSettings || taskSheetVisible || quickLookup.open,
    entryPanelDeps
  })

  const listPanelWheelActive =
    !showSettings &&
    !taskSheetVisible &&
    !filter.filterOpen &&
    !palette.open &&
    !quickLookup.open &&
    !data.syncUi.open &&
    (sel.detailEntry === null || sel.viewState === 'split')

  useListSurfaceWheelScroll({
    scrollRootRef: listSurfaceRef,
    active: listPanelWheelActive
  })

  const flags = listPageEmptyFlags(data)
  const onSearchArrowDown = () => {
    sel.selectFirst()
    focusListSurface(listSurfaceRef)
  }
  const onFilterChange = (next: { types: EntryType[]; tags: string[]; taskView?: TaskView }) => {
    data.setTypes(next.types)
    data.setTags(next.tags)
    data.setTaskView(next.taskView)
  }

  const onListSurfaceKeyDown = useListSurfaceKeyDown({
    setSearch: data.setSearch,
    onListKeyDown: sel.onListKeyDown,
    setSelectedId: sel.setSelectedId,
    searchInputRef
  })

  const handleCloseTaskSheet = useCallback(() => {
    setTaskSheetEntry(null)
    setTaskSheetOpen(false)
    fireAndForget(data.refreshList(false))
  }, [data.refreshList])

  const handleRequestDelete = useCallback(
    (entry: RpcKnowledge) => {
      fireAndForget(deleteTask(entry.id).then(() => data.refreshList(false)))
    },
    [data.refreshList]
  )

  useTaskKeyboard({
    selectedId: sel.selectedId,
    rows: data.rows,
    onRefresh: () => fireAndForget(data.refreshList(false)),
    onNewTask: handleNewTask,
    onRequestDelete: handleRequestDelete,
    onMutationError: setMutationError
  })

  const dragDrop = useTaskDragDrop(data.rows, id => {
    fireAndForget(reorderTask(id.entryId, id.dir).then(() => data.refreshList(false)))
  })

  return {
    data,
    filter,
    sel,
    onListKeyDown: sel.onListKeyDown,
    handleWindowModL,
    flags,
    listSurfaceRef,
    listSentinelRef,
    searchInputRef,
    onSearchArrowDown,
    onListSurfaceKeyDown,
    onFilterChange,
    taskSheetVisible,
    taskSheetEntry,
    onNewTask: handleNewTask,
    onEditTask: handleEditTask,
    onCloseTaskSheet: handleCloseTaskSheet,
    dragDrop,
    palette,
    quickLookup,
    actionCtx,
    entryPanelDeps,
    actionToasts,
    dismissActionToast,
    pushToast,
    mutationError,
    clearMutationError
  }
}

export type ListPageShell = ReturnType<typeof useListPageShell>
