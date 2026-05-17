import { describe, expect, it } from 'bun:test'
import { formatListFooterStatus } from './list_footer_status.util'

describe('formatListFooterStatus', () => {
  describe('when loading first totals', () => {
    it('shows loading message', () => {
      expect(
        formatListFooterStatus({
          matchTotal: null,
          showing: 0,
          pageSize: 50,
          loading: true
        })
      ).toBe('Loading results…')
    })
  })

  describe('with plural results and entries', () => {
    it('shows full status with correct page', () => {
      expect(
        formatListFooterStatus({
          matchTotal: 3667,
          showing: 50,
          pageSize: 50,
          loading: false
        })
      ).toBe('3667 results | showing 50 entries (page 1 of 74)')
    })
  })

  describe('with singular counts', () => {
    it('uses singular form for result and entry', () => {
      expect(
        formatListFooterStatus({
          matchTotal: 1,
          showing: 1,
          pageSize: 50,
          loading: false
        })
      ).toBe('1 result | showing 1 entry (page 1 of 1)')
    })
  })

  describe('when more rows are loaded', () => {
    it('advances current page', () => {
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
  })

  describe('with zero page size', () => {
    it('uses minimum page size of 1', () => {
      expect(
        formatListFooterStatus({
          matchTotal: 10,
          showing: 5,
          pageSize: 0,
          loading: false
        })
      ).toBe('10 results | showing 5 entries (page 5 of 10)')
    })
  })

  describe('with zero matches', () => {
    it('shows zero counts', () => {
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
})
