import { describe, expect, it } from 'bun:test'
import {
  extractYouTubeId,
  youTubeEmbedUrl,
  youTubeThumbnail,
  youTubeThumbnailCandidates,
  youTubeThumbnailMq
} from './youtube.parser'

describe('extractYouTubeId()', () => {
  describe.each([
    ['standard watch URL', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['short youtu.be URL', 'https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['music.youtube.com URL', 'https://music.youtube.com/watch?v=abc123', 'abc123'],
    ['non-youtube URL', 'https://example.com', null],
    ['empty string', '', null],
    ['invalid URL', 'not-a-url', null]
  ])('%s', (_, url, expected) => {
    it(`extractYouTubeId("${url}") === ${JSON.stringify(expected)}`, () => {
      expect(extractYouTubeId(url)).toBe(expected)
    })
  })
})

describe('youTubeEmbedUrl()', () => {
  it('builds correct embed URL', () => {
    expect(youTubeEmbedUrl('abc123')).toBe('https://www.youtube.com/embed/abc123?feature=oembed')
  })
})

describe('youTubeThumbnail()', () => {
  it('builds maxresdefault thumbnail URL', () => {
    expect(youTubeThumbnail('abc123')).toContain('maxresdefault')
  })
})

describe('youTubeThumbnailMq()', () => {
  it('builds mqdefault thumbnail URL', () => {
    expect(youTubeThumbnailMq('abc123')).toContain('mqdefault')
  })
})

describe('youTubeThumbnailCandidates()', () => {
  it('returns 4 candidates in order', () => {
    const candidates = youTubeThumbnailCandidates('abc')
    expect(candidates).toHaveLength(4)
    expect(candidates[0]).toContain('maxresdefault')
    expect(candidates[3]).toContain('mqdefault')
  })
})
