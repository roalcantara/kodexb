import { describe, expect, it } from 'bun:test'
import type { BookmarkKnowledge } from '../schemas/knowledge.schema'
import { buildBookmarkPreamble } from './doc.bookmark.parser'

const baseEntry: BookmarkKnowledge = {
  id: 1,
  type: 'bookmark',
  key: 'https://example.com',
  source: '/f.yml',
  desc: 'Example site',
  tags: ['x'],
  createdAt: 0,
  updatedAt: 0
}

describe('buildBookmarkPreamble()', () => {
  it('returns embed + thumbnail for youtu.be short URLs', () => {
    const entry = { ...baseEntry, key: 'https://youtu.be/dQw4w9WgXcQ' }
    const out = buildBookmarkPreamble(entry)
    expect(out).toBe(
      '[Example site](https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed)\n\n![YouTube Thumbnail](https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg)'
    )
  })

  it('returns embed + thumbnail for youtube.com/watch URLs', () => {
    const entry = { ...baseEntry, key: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
    const out = buildBookmarkPreamble(entry)
    expect(out).toBe(
      '[Example site](https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed)\n\n![YouTube Thumbnail](https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg)'
    )
  })

  it('returns image markdown when previewImageUrl is provided (non-YouTube)', () => {
    const out = buildBookmarkPreamble(baseEntry, 'https://og.example.com/img.png')
    expect(out).toBe('![Example site](https://og.example.com/img.png)')
  })

  it('returns empty string when neither YouTube nor previewImageUrl is present', () => {
    const out = buildBookmarkPreamble(baseEntry)
    expect(out).toBe('')
  })

  it('returns image markdown with the right alt text when desc differs', () => {
    const entry = { ...baseEntry, desc: 'My Blog Post' }
    const out = buildBookmarkPreamble(entry, 'https://images.example.com/preview.png')
    expect(out).toBe('![My Blog Post](https://images.example.com/preview.png)')
  })
})
