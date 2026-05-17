import { describe, expect, it } from 'bun:test'

import { listFilterSummary } from './list_filter_summary.util'

describe('listFilterSummary', () => {
  describe('with a task view', () => {
    it('prefers task view label', () => {
      expect(listFilterSummary([], [], 'overdue')).toContain('Overdue')
    })
  })

  describe('with a single type', () => {
    it('uses type label', () => {
      expect(listFilterSummary(['task'], [], undefined)).toContain('Task')
    })
  })
})
