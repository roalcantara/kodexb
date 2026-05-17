import { describe, expect, it } from 'bun:test'
import { entryActionPrimaryRowHint } from './entry_action_row_hint.util'

describe('entryActionPrimaryRowHint()', () => {
  it('returns hint per type', () => {
    expect(entryActionPrimaryRowHint('bookmark')).toBe('\u21B5 Open')
    expect(entryActionPrimaryRowHint('command')).toBe('\u21B5 Paste')
    expect(entryActionPrimaryRowHint('cheat')).toBe('\u21B5 Copy')
    expect(entryActionPrimaryRowHint('task')).toBe('\u21B5 Edit')
  })
})
