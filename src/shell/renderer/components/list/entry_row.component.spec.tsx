/// <reference lib="dom" />

import { afterEach, expect, test } from 'bun:test'
import type { RpcKnowledge, RpcListEntry } from '@shared/rpc'
import { factoryFor } from '@testing'
import { cleanup, render, screen } from '@testing-library/react'

import { EntryRow } from './entry_row.component'

afterEach(() => {
  cleanup()
})

const listRow = (row: RpcKnowledge, frecencyScore = 0, visitCount = 0): RpcListEntry => ({
  ...row,
  frecencyScore,
  visitCount
})

const bookmarkGithub = listRow(
  factoryFor('bookmark', {
    overrides: {
      id: 1,
      key: 'https://github.com/example/repo',
      source: 'fixtures/example.yaml',
      desc: 'Example repository',
      tags: ['github'],
      doc: '',
      createdAt: 0,
      updatedAt: 0
    }
  }) as RpcKnowledge
)

const GITHUB_SVG_RE = /github\.svg/

test('EntryRow shows bundled github.svg for github.com bookmark', () => {
  render(<EntryRow entry={bookmarkGithub} allEntries={[bookmarkGithub]} selected={false} onSelect={() => undefined} />)
  const img = screen.getByLabelText('github')
  expect(img.getAttribute('src')).toMatch(GITHUB_SVG_RE)
  expect(img.getAttribute('src')).not.toContain('icons.duckduckgo.com')
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

const taskCompact = factoryFor('task', {
  overrides: {
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
}) as RpcKnowledge

test('EntryRow compact task shows one type chip (no duplicate task badge)', () => {
  render(
    <EntryRow
      entry={listRow(taskCompact)}
      allEntries={[taskCompact]}
      selected={false}
      onSelect={() => undefined}
      compact
      maxFrecencyScore={3}
    />
  )
  expect(document.querySelectorAll('.kb-pt-chip--task')).toHaveLength(1)
  expect(document.querySelector('.kb-pt-chip--todo')).not.toBeNull()
  expect(document.querySelector('.kb-pt-chip--high')).not.toBeNull()
})

test('EntryRow compact shows frecency bars when visited', () => {
  render(
    <EntryRow
      entry={listRow(bookmarkGithub, 6, 4)}
      allEntries={[bookmarkGithub]}
      selected={false}
      onSelect={() => undefined}
      compact
      maxFrecencyScore={6}
    />
  )
  expect(screen.getByLabelText('Used 4 times')).toBeTruthy()
  expect(document.querySelectorAll('.kb-pt-frecency-bar--on')).toHaveLength(3)
})
