import { describe, expect, it } from 'bun:test'
import { listOptsFromListFilters } from './list_opts_from_filters.util'

describe('listOptsFromListFilters', () => {
  it('omits query when search is blank', () => {
    expect(
      listOptsFromListFilters({
        query: '   ',
        types: [],
        tags: []
      })
    ).toEqual({})
  })

  it('includes limit and offset when provided', () => {
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
