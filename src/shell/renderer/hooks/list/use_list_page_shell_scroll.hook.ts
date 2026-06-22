import { useCallback } from 'react'
import { listWheelScrollActive } from '../../utils/list/list_page_state.util'
import type { ListPageShellFoundation } from './use_list_page_shell_foundation.hook'
import { useListSentinelPagination } from './use_list_sentinel_pagination.hook'
import { useListSurfaceWheelScroll } from './use_list_surface_wheel_scroll.hook'

type OverlayGates = {
  showSettings: boolean
  paletteOpen: boolean
  quickLookupOpen: boolean
}

export function useListPageShellScroll(foundation: ListPageShellFoundation, gates: OverlayGates) {
  const { data, filter, taskSheet, sel, refs } = foundation

  const fetchMore = useCallback(() => data.refreshList(true), [data.refreshList])
  useListSentinelPagination({
    scrollRootRef: refs.listSurfaceRef,
    sentinelRef: refs.listSentinelRef,
    hasMore: data.hasMore,
    loading: data.loading,
    fetchMore
  })

  useListSurfaceWheelScroll({
    scrollRootRef: refs.listSurfaceRef,
    active: listWheelScrollActive({
      showSettings: gates.showSettings,
      taskSheetVisible: taskSheet.taskSheetVisible,
      filterOpen: filter.filterOpen,
      paletteOpen: gates.paletteOpen,
      quickLookupOpen: gates.quickLookupOpen,
      syncModalOpen: data.syncUi.open,
      detailEntry: sel.detailEntry,
      viewState: sel.viewState
    })
  })
}
