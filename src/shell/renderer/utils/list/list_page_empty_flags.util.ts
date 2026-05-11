import type { useListPageData } from '../../hooks/list/use_list_page_data.hook'

type ListData = ReturnType<typeof useListPageData>

export function listPageEmptyFlags(data: ListData) {
  const emptyDb = data.dbStats !== null && data.dbStats.total === 0
  const noResults = !data.loading && data.rows.length === 0 && data.debouncedSearch.trim() !== '' && !emptyDb
  const emptyList = !data.loading && data.rows.length === 0 && data.debouncedSearch.trim() === '' && !emptyDb
  return { emptyDb, noResults, emptyList }
}
