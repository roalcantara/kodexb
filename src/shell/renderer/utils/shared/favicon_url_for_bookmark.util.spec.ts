import { describe, expect, it } from 'bun:test'

import { faviconUrlForBookmarkKey } from './favicon_url_for_bookmark.util'

describe('faviconUrlForBookmarkKey', () => {
  it('returns null for empty or non-URL keys', () => {
    expect(faviconUrlForBookmarkKey('')).toBeNull()
    expect(faviconUrlForBookmarkKey('   ')).toBeNull()
    expect(faviconUrlForBookmarkKey('not a url')).toBeNull()
    expect(faviconUrlForBookmarkKey('ftp://example.com/')).toBeNull()
  })

  it('returns DuckDuckGo icon URL for https keys', () => {
    expect(faviconUrlForBookmarkKey('https://github.com/foo/bar')).toBe(
      'https://icons.duckduckgo.com/ip3/github.com.ico'
    )
  })

  it('strips path and uses hostname only', () => {
    expect(faviconUrlForBookmarkKey('https://docs.rs/foo?x=1')).toBe('https://icons.duckduckgo.com/ip3/docs.rs.ico')
  })

  it('accepts http URLs', () => {
    expect(faviconUrlForBookmarkKey('http://localhost:3000/')).toBe('https://icons.duckduckgo.com/ip3/localhost.ico')
  })
})
