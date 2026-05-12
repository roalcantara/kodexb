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

const taskCompact: RpcKnowledge = {
  type: 'task',
  id: 42,
  key: 'Ship feature',
  source: 'tasks.yml',
  desc: 'Release checklist',
  tags: [],
  doc: '',
  status: 'todo',
  priority: 'high',
  createdAt: 0,
  updatedAt: 0
}

test('EntryRow compact task shows one type chip (no duplicate task badge)', () => {
  render(
    <EntryRow entry={taskCompact} allEntries={[taskCompact]} selected={false} onSelect={() => undefined} compact />
  )
  expect(document.querySelectorAll('.kb-pt-chip--task')).toHaveLength(1)
  expect(document.querySelector('.kb-pt-chip--todo')).not.toBeNull()
  expect(document.querySelector('.kb-pt-chip--high')).not.toBeNull()
})
