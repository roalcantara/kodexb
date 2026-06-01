import { describe, expect, it } from 'bun:test'
import { parseBaseEntryFields } from './base_fields.parser'

describe('parseBaseEntryFields()', () => {
  describe('with desc and tags', () => {
    it('returns canonical BaseEntry fields', () => {
      const raw = { desc: 'Example', tags: ['x', 'y'] }
      const result = parseBaseEntryFields(raw, 'bookmark', 'https://example.com', '/abs/file.yml')
      expect(result.type).toBe('bookmark')
      expect(result.key).toBe('https://example.com')
      expect(result.source).toBe('/abs/file.yml')
      expect(result.desc).toBe('Example')
      expect(result.tags).toEqual(['x', 'y'])
    })
  })

  describe('without optional fields', () => {
    it('omits links, notes, and meta', () => {
      const raw = { desc: 'A', tags: ['t'] }
      const result = parseBaseEntryFields(raw, 'cheat', 'k', '/f.yml')
      expect(result).not.toHaveProperty('links')
      expect(result).not.toHaveProperty('notes')
      expect(result).not.toHaveProperty('meta')
    })
  })

  describe('with optional fields', () => {
    it('preserves links, notes, and meta', () => {
      const raw = {
        desc: 'A',
        tags: ['t'],
        links: ['https://x'],
        notes: [{ sh: 'echo' }],
        meta: { due: '2026-01-01' }
      }
      const result = parseBaseEntryFields(raw, 'task', 'k', '/f.yml')
      expect(result.links).toEqual(['https://x'])
      expect(result.notes).toEqual([{ sh: 'echo' }])
      expect(result.meta).toEqual({ due: '2026-01-01' })
    })
  })
})
