import type { RpcKnowledge, TaskView } from '@shared/rpc'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { EntryActionContext } from '../../actions/entry_action_panel.types'
import { defaultEntryActionPanelDeps } from '../../actions/entry_action_panel_deps.util'
import type { EntryTypeOption } from '../../components/list/filter_dropdown.component'
import { deleteTask, hideWindow, reorderTask } from '../../rpc/client'
import { listPageEmptyFlags } from '../../utils/list/list_page_empty_flags.util'
import { focusListSurface } from '../../utils/list/list_surface_focus.util'
import { scheduleDoubleRaf } from '../../utils/list/schedule_double_raf.util'
import { useActionToast } from '../shared/use_action_toast.hook'
import { useCommandPalette } from './use_command_palette.hook'
import { useListFilterOverlay } from './use_list_filter_overlay.hook'
import { useListPageData } from './use_list_page_data.hook'
import { useListSelection } from './use_list_selection.hook'
import { useListSentinelPagination } from './use_list_sentinel_pagination.hook'
import { useListSurfaceKeyDown } from './use_list_surface_keydown.hook'
import { useListViewportPageSize } from './use_list_viewport_page_size.hook'
import { useTaskDragDrop } from './use_task_drag_drop.hook'
import { useTaskKeyboard } from './use_task_keyboard.hook'

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: shell composes list, palette, task sheet, toasts
export function useListPageShell({ showSettings }: { showSettings: boolean }) {
  const listSurfaceRef = useRef<HTMLDivElement>(null)
  const listSentinelRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const syncButtonRef = useRef<HTMLButtonElement>(null)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const newTaskButtonRef = useRef<HTMLButtonElement>(null)
  const pageSize = useListViewportPageSize(listSurfaceRef)
  const { toasts: actionToasts, pushToast, dismissToast: dismissActionToast } = useActionToast()
  const data = useListPageData({ pageSizeOverride: pageSize, pushToast })
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
      onSync: data.onSync
    }),
    [pushToast, handleEditTask, handleNewTask, data.onSync]
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
  const palette = useCommandPalette({
    selectedId: sel.selectedId,
    rows: data.rows,
    pushToast,
    actionCtx,
    onEditTask: handleEditTask,
    onNewTask: handleNewTask,
    onSync: data.onSync,
    setFilterOpen: filter.setFilterOpen,
    shortcutsBlocked: showSettings || taskSheetVisible,
    entryPanelDeps
  })

  const flags = listPageEmptyFlags(data)
  const onSearchArrowDown = () => {
    sel.selectFirst()
    focusListSurface(listSurfaceRef)
  }
  const onFilterChange = (next: { types: EntryTypeOption[]; tags: string[]; taskView?: TaskView }) => {
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
    data.refreshList(false).catch(() => undefined)
  }, [data.refreshList])

  const handleRequestDelete = useCallback(
    (entry: RpcKnowledge) => {
      deleteTask(entry.id)
        .then(() => data.refreshList(false).catch(() => undefined))
        .catch(() => undefined)
    },
    [data.refreshList]
  )

  useTaskKeyboard({
    selectedId: sel.selectedId,
    rows: data.rows,
    onRefresh: () => data.refreshList(false).catch(() => undefined),
    onNewTask: handleNewTask,
    onRequestDelete: handleRequestDelete
  })

  const dragDrop = useTaskDragDrop(data.rows, id => {
    reorderTask(id.entryId, id.dir)
      .then(() => {
        data.refreshList(false).catch(() => undefined)
      })
      .catch(() => undefined)
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
    syncButtonRef,
    settingsButtonRef,
    newTaskButtonRef,
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
    actionCtx,
    entryPanelDeps,
    actionToasts,
    dismissActionToast,
    pushToast
  }
}

export type ListPageShell = ReturnType<typeof useListPageShell>
