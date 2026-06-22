import { useListPageShellFoundation } from './use_list_page_shell_foundation.hook'
import { useListPageShellOverlays, useListPageShellTaskOps } from './use_list_page_shell_overlays.hook'
import { useListPageShellScroll } from './use_list_page_shell_scroll.hook'

export function useListPageShell({
  showSettings,
  onOpenSettings
}: {
  showSettings: boolean
  onOpenSettings: () => void
}) {
  const foundation = useListPageShellFoundation({ onOpenSettings })
  const overlays = useListPageShellOverlays(foundation, showSettings, onOpenSettings)
  useListPageShellScroll(foundation, {
    showSettings,
    paletteOpen: overlays.palette.open,
    quickLookupOpen: overlays.quickLookup.open
  })
  const taskOps = useListPageShellTaskOps(foundation, overlays)

  const {
    data,
    filter,
    taskSheet,
    mutation,
    actionCtx,
    entryPanelDeps,
    sel,
    refs,
    actionToasts,
    dismissActionToast,
    pushToast
  } = foundation

  return {
    data,
    filter,
    sel,
    taskSheet: {
      taskSheetVisible: taskSheet.taskSheetVisible,
      taskSheetEntry: taskSheet.taskSheetEntry,
      onCloseTaskSheet: taskSheet.onCloseTaskSheet
    },
    palette: overlays.palette,
    quickLookup: overlays.quickLookup,
    handlers: taskOps.handlers,
    refs,
    dragDrop: taskOps.dragDrop,
    actionCtx,
    entryPanelDeps,
    actionToasts,
    dismissActionToast,
    pushToast,
    flags: taskOps.flags,
    mutationError: mutation.mutationError,
    clearMutationError: mutation.clearMutationError
  }
}

export type ListPageShell = ReturnType<typeof useListPageShell>

export type ListData = ListPageShell['data']
export type ListFilter = ListPageShell['filter']
export type ListSelection = ListPageShell['sel']
export type ListActions = Omit<ListPageShell, 'data' | 'filter' | 'sel' | 'taskSheet' | 'palette' | 'quickLookup'>
export type ListOverlays = Pick<ListPageShell, 'taskSheet' | 'palette' | 'quickLookup'>
