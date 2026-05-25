import { describe, expect, it } from 'bun:test'

import { listFilterSummary, listOptsFromListFilters } from './list_filters.util'

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

describe('listOptsFromListFilters', () => {
  describe('when search is blank', () => {
    it('omits query', () => {
      expect(
        listOptsFromListFilters({
          query: '   ',
          types: [],
          tags: []
        })
      ).toEqual({})
    })
  })

  describe('with limit and offset', () => {
    it('includes all provided fields', () => {
      expect(
        listOptsFromListFilters({
          query: 'a',
          types: ['bookmark'],
          tags: ['t1'],
          limit: 25,
          offset: 50
        })
      ).toEqual({
        query: 'a',
        types: ['bookmark'],
        tags: ['t1'],
        limit: 25,
        offset: 50
      })
    })
  })
})
