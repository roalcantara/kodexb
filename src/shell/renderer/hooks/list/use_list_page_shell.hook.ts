import type { TaskView } from '@shared/rpc'
import { useCallback, useRef } from 'react'
import type { EntryTypeOption } from '../../components/list/filter_dropdown.component'
import { listPageEmptyFlags } from '../../utils/list/list_page_empty_flags.util'
import { focusListSurface } from '../../utils/list/list_surface_focus.util'
import { useListDetailResize } from './use_list_detail_resize.hook'
import { useListFilterOverlay } from './use_list_filter_overlay.hook'
import { useListPageCmdKeyStub } from './use_list_page_cmd_key_stub.hook'
import { useListPageData } from './use_list_page_data.hook'
import { useListSelection } from './use_list_selection.hook'
import { useListSentinelPagination } from './use_list_sentinel_pagination.hook'
import { useListSurfaceKeyDown } from './use_list_surface_keydown.hook'
import { useListViewportPageSize } from './use_list_viewport_page_size.hook'

export function useListPageShell() {
  const listSurfaceRef = useRef<HTMLDivElement>(null)
  const listSentinelRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const syncButtonRef = useRef<HTMLButtonElement>(null)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const pageSize = useListViewportPageSize(listSurfaceRef)
  const data = useListPageData({ pageSizeOverride: pageSize })
  const filter = useListFilterOverlay()
  const detailLayout = useListDetailResize()
  const onLeaveListUpward = useCallback(() => {
    searchInputRef.current?.focus()
  }, [])
  const sel = useListSelection(data.rows, detailLayout, onLeaveListUpward, () => {
    focusListSurface(listSurfaceRef)
  })
  const fetchMore = useCallback(() => data.refreshList(true), [data.refreshList])

  useListSentinelPagination({
    scrollRootRef: listSurfaceRef,
    sentinelRef: listSentinelRef,
    hasMore: data.hasMore,
    loading: data.loading,
    fetchMore
  })
  useListPageCmdKeyStub()

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

  return {
    data,
    filter,
    detailLayout,
    sel,
    flags,
    listSurfaceRef,
    listSentinelRef,
    searchInputRef,
    syncButtonRef,
    settingsButtonRef,
    onSearchArrowDown,
    onListSurfaceKeyDown,
    onFilterChange
  }
}

export type ListPageShell = ReturnType<typeof useListPageShell>
