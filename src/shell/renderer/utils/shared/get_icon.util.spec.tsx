/// <reference lib="dom" />
import { expect, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { render, screen } from '@testing-library/react'

import { getIcon } from './get_icon.util'

const GIT_SVG = /git\.svg/
const MARKDOWN_SVG = /markdown\.svg/

const cheatGit = {
  id: 1,
  type: 'cheat' as const,
  key: 'demo',
  source: 'fixture',
  desc: 'desc',
  tags: ['git'],
  createdAt: 0,
  updatedAt: 0
} as RpcKnowledge

test('getIcon renders img for tag with SVG map', () => {
  render(<div>{getIcon(cheatGit)}</div>)
  const img = screen.getByLabelText('git')
  expect(img.tagName).toBe('IMG')
  expect(img.getAttribute('src')).toMatch(GIT_SVG)
})

test('getIcon renders type default SVG when no mapped brand tag', () => {
  const noBrand = { ...cheatGit, tags: ['unmapped_tag_xyz'] } as RpcKnowledge
  render(<div>{getIcon(noBrand)}</div>)
  const img = screen.getByLabelText('unmapped_tag_xyz')
  expect(img.tagName).toBe('IMG')
  expect(img.getAttribute('src')).toMatch(MARKDOWN_SVG)
})

const bookmarkNoBrand = {
  id: 9,
  type: 'bookmark' as const,
  key: 'https://example.org/docs',
  source: 'fixture',
  desc: 'Docs',
  tags: [],
  doc: '',
  createdAt: 0,
  updatedAt: 0
} as RpcKnowledge

test('getIcon renders remote favicon for bookmark with brand tag', () => {
  const bookmarkGithub = {
    id: 10,
    type: 'bookmark' as const,
    key: 'https://github.com/foo/bar',
    source: 'fixture',
    desc: 'Repo',
    tags: ['github'],
    doc: '',
    createdAt: 0,
    updatedAt: 0
  } as RpcKnowledge
  render(<div>{getIcon(bookmarkGithub)}</div>)
  const img = screen.getByLabelText('github')
  expect(img.getAttribute('src')).toContain('icons.duckduckgo.com')
  expect(img.getAttribute('src')).toContain('github.com')
})

test('getIcon renders remote favicon for bookmark without brand tag', () => {
  render(<div>{getIcon(bookmarkNoBrand)}</div>)
  const img = screen.getByLabelText('bookmark')
  expect(img.getAttribute('src')).toBe('https://icons.duckduckgo.com/ip3/example.org.ico')
})
