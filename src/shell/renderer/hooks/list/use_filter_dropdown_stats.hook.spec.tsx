import { describe, expect, it, mock } from 'bun:test'
import { sampleListStats } from '@testing/fixtures/list_stats.fixture'
import { renderHook } from '@testing-library/react'

import { useFilterDropdownStats } from './use_filter_dropdown_stats.hook'

describe('useFilterDropdownStats', () => {
  const baseStats = sampleListStats()

  const fetchScopedMock = mock(() => Promise.resolve(baseStats))

  describe('when filter is closed', () => {
    it('yields null', () => {
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
  })
})
