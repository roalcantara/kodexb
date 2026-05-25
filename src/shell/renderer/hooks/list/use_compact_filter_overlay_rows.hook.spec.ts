import { describe, expect, it } from 'bun:test'
import type { ListStats } from '@shared/rpc'
import { renderHook } from '@testing-library/react'

import { useCompactFilterOverlayRows } from './use_compact_filter_overlay_rows.hook'

describe('useCompactFilterOverlayRows', () => {
  const stats: ListStats = {
    total: 2,
    bookmark: 1,
    command: 0,
    cheat: 0,
    task: 1,
    taskViews: {
      actionable: 0,
      today: 0,
      overdue: 0,
      this_week: 0,
      all_pending: 1,
      all_doing: 0
    },
    tags: { brew: 1 },
    byType: { bookmark: 1, command: 0, cheat: 0, task: 1 }
  }

  describe('with stats and unselected filters', () => {
    it('builds facet and scroll sections', () => {
      const { result } = renderHook(() => useCompactFilterOverlayRows(stats, [], [], undefined, ''))
      expect(result.current.filterRows.length).toBeGreaterThan(0)
      expect(result.current.facetSectionRows.length).toBeGreaterThan(0)
      expect(result.current.filterRowsScrollKey).toContain('all')
    })
  })
})
