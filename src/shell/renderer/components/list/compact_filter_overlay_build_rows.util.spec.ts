/// <reference lib="dom" />
import { expect, test } from 'bun:test'
import type { ListStats } from '@shared/rpc'

import { buildFilterRows, groupFilterRowsIntoSections } from './compact_filter_overlay_build_rows.util'

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
  tags: { a: 1 },
  byType: { bookmark: 1, command: 0, cheat: 0, task: 2 }
}

test('groupFilterRowsIntoSections splits by kind in build order', () => {
  const tagRows = [{ tag: 'a', count: 1 }]
  const rows = buildFilterRows(stats, [], [], undefined, tagRows, '')
  const sections = groupFilterRowsIntoSections(rows)
  expect(sections.map(s => s.title)).toEqual(['Quick', 'Task views', 'Types', 'Tags'])
  expect(sections[0]?.rows).toHaveLength(1)
  expect(sections[1]?.rows.length).toBeGreaterThan(0)
})

test('buildFilterRows omits type facet rows with zero count unless selected', () => {
  const rows = buildFilterRows(stats, [], [], undefined, [{ tag: 'a', count: 1 }], '')
  const commands = rows.filter(r => r.kind === 'type' && r.label === 'Command')
  expect(commands).toHaveLength(0)
})

test('buildFilterRows keeps zero-count type row when that type is selected', () => {
  const rows = buildFilterRows(stats, ['command'], [], undefined, [{ tag: 'a', count: 1 }], '')
  const commands = rows.filter(r => r.kind === 'type' && r.label === 'Command')
  expect(commands).toHaveLength(1)
})
