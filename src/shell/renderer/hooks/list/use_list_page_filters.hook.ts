import type { EntryType } from '@core/domain/types/entry.types'
import type { TaskView } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { useEffect, useState } from 'react'
import { DEFAULT_LIST_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../../constants/ui.const'
import { getConfig } from '../../rpc/client'
import { useDebouncedValue } from '../shared/use_debounced_value.hook'

export function useListPageFilters() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)
  const [types, setTypes] = useState<EntryType[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [taskView, setTaskView] = useState<TaskView | undefined>(undefined)
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE)

  useEffect(() => {
    fireAndForget(
      getConfig().then(cfg => {
        const ps = Number.parseInt(cfg.display.pageSize, 10)
        if (Number.isFinite(ps) && ps > 0) setPageSize(ps)
      })
    )
  }, [])

  return {
    search,
    setSearch,
    debouncedSearch,
    types,
    setTypes,
    tags,
    setTags,
    taskView,
    setTaskView,
    pageSize,
    setPageSize
  }
}
