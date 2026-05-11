/// <reference lib="dom" />
import { expect, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { render, screen } from '@testing-library/react'

import { getIcon } from './get_icon.util'

const GIT_SVG = /git\.svg/

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

test('getIcon renders type glyph span when no mapped brand tag', () => {
  const noBrand = { ...cheatGit, tags: ['unmapped_tag_xyz'] } as RpcKnowledge
  render(<div>{getIcon(noBrand)}</div>)
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByTitle('unmapped_tag_xyz').textContent).toBe('~')
})
