/// <reference lib="dom" />
import { describe, expect, it } from 'bun:test'

import { filterRowIconBasename } from './filter_row_icon_basename.util'

describe('filterRowIconBasename', () => {
  describe('with all row kind', () => {
    it('maps to list icon', () => {
      expect(filterRowIconBasename({ id: '__all__', kind: 'all' })).toBe('list')
    })
  })

  describe('with taskView kind', () => {
    it('maps task views to icons', () => {
      expect(filterRowIconBasename({ id: 'tv__actionable', kind: 'taskView' })).toBe('task_warrior')
      expect(filterRowIconBasename({ id: 'tv__today', kind: 'taskView' })).toBe('calendar')
      expect(filterRowIconBasename({ id: 'tv__overdue', kind: 'taskView' })).toBe('important')
      expect(filterRowIconBasename({ id: 'tv__this_week', kind: 'taskView' })).toBe('days')
      expect(filterRowIconBasename({ id: 'tv__all_pending', kind: 'taskView' })).toBe('sheets')
      expect(filterRowIconBasename({ id: 'tv__all_doing', kind: 'taskView' })).toBe('build')
    })
  })

  describe('with type kind', () => {
    it('maps types to default SVGs', () => {
      expect(filterRowIconBasename({ id: 'type__bookmark', kind: 'type' })).toBe('bookmark')
      expect(filterRowIconBasename({ id: 'type__command', kind: 'type' })).toBe('terminal')
      expect(filterRowIconBasename({ id: 'type__cheat', kind: 'type' })).toBe('markdown')
      expect(filterRowIconBasename({ id: 'type__task', kind: 'type' })).toBe('checklist')
    })
  })

  describe('with tag kind', () => {
    it('maps to hash icon', () => {
      expect(filterRowIconBasename({ id: 'tag__ruby', kind: 'tag' })).toBe('hash')
    })
  })
})
