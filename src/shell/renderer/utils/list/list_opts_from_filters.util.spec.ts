import { describe, expect, it } from 'bun:test'
import { listOptsFromListFilters } from './list_opts_from_filters.util'

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
