import { describe, expect, it } from 'bun:test'
import { entryActionShortcutFromKey } from './entry_action_shortcut_key.util'

describe('entryActionShortcutFromKey()', () => {
  it('plain Enter is primary', () => {
    expect(entryActionShortcutFromKey('Enter', false, false, false, false)).toBe('primary')
  })

  it('mod+Enter is secondary', () => {
    expect(entryActionShortcutFromKey('Enter', true, false, false, false)).toBe('secondary')
    expect(entryActionShortcutFromKey('Enter', false, true, false, false)).toBe('secondary')
  })

  it('ignores other keys and modifiers', () => {
    expect(entryActionShortcutFromKey('a', false, false, false, false)).toBe(null)
    expect(entryActionShortcutFromKey('Enter', false, false, true, false)).toBe(null)
    expect(entryActionShortcutFromKey('Enter', true, false, false, true)).toBe(null)
  })
})
