import { describe, expect, it, mock } from 'bun:test'
import type { ListStats } from '@shared/rpc'
import { renderHook } from '@testing-library/react'

import { type CompactFilterOverlayHookProps, useCompactFilterOverlay } from './use_compact_filter_overlay.hook'

describe('useCompactFilterOverlay', () => {
  const stats: ListStats = {
    total: 1,
    bookmark: 1,
    command: 0,
    cheat: 0,
    task: 0,
    taskViews: {
      actionable: 0,
      today: 0,
      overdue: 0,
      this_week: 0,
      all_pending: 0,
      all_doing: 0
    },
    tags: {},
    byType: { bookmark: 1, command: 0, cheat: 0, task: 0 }
  }

  describe('when hook is rendered', () => {
    it('exposes search and filter rows', () => {
      const onChange = mock<CompactFilterOverlayHookProps['onChange']>(() => undefined)
      const onClose = mock<() => void>(() => undefined)
      const { result } = renderHook(() => useCompactFilterOverlay({ stats, types: [], tags: [], onChange, onClose }))
      expect(result.current.search).toBe('')
      expect(result.current.filterRows.length).toBeGreaterThan(0)
    })
  })
})
