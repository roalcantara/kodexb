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

  describe('with more rows available', () => {
    it('shows total and loaded count', () => {
      expect(
        formatListFooterStatus({
          matchTotal: 3667,
          showing: 50,
          pageSize: 50,
          loading: false
        })
      ).toBe('3,667 total entries • Showing 50')
    })
  })

  describe('with singular counts', () => {
    it('uses singular entry label', () => {
      expect(
        formatListFooterStatus({
          matchTotal: 1,
          showing: 1,
          pageSize: 50,
          loading: false
        })
      ).toBe('1 total entry')
    })
  })

  describe('when all matches are loaded', () => {
    it('shows total only', () => {
      expect(
        formatListFooterStatus({
          matchTotal: 100,
          showing: 100,
          pageSize: 50,
          loading: false
        })
      ).toBe('100 total entries')
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
      ).toBe('0 total entries')
    })
  })

  describe('without match total', () => {
    it('shows loaded count only', () => {
      expect(
        formatListFooterStatus({
          matchTotal: null,
          showing: 12,
          pageSize: 50,
          loading: false
        })
      ).toBe('12 entries')
    })
  })
})
