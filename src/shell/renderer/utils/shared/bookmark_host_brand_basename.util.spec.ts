import { describe, expect, it } from 'bun:test'

import { brandBasenameForBookmarkHost } from './bookmark_host_brand_basename.util'

describe('bookmarkHostBrandBasename', () => {
  describe('with github.com host', () => {
    it('returns github for plain github.com', () => {
      expect(brandBasenameForBookmarkHost('https://github.com/foo/bar')).toBe('github')
    })

    it('returns github for www.github.com', () => {
      expect(brandBasenameForBookmarkHost('https://www.github.com/foo')).toBe('github')
    })
  })

  describe('with other known hosts', () => {
    it('returns null', () => {
      expect(brandBasenameForBookmarkHost('https://youtube.com/watch')).toBeNull()
      expect(brandBasenameForBookmarkHost('https://docs.rs/foo')).toBeNull()
    })
  })

  describe('with non-http keys', () => {
    it('returns null', () => {
      expect(brandBasenameForBookmarkHost('slug')).toBeNull()
      expect(brandBasenameForBookmarkHost('')).toBeNull()
    })
  })

  describe('with invalid URL', () => {
    it('returns null', () => {
      expect(brandBasenameForBookmarkHost('https://')).toBeNull()
    })
  })
})
