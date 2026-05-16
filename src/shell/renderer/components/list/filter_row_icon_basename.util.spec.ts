/// <reference lib="dom" />
import { expect, test } from 'bun:test'

import { filterRowIconBasename } from './filter_row_icon_basename.util'

test('filterRowIconBasename maps all row to list', () => {
  expect(filterRowIconBasename({ id: '__all__', kind: 'all' })).toBe('list')
})

test('filterRowIconBasename maps task views', () => {
  expect(filterRowIconBasename({ id: 'tv__actionable', kind: 'taskView' })).toBe('task_warrior')
  expect(filterRowIconBasename({ id: 'tv__today', kind: 'taskView' })).toBe('calendar')
  expect(filterRowIconBasename({ id: 'tv__overdue', kind: 'taskView' })).toBe('important')
  expect(filterRowIconBasename({ id: 'tv__this_week', kind: 'taskView' })).toBe('days')
  expect(filterRowIconBasename({ id: 'tv__all_pending', kind: 'taskView' })).toBe('sheets')
  expect(filterRowIconBasename({ id: 'tv__all_doing', kind: 'taskView' })).toBe('build')
})

test('filterRowIconBasename maps types via ENTRY_TYPE_DEFAULT_SVG_BASENAME', () => {
  expect(filterRowIconBasename({ id: 'type__bookmark', kind: 'type' })).toBe('bookmark')
  expect(filterRowIconBasename({ id: 'type__command', kind: 'type' })).toBe('terminal')
  expect(filterRowIconBasename({ id: 'type__cheat', kind: 'type' })).toBe('markdown')
  expect(filterRowIconBasename({ id: 'type__task', kind: 'type' })).toBe('checklist')
})

test('filterRowIconBasename maps tags to hash', () => {
  expect(filterRowIconBasename({ id: 'tag__ruby', kind: 'tag' })).toBe('hash')
})
