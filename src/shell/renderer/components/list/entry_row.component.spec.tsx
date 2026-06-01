import { afterEach, describe, expect, it } from 'bun:test'
import type { RpcKnowledge, RpcListEntry } from '@shared/rpc'
import { factoryFor } from '@testing'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

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

describe('EntryRow', () => {
  describe('with a bookmark entry', () => {
    it('shows bundled github.svg for github.com', () => {
      render(
        <EntryRow entry={bookmarkGithub} allEntries={[bookmarkGithub]} selected={false} onSelect={() => undefined} />
      )
      const img = screen.getByLabelText('github')
      expect(img.getAttribute('src')).toMatch(GITHUB_SVG_RE)
      expect(img.getAttribute('src')).not.toContain('icons.duckduckgo.com')
    })

    it('shows title from description and meta from key', () => {
      render(
        <EntryRow entry={bookmarkGithub} allEntries={[bookmarkGithub]} selected={false} onSelect={() => undefined} />
      )
      const btn = screen.getByRole('button')
      expect(btn.textContent).toContain('Example repository')
      expect(btn.textContent).toContain(bookmarkGithub.key)
      expect(document.querySelector('.semantic-url')).not.toBeNull()
    })
  })

  describe('when selected', () => {
    it('shows selected styling', () => {
      render(<EntryRow entry={bookmarkGithub} allEntries={[bookmarkGithub]} selected onSelect={() => undefined} />)
      const btn = screen.getByRole('button')
      expect(btn.classList.contains('cmp-entry-row--selected')).toBe(true)
    })
  })

  describe('in compact mode', () => {
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

    it('shows three-line stack with hash tags for task entries', () => {
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
      expect(document.querySelector('.cmp-list-row-meta')).not.toBeNull()
      expect(document.querySelector('.cmp-list-row-title')?.textContent).toBe('Release checklist')
      expect(document.querySelectorAll('.cmp-tag')).toHaveLength(2)
      expect(document.querySelector('.cmp-tag--type-task')).toBeNull()
    })

    it('shows frecency bars when visited', () => {
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
      expect(document.querySelectorAll('.cmp-frecency-bar--on')).toHaveLength(3)
    })

    it('applies selected list row class', () => {
      render(
        <EntryRow
          entry={listRow(bookmarkGithub)}
          allEntries={[bookmarkGithub]}
          selected
          onSelect={() => undefined}
          compact
        />
      )
      expect(screen.getByRole('button').classList.contains('cmp-list-row--selected')).toBe(true)
    })

    it('calls onHoverEntry when the pointer enters the row', () => {
      const hovered: number[] = []
      render(
        <EntryRow
          entry={listRow(bookmarkGithub)}
          allEntries={[bookmarkGithub]}
          selected={false}
          onSelect={() => undefined}
          onHoverEntry={id => {
            hovered.push(id)
          }}
          compact
        />
      )
      fireEvent.mouseEnter(screen.getByRole('button'))
      expect(hovered).toEqual([bookmarkGithub.id])
    })
  })
})
