import { describe, expect, it } from 'bun:test'

import { faviconUrlForBookmarkKey } from './favicon_url_for_bookmark.util'

describe('faviconUrlForBookmarkKey', () => {
  describe('with empty or non-URL keys', () => {
    it('returns null', () => {
      expect(faviconUrlForBookmarkKey('')).toBeNull()
      expect(faviconUrlForBookmarkKey('   ')).toBeNull()
      expect(faviconUrlForBookmarkKey('not a url')).toBeNull()
      expect(faviconUrlForBookmarkKey('ftp://example.com/')).toBeNull()
    })
  })

  describe('with https keys', () => {
    it('returns DuckDuckGo icon URL', () => {
      expect(faviconUrlForBookmarkKey('https://github.com/foo/bar')).toBe(
        'https://icons.duckduckgo.com/ip3/github.com.ico'
      )
    })
  })

  describe('with path and query', () => {
    it('strips path and uses hostname only', () => {
      expect(faviconUrlForBookmarkKey('https://docs.rs/foo?x=1')).toBe('https://icons.duckduckgo.com/ip3/docs.rs.ico')
    })
  })

  describe('with http URLs', () => {
    it('accepts http and returns DDG icon', () => {
      expect(faviconUrlForBookmarkKey('http://localhost:3000/')).toBe('https://icons.duckduckgo.com/ip3/localhost.ico')
    })
  })
})
