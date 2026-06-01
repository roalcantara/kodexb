import { describe, expect, it } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
import { render, screen } from '@testing-library/react'

import { getIcon } from './get_icon.util'

const GIT_SVG = /git\.svg/
const GITHUB_SVG = /github\.svg/
const MARKDOWN_SVG = /markdown\.svg/

const cheatGit = factoryFor('cheat', {
  overrides: {
    id: 1,
    key: 'demo',
    source: 'fixture',
    desc: 'desc',
    tags: ['git'],
    doc: '',
    createdAt: 0,
    updatedAt: 0
  }
}) as RpcKnowledge

const bookmarkNoBrand = factoryFor('bookmark', {
  overrides: {
    id: 9,
    key: 'https://example.org/docs',
    source: 'fixture',
    desc: 'Docs',
    tags: [],
    doc: '',
    createdAt: 0,
    updatedAt: 0
  }
}) as RpcKnowledge

describe('getIcon', () => {
  describe('with a mapped brand tag', () => {
    it('renders img with SVG source', () => {
      render(<div>{getIcon(cheatGit)}</div>)
      const img = screen.getByLabelText('git')
      expect(img.tagName).toBe('IMG')
      expect(img.getAttribute('src')).toMatch(GIT_SVG)
    })
  })

  describe('with no mapped brand tag', () => {
    it('renders type default SVG', () => {
      const noBrand = { ...cheatGit, tags: ['unmapped_tag_xyz'] } as RpcKnowledge
      render(<div>{getIcon(noBrand)}</div>)
      const img = screen.getByLabelText('unmapped_tag_xyz')
      expect(img.tagName).toBe('IMG')
      expect(img.getAttribute('src')).toMatch(MARKDOWN_SVG)
    })
  })

  describe('with a github.com bookmark', () => {
    it('renders bundled github.svg instead of favicon', () => {
      const bookmarkGithub = factoryFor('bookmark', {
        overrides: {
          id: 10,
          key: 'https://github.com/foo/bar',
          source: 'fixture',
          desc: 'Repo',
          tags: ['github'],
          doc: '',
          createdAt: 0,
          updatedAt: 0
        }
      }) as RpcKnowledge
      render(<div>{getIcon(bookmarkGithub)}</div>)
      const img = screen.getByLabelText('github')
      expect(img.getAttribute('src')).toMatch(GITHUB_SVG)
      expect(img.getAttribute('src')).not.toContain('icons.duckduckgo.com')
    })
  })

  describe('with a bookmark without brand tag', () => {
    it('renders remote favicon', () => {
      render(<div>{getIcon(bookmarkNoBrand)}</div>)
      const img = screen.getByLabelText('bookmark')
      expect(img.getAttribute('src')).toBe('https://icons.duckduckgo.com/ip3/example.org.ico')
    })
  })
})
