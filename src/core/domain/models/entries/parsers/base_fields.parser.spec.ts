import { describe, expect, it } from 'bun:test'
import { parseBaseEntryFields } from './base_fields.parser'

describe('parseBaseEntryFields()', () => {
  it('returns the canonical BaseEntry shape with desc + tags', () => {
    const raw = { desc: 'Example', tags: ['x', 'y'] }
    const result = parseBaseEntryFields(raw, 'bookmark', 'https://example.com', '/abs/file.yml')
    expect(result.type).toBe('bookmark')
    expect(result.key).toBe('https://example.com')
    expect(result.source).toBe('/abs/file.yml')
    expect(result.desc).toBe('Example')
    expect(result.tags).toEqual(['x', 'y'])
  })

  it('omits links/notes/meta when not present', () => {
    const raw = { desc: 'A', tags: ['t'] }
    const r = parseBaseEntryFields(raw, 'cheat', 'k', '/f.yml')
    expect(r).not.toHaveProperty('links')
    expect(r).not.toHaveProperty('notes')
    expect(r).not.toHaveProperty('meta')
  })

  it('preserves links/notes/meta when present', () => {
    const raw = {
      desc: 'A',
      tags: ['t'],
      links: ['https://x'],
      notes: [{ sh: 'echo' }],
      meta: { due: '2026-01-01' }
    }
    const r = parseBaseEntryFields(raw, 'task', 'k', '/f.yml')
    expect(r.links).toEqual(['https://x'])
    expect(r.notes).toEqual([{ sh: 'echo' }])
    expect(r.meta).toEqual({ due: '2026-01-01' })
  })
})
