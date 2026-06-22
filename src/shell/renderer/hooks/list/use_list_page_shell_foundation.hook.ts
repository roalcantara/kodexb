import { useCallback, useMemo, useRef } from 'react'
import { defaultEntryActionPanelDeps } from '../../actions/panel/deps.service'
import type { EntryActionContext } from '../../actions/panel/panel.types'
import { hideWindow } from '../../rpc/client'
import { focusListSurface } from '../../utils/list/list_keyboard.util'
import { useActionToast } from '../shared/use_action_toast.hook'
import { useListFilterOverlay } from './use_list_filter_overlay.hook'
import { useListPageData } from './use_list_page_data.hook'
import { useListSelection } from './use_list_selection.hook'
import { useMutationError } from './use_mutation_error.hook'
import { useTaskSheetVisibility } from './use_task_sheet_visibility.hook'

export function useListPageShellFoundation({ onOpenSettings }: { onOpenSettings: () => void }) {
  const listSurfaceRef = useRef<HTMLDivElement>(null)
  const listSentinelRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { toasts: actionToasts, pushToast, dismissToast: dismissActionToast } = useActionToast()
  const data = useListPageData({ pushToast })
  const filter = useListFilterOverlay()
  const taskSheet = useTaskSheetVisibility(data.refreshList)
  const mutation = useMutationError()

  const onLeaveListUpward = useCallback(() => {
    searchInputRef.current?.focus()
  }, [])
  const onEscapeFromSearch = useCallback(() => {
    searchInputRef.current?.blur()
    focusListSurface(listSurfaceRef)
  }, [])

  const actionCtx = useMemo<EntryActionContext>(
    () => ({
      entry: null,
      pushToast,
      onEditTask: taskSheet.handleEditTask,
      onNewTask: taskSheet.handleNewTask,
      onSync: data.onSync,
      onOpenSettings
    }),
    [pushToast, taskSheet.handleEditTask, taskSheet.handleNewTask, data.onSync, onOpenSettings]
  )
  const entryPanelDeps = useMemo(() => defaultEntryActionPanelDeps(), [])
  const sel = useListSelection(
    data.rows,
    onLeaveListUpward,
    () => focusListSurface(listSurfaceRef),
    searchInputRef,
    hideWindow,
    pushToast,
    onEscapeFromSearch,
    actionCtx
  )

  return {
    refs: { searchInputRef, listSurfaceRef, listSentinelRef },
    actionToasts,
    pushToast,
    dismissActionToast,
    data,
    filter,
    taskSheet,
    mutation,
    actionCtx,
    entryPanelDeps,
    sel
  }
}

export type ListPageShellFoundation = ReturnType<typeof useListPageShellFoundation>
