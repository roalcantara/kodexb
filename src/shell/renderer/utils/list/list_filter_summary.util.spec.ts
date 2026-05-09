import { expect, test } from 'bun:test'

import { listFilterSummary } from './list_filter_summary.util'

test('listFilterSummary prefers task view label', () => {
  expect(listFilterSummary([], [], 'overdue')).toContain('Overdue')
})

test('listFilterSummary uses single type label', () => {
  expect(listFilterSummary(['task'], [], undefined)).toContain('Task')
})
