import { describe, expect, it } from 'bun:test'

import { ENTRY_TYPE_DEFAULT_SVG_BASENAME } from './entry_type_icon_basename.const'

describe('ENTRY_TYPE_DEFAULT_SVG_BASENAME', () => {
  it('maps each entry type to a basename string', () => {
    expect(ENTRY_TYPE_DEFAULT_SVG_BASENAME.bookmark).toBe('bookmark')
    expect(ENTRY_TYPE_DEFAULT_SVG_BASENAME.command).toBe('terminal')
    expect(ENTRY_TYPE_DEFAULT_SVG_BASENAME.cheat).toBe('markdown')
    expect(ENTRY_TYPE_DEFAULT_SVG_BASENAME.task).toBe('checklist')
  })
})
