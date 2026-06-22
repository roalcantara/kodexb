import type { EntryType } from '@core/domain/types/entry.types'
import type { TaskView } from '@shared/rpc'
import { useCallback } from 'react'
import { useQuickLookupState } from '../../hooks/shortcuts/use_quick_lookup_state.hook'
import { focusListSurface } from '../../utils/list/list_keyboard.util'
import { listPageEmptyFlags } from '../../utils/list/list_page_state.util'
import { scheduleDoubleRaf } from '../../utils/list/list_scroll.util'
import { useCommandPalette } from './use_command_palette.hook'
import type { ListPageShellFoundation } from './use_list_page_shell_foundation.hook'
import { useListPageShellTaskInteractions } from './use_list_page_shell_task_interactions.hook'
import { useListSurfaceKeyDown } from './use_list_surface_keydown.hook'

export function useListPageShellOverlays(
  foundation: ListPageShellFoundation,
  showSettings: boolean,
  onOpenSettings: () => void
) {
  const { data, filter, taskSheet, actionCtx, entryPanelDeps, sel } = foundation

  const handleWindowModL = useCallback(
    (e: KeyboardEvent) => {
      if (data.syncUi.open) {
        data.dismissSyncModal()
        scheduleDoubleRaf(() => sel.handleKey(e))
        return
      }
      sel.handleKey(e)
    },
    [data.syncUi.open, data.dismissSyncModal, sel.handleKey]
  )

  const quickLookup = useQuickLookupState({
    isBlocked: showSettings || taskSheet.taskSheetVisible || filter.filterOpen,
    onAfterClose: () => foundation.refs.searchInputRef.current?.focus({ preventScroll: true })
  })

  const palette = useCommandPalette({
    selectedId: sel.selectedId,
    rows: data.rows,
    pushToast: foundation.pushToast,
    actionCtx,
    onEditTask: taskSheet.handleEditTask,
    onNewTask: taskSheet.handleNewTask,
    onSync: data.onSync,
    onOpenSettings,
    setFilterOpen: filter.setFilterOpen,
    shortcutsBlocked: showSettings || taskSheet.taskSheetVisible || quickLookup.open,
    entryPanelDeps
  })

  return { handleWindowModL, quickLookup, palette }
}

export function useListPageShellTaskOps(
  foundation: ListPageShellFoundation,
  overlays: ReturnType<typeof useListPageShellOverlays>
) {
  const { data, taskSheet, sel, refs } = foundation
  const { handleWindowModL } = overlays

  const onSearchArrowDown = useCallback(() => {
    sel.selectFirst()
    focusListSurface(refs.listSurfaceRef)
  }, [sel.selectFirst, refs.listSurfaceRef])

  const onFilterChange = useCallback(
    (next: { types: EntryType[]; tags: string[]; taskView?: TaskView }) => {
      data.setTypes(next.types)
      data.setTags(next.tags)
      data.setTaskView(next.taskView)
    },
    [data.setTypes, data.setTags, data.setTaskView]
  )

  const onListSurfaceKeyDown = useListSurfaceKeyDown({
    setSearch: data.setSearch,
    onListKeyDown: sel.onListKeyDown,
    setSelectedId: sel.setSelectedId,
    searchInputRef: refs.searchInputRef
  })

  const dragDrop = useListPageShellTaskInteractions(foundation)

  return {
    handlers: {
      onListKeyDown: sel.onListKeyDown,
      handleWindowModL,
      onSearchArrowDown,
      onListSurfaceKeyDown,
      onFilterChange,
      onNewTask: taskSheet.handleNewTask,
      onEditTask: taskSheet.handleEditTask
    },
    dragDrop,
    flags: listPageEmptyFlags(data)
  }
}
