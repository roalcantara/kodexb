import { describe, expect, it } from 'bun:test'
import { formatListFooterStatus } from './list_footer_status.util'

describe('formatListFooterStatus', () => {
  it('shows loading when fetching first totals', () => {
    expect(
      formatListFooterStatus({
        matchTotal: null,
        showing: 0,
        pageSize: 50,
        loading: true
      })
    ).toBe('Loading results…')
  })

  it('shows full status with plural results and entries', () => {
    expect(
      formatListFooterStatus({
        matchTotal: 3667,
        showing: 50,
        pageSize: 50,
        loading: false
      })
    ).toBe('3667 results | showing 50 entries (page 1 of 74)')
  })

  it('uses singular result and entry when counts are 1', () => {
    expect(
      formatListFooterStatus({
        matchTotal: 1,
        showing: 1,
        pageSize: 50,
        loading: false
      })
    ).toBe('1 result | showing 1 entry (page 1 of 1)')
  })

  it('advances current page when more rows are loaded', () => {
    expect(
      formatListFooterStatus({
        matchTotal: 100,
        showing: 50,
        pageSize: 50,
        loading: false
      })
    ).toBe('100 results | showing 50 entries (page 1 of 2)')
    expect(
      formatListFooterStatus({
        matchTotal: 100,
        showing: 100,
        pageSize: 50,
        loading: false
      })
    ).toBe('100 results | showing 100 entries (page 2 of 2)')
  })

  it('uses page size of at least 1', () => {
    expect(
      formatListFooterStatus({
        matchTotal: 10,
        showing: 5,
        pageSize: 0,
        loading: false
      })
    ).toBe('10 results | showing 5 entries (page 5 of 10)')
  })

  it('handles zero matches', () => {
    expect(
      formatListFooterStatus({
        matchTotal: 0,
        showing: 0,
        pageSize: 50,
        loading: false
      })
    ).toBe('0 results | showing 0 entries (page 1 of 1)')
  })
})
