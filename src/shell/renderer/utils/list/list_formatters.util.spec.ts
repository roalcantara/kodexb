import { describe, expect, it } from 'bun:test'
import {
  CLIPBOARD_COPIED_TOAST_PREVIEW_MAX,
  clipboardCopiedToastMessage,
  formatListFooterStatus
} from './list_formatters.util'

describe('clipboardCopiedToastMessage', () => {
  describe('when copied text is empty', () => {
    it('returns neutral message', () => {
      expect(clipboardCopiedToastMessage('')).toBe('Copied to clipboard')
    })
  })

  describe('with short text', () => {
    it('wraps in single quotes', () => {
      expect(clipboardCopiedToastMessage('hi')).toBe(`'hi' copied to clipboard`)
    })
  })

  describe('with long text', () => {
    it('truncates preview at max length with ellipsis', () => {
      const long = 'a'.repeat(CLIPBOARD_COPIED_TOAST_PREVIEW_MAX + 50)
      const msg = clipboardCopiedToastMessage(long)
      expect(msg.startsWith("'")).toBe(true)
      expect(msg).toContain('...')
      expect(msg.endsWith("' copied to clipboard")).toBe(true)
      const inner = msg.slice(1, msg.indexOf("' copied"))
      expect(inner.length).toBe(CLIPBOARD_COPIED_TOAST_PREVIEW_MAX + 3)
    })
  })

  describe('with single quotes in preview', () => {
    it('replaces with right single quotation', () => {
      expect(clipboardCopiedToastMessage("it's ok")).toBe(`'it\u2019s ok' copied to clipboard`)
    })
  })
})

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
