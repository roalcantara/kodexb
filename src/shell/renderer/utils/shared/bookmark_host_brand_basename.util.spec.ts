import { expect, test } from 'bun:test'

import { brandBasenameForBookmarkHost } from './bookmark_host_brand_basename.util'

test('brandBasenameForBookmarkHost returns github for github.com', () => {
  expect(brandBasenameForBookmarkHost('https://github.com/foo/bar')).toBe('github')
})

test('brandBasenameForBookmarkHost returns github for www.github.com', () => {
  expect(brandBasenameForBookmarkHost('https://www.github.com/foo')).toBe('github')
})

test('brandBasenameForBookmarkHost returns null for other hosts', () => {
  expect(brandBasenameForBookmarkHost('https://youtube.com/watch')).toBeNull()
  expect(brandBasenameForBookmarkHost('https://docs.rs/foo')).toBeNull()
})

test('brandBasenameForBookmarkHost returns null for non-http keys', () => {
  expect(brandBasenameForBookmarkHost('slug')).toBeNull()
  expect(brandBasenameForBookmarkHost('')).toBeNull()
})

test('brandBasenameForBookmarkHost returns null for invalid URL', () => {
  expect(brandBasenameForBookmarkHost('https://')).toBeNull()
})
