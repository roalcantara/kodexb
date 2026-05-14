import { describe, expect, it } from 'bun:test'
import { CLIPBOARD_COPIED_TOAST_PREVIEW_MAX, clipboardCopiedToastMessage } from './clipboard_copy_toast.util'

describe('clipboardCopiedToastMessage', () => {
  it('returns neutral message when copied text is empty', () => {
    expect(clipboardCopiedToastMessage('')).toBe('Copied to clipboard')
  })

  it('wraps short text in single quotes', () => {
    expect(clipboardCopiedToastMessage('hi')).toBe(`'hi' copied to clipboard`)
  })

  it('truncates preview at max length with ellipsis', () => {
    const long = 'a'.repeat(CLIPBOARD_COPIED_TOAST_PREVIEW_MAX + 50)
    const msg = clipboardCopiedToastMessage(long)
    expect(msg.startsWith("'")).toBe(true)
    expect(msg).toContain('...')
    expect(msg.endsWith("' copied to clipboard")).toBe(true)
    const inner = msg.slice(1, msg.indexOf("' copied"))
    expect(inner.length).toBe(CLIPBOARD_COPIED_TOAST_PREVIEW_MAX + 3)
  })

  it('replaces single quotes in preview with right single quotation for display', () => {
    expect(clipboardCopiedToastMessage("it's ok")).toBe(`'it\u2019s ok' copied to clipboard`)
  })
})
