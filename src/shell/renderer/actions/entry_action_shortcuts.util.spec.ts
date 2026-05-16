import { describe, expect, test } from 'bun:test'
import { entryActionKindFromKeyboardEvent, entryActionShortcutsAllowed } from './entry_action_shortcuts.util'

describe('entryActionShortcutsAllowed()', () => {
  test('allows list split detail when not blocked', () => {
    expect(entryActionShortcutsAllowed({ viewState: 'list', focusInTextField: false, shortcutsBlocked: false })).toBe(
      true
    )
    expect(entryActionShortcutsAllowed({ viewState: 'detail', focusInTextField: false, shortcutsBlocked: false })).toBe(
      true
    )
  })

  test('blocks text fields and overlays', () => {
    expect(entryActionShortcutsAllowed({ viewState: 'list', focusInTextField: true, shortcutsBlocked: false })).toBe(
      false
    )
    expect(entryActionShortcutsAllowed({ viewState: 'list', focusInTextField: false, shortcutsBlocked: true })).toBe(
      false
    )
  })
})

describe('entryActionKindFromKeyboardEvent()', () => {
  test('maps Enter keys', () => {
    expect(entryActionKindFromKeyboardEvent({ key: 'Enter' })).toBe('primary')
    expect(entryActionKindFromKeyboardEvent({ key: 'Enter', metaKey: true })).toBe('secondary')
  })
})
