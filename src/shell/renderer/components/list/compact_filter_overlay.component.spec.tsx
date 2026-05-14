/// <reference lib="dom" />
import { expect, test } from 'bun:test'
import type { ListStats } from '@shared/rpc'
import { render, screen } from '@testing-library/react'

import { CompactFilterOverlay } from './compact_filter_overlay.component'

const noop = () => undefined

const stats: ListStats = {
  total: 3,
  bookmark: 1,
  command: 0,
  cheat: 0,
  task: 2,
  taskViews: {
    actionable: 0,
    today: 0,
    overdue: 0,
    this_week: 0,
    all_pending: 2,
    all_doing: 0
  },
  tags: {},
  byType: { bookmark: 1, command: 0, cheat: 0, task: 2 }
}

test('CompactFilterOverlay shows filter search and All row', () => {
  render(<CompactFilterOverlay stats={stats} types={[]} tags={[]} onChange={noop} onClose={noop} />)
  expect(screen.getByPlaceholderText('Search filters…')).toBeTruthy()
  expect(screen.getByRole('option', { name: new RegExp(`^All \\(${stats.total}\\)$`) })).toBeTruthy()
})
