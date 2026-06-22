import { describe, expect, it } from 'bun:test'
import { entryActionKindFromKeyboardEvent, entryActionShortcutsAllowed } from './shortcuts.util'

describe('entryActionShortcutsAllowed()', () => {
  describe('when not blocked', () => {
    it('allows list and detail view states', () => {
      expect(entryActionShortcutsAllowed({ viewState: 'list', focusInTextField: false, shortcutsBlocked: false })).toBe(
        true
      )
      expect(
        entryActionShortcutsAllowed({ viewState: 'detail', focusInTextField: false, shortcutsBlocked: false })
      ).toBe(true)
    })
  })

  describe('when blocked', () => {
    it('disallows when text field or overlay is active', () => {
      expect(entryActionShortcutsAllowed({ viewState: 'list', focusInTextField: true, shortcutsBlocked: false })).toBe(
        false
      )
      expect(entryActionShortcutsAllowed({ viewState: 'list', focusInTextField: false, shortcutsBlocked: true })).toBe(
        false
      )
    })
  })
})

describe('entryActionKindFromKeyboardEvent()', () => {
  it('maps Enter keys', () => {
    expect(entryActionKindFromKeyboardEvent({ key: 'Enter' })).toBe('primary')
    expect(entryActionKindFromKeyboardEvent({ key: 'Enter', metaKey: true })).toBe('secondary')
  })
})
