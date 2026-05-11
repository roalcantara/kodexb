/// <reference lib="dom" />

import { afterEach, expect, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { cleanup, render, screen } from '@testing-library/react'

import { EntryRow } from './entry_row.component'

afterEach(() => {
  cleanup()
})

const bookmarkGithub: RpcKnowledge = {
  type: 'bookmark',
  id: 1,
  key: 'https://github.com/example/repo',
  source: 'fixtures/example.yaml',
  desc: 'Example repository',
  tags: ['github'],
  doc: '',
  createdAt: 0,
  updatedAt: 0
}

test('EntryRow shows brand image when a mapped tag is present', () => {
  render(<EntryRow entry={bookmarkGithub} allEntries={[bookmarkGithub]} selected={false} onSelect={() => undefined} />)
  const img = document.querySelector('img.kb-entryGlyphImg')
  expect(img).not.toBeNull()
  expect(img?.getAttribute('aria-label')).toContain('github')
})

test('EntryRow shows selected styling when selected', () => {
  render(<EntryRow entry={bookmarkGithub} allEntries={[bookmarkGithub]} selected onSelect={() => undefined} />)
  const btn = screen.getByRole('button')
  expect(btn.classList.contains('kb-entryRow--selected')).toBe(true)
})

test('EntryRow title combines key and description preview', () => {
  render(<EntryRow entry={bookmarkGithub} allEntries={[bookmarkGithub]} selected={false} onSelect={() => undefined} />)
  expect(screen.getByRole('button').textContent).toContain(bookmarkGithub.key)
})
