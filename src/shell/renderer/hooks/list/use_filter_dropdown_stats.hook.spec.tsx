/// <reference lib="dom" />
import { expect, mock, test } from 'bun:test'
import { sampleListStats } from '@testing/fixtures/list_stats.fixture'
import { renderHook } from '@testing-library/react'

import { useFilterDropdownStats } from './use_filter_dropdown_stats.hook'

const baseStats = sampleListStats()

const fetchScopedMock = mock(() => Promise.resolve(baseStats))

test('useFilterDropdownStats yields null while filter is closed', () => {
  const { result } = renderHook(() =>
    useFilterDropdownStats(fetchScopedMock, {
      filterOpen: false,
      baseStats,
      debouncedSearch: '',
      types: [],
      tags: []
    })
  )
  expect(result.current).toBeNull()
})
