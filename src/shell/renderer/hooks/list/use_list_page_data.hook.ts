import { effectiveListPageSize } from '../../utils/list/virtual_list.util'
import { useListPageFilters } from './use_list_page_filters.hook'
import { useListPageRows } from './use_list_page_rows.hook'
import { useListPageStatsSync } from './use_list_page_stats_sync.hook'

export function useListPageData(opts: {
  pageSizeOverride?: number
  pushToast: (message: string, type?: 'success' | 'error') => void
}) {
  const filters = useListPageFilters()
  const pageSize = effectiveListPageSize(opts.pageSizeOverride, filters.pageSize)
  const { rows, loading, hasMore, refreshList, matchTotal } = useListPageRows({
    debouncedSearch: filters.debouncedSearch,
    types: filters.types,
    tags: filters.tags,
    taskView: filters.taskView,
    pageSize
  })
  const { stats, dbStats, syncing, syncUi, dismissSyncModal, onSync, syncInfo } = useListPageStatsSync({
    refreshList,
    pushToast: opts.pushToast
  })

  return {
    rows,
    stats,
    dbStats,
    syncInfo,
    search: filters.search,
    setSearch: filters.setSearch,
    debouncedSearch: filters.debouncedSearch,
    types: filters.types,
    tags: filters.tags,
    taskView: filters.taskView,
    setTypes: filters.setTypes,
    setTags: filters.setTags,
    setTaskView: filters.setTaskView,
    pageSize,
    setPageSize: filters.setPageSize,
    hasMore,
    loading,
    matchTotal,
    syncing,
    refreshList,
    onSync,
    syncUi,
    dismissSyncModal
  }
}
