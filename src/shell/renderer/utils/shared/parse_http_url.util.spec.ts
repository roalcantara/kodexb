import { describe, expect, it } from 'bun:test'
import { parseHttpUrl } from './parse_http_url.util'

describe('parseHttpUrl', () => {
  it('returns null for empty string', () => {
    expect(parseHttpUrl('')).toBeNull()
  })

  it('returns null for non-URL string', () => {
    expect(parseHttpUrl('not a url')).toBeNull()
  })

  it('returns null for non-http protocol', () => {
    expect(parseHttpUrl('ftp://example.com')).toBeNull()
  })

  it('returns hostname for http URL', () => {
    const result = parseHttpUrl('http://example.com/path')
    expect(result?.hostname).toBe('example.com')
  })

  it('returns hostname for https URL', () => {
    const result = parseHttpUrl('https://github.com/foo/bar')
    expect(result?.hostname).toBe('github.com')
  })

  it('trims whitespace', () => {
    const result = parseHttpUrl('  https://example.com  ')
    expect(result?.hostname).toBe('example.com')
  })
})
