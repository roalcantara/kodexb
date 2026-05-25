import { describe, expect, it } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
import { fireEvent, render, screen } from '@testing-library/react'

import { BookmarkEntryIcon } from './bookmark_entry_icon.component'

const BOOKMARK_SVG_RE = /bookmark\.svg/
const GIT_SVG_RE = /git\.svg/
const GITHUB_SVG_RE = /github\.svg/
const DUCK = 'icons.duckduckgo.com'

function bookmarkEntry(
  overrides: Partial<Extract<RpcKnowledge, { type: 'bookmark' }>>
): Extract<RpcKnowledge, { type: 'bookmark' }> {
  return factoryFor('bookmark', {
    overrides: {
      id: 1,
      key: 'https://example.com/',
      source: 's',
      desc: 'd',
      tags: [],
      doc: '',
      createdAt: 0,
      updatedAt: 0,
      ...overrides
    }
  }) as Extract<RpcKnowledge, { type: 'bookmark' }>
}
describe('BookmarkEntryIcon', () => {
  describe('when key is not a URL', () => {
    it('uses tag SVG', () => {
      const entry = bookmarkEntry({ key: 'slug', tags: ['git'] })
      render(<BookmarkEntryIcon entry={entry} fallbackChar="◆" title="git" />)
      const img = screen.getByLabelText('git')
      expect(img.getAttribute('src')).toMatch(GIT_SVG_RE)
    })
  })

  describe('with github.com URL', () => {
    it('uses bundled github.svg instead of favicon', () => {
      const entry = bookmarkEntry({ key: 'https://github.com/foo/bar', tags: ['shell'] })
      render(<BookmarkEntryIcon entry={entry} fallbackChar="◆" title="gh" />)
      const img = screen.getByLabelText('gh')
      expect(img.getAttribute('src')).toMatch(GITHUB_SVG_RE)
      expect(img.getAttribute('src')).not.toContain(DUCK)
    })
  })

  describe('with https URL and tag', () => {
    it('shows favicon', () => {
      const entry = bookmarkEntry({ key: 'https://docs.rs/foo', tags: ['git'] })
      render(<BookmarkEntryIcon entry={entry} fallbackChar="◆" title="git" />)
      const img = screen.getByLabelText('git')
      expect(img.getAttribute('src')).toContain(DUCK)
      expect(img.getAttribute('src')).toContain('docs.rs')
    })
  })

  describe('on favicon error', () => {
    it('falls back to tag SVG', () => {
      const entry = bookmarkEntry({ key: 'https://example.com/', tags: ['git'] })
      render(<BookmarkEntryIcon entry={entry} fallbackChar="◆" title="git" />)
      fireEvent.error(screen.getByLabelText('git'))
      expect(screen.getByLabelText('git').getAttribute('src')).toMatch(GIT_SVG_RE)
    })

    it('falls back to bookmark SVG when no tag brand', () => {
      const entry = bookmarkEntry({ key: 'https://example.com/', tags: ['unknown'] })
      render(<BookmarkEntryIcon entry={entry} fallbackChar="◆" title="x" />)
      fireEvent.error(screen.getByLabelText('x'))
      expect(screen.getByLabelText('x').getAttribute('src')).toMatch(BOOKMARK_SVG_RE)
    })
  })
})
