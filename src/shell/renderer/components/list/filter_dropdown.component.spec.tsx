/// <reference lib="dom" />
import { expect, test } from 'bun:test'
import type { ListStats } from '@shared/rpc'
import { render, screen } from '@testing-library/react'

import { FilterDropdown } from './filter_dropdown.component'

const noop = () => undefined

const stats: ListStats = {
  total: 10,
  bookmark: 1,
  command: 1,
  cheat: 1,
  task: 6,
  taskViews: {
    actionable: 1,
    today: 0,
    overdue: 0,
    this_week: 0,
    all_pending: 5,
    all_doing: 0
  },
  tags: { git: 2 },
  byType: { bookmark: 1, command: 1, cheat: 1, task: 6 }
}

test('FilterDropdown hides Task views when only bookmark type selected', () => {
  render(
    <FilterDropdown
      open
      anchorRect={{ bottom: 40, left: 8, width: 200 } as DOMRect}
      stats={stats}
      types={['bookmark']}
      tags={[]}
      onChange={noop}
      onClose={noop}
    />
  )
  expect(screen.queryByText('Task views')).toBeNull()
})

test('FilterDropdown shows Task views when type filter is empty', () => {
  render(
    <FilterDropdown
      open
      anchorRect={{ bottom: 40, left: 8, width: 200 } as DOMRect}
      stats={stats}
      types={[]}
      tags={[]}
      onChange={noop}
      onClose={noop}
    />
  )
  expect(screen.getByText('Task views')).toBeTruthy()
})
