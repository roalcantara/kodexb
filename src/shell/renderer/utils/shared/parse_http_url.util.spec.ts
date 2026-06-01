import { describe, expect, it } from 'bun:test'
import { parseHttpUrl } from './parse_http_url.util'

describe('parseHttpUrl', () => {
  describe('with invalid input', () => {
    it('returns null for empty string', () => {
      expect(parseHttpUrl('')).toBeNull()
    })

    it('returns null for non-URL', () => {
      expect(parseHttpUrl('not a url')).toBeNull()
    })

    it('returns null for non-http protocol', () => {
      expect(parseHttpUrl('ftp://example.com')).toBeNull()
    })
  })

  describe('with valid http/https URL', () => {
    it('resolves http hostname', () => {
      const result = parseHttpUrl('http://example.com/path')
      expect(result?.hostname).toBe('example.com')
    })

    it('resolves https hostname', () => {
      const result = parseHttpUrl('https://github.com/foo/bar')
      expect(result?.hostname).toBe('github.com')
    })

    it('trims whitespace', () => {
      const result = parseHttpUrl('  https://example.com  ')
      expect(result?.hostname).toBe('example.com')
    })
  })
})
