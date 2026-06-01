import { describe, expect, it } from 'bun:test'

import { faviconUrlForBookmarkKey } from './favicon_url_for_bookmark.util'

describe('faviconUrlForBookmarkKey()', () => {
  describe('when key is not an http(s) URL', () => {
    describe.each([
      ['empty string', ''],
      ['whitespace', '   '],
      ['non-URL text', 'not a url'],
      ['ftp URL', 'ftp://example.com/']
    ])('with %s', (_, key) => {
      it('returns null', () => {
        expect(faviconUrlForBookmarkKey(key)).toBeNull()
      })
    })
  })

  describe('when key is an http(s) URL', () => {
    describe.each([
      ['https URL', 'https://github.com/foo/bar', 'https://icons.duckduckgo.com/ip3/github.com.ico'],
      ['https URL with path', 'https://docs.rs/foo?x=1', 'https://icons.duckduckgo.com/ip3/docs.rs.ico'],
      ['http URL', 'http://localhost:3000/', 'https://icons.duckduckgo.com/ip3/localhost.ico']
    ])('with %s', (_, key, expected) => {
      it('returns DuckDuckGo icon URL', () => {
        expect(faviconUrlForBookmarkKey(key)).toBe(expected)
      })
    })
  })
})
