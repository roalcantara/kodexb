import { describe, expect, it } from 'bun:test'
import { KEY_GLYPHS, keyGlyphFor } from './chord_key_aliases.util'

describe('KEY_GLYPHS', () => {
  it('maps canonical tokens to display glyphs', () => {
    expect(KEY_GLYPHS.p).toBe('p')
    expect(KEY_GLYPHS['3']).toBe('3')
    expect(KEY_GLYPHS.f12).toBe('f12')
    expect(KEY_GLYPHS.arrowUp).toBe('↑')
    expect(KEY_GLYPHS.esc).toBe('⎋')
    expect(KEY_GLYPHS.backslash).toBe('\\')
    expect(keyGlyphFor('pageDown')).toBe('⇟')
  })
})
