import { describe, expect, it } from 'bun:test'
import { factoryFor } from '@testing'
import { parseSourceFile } from '../../entries/parsers/source_document.parser'
import { toKnowledge } from '../factories/knowledge.factory'
import { assembleDoc, assembleNotesDoc } from './doc.assembler'

const NOW = new Date('2024-01-15T12:00:00Z')

describe('assembleDoc()', () => {
  it('assembles a command entry with sh code block and description', () => {
    const result = assembleDoc(
      factoryFor('command', { overrides: { id: 2, key: 'git status', source: '/test.yml' } }),
      {
        now: NOW
      }
    )
    expect(result.isOk()).toBe(true)
    const doc = result._unsafeUnwrap()
    expect(doc).toContain('```sh')
    expect(doc).toContain('git status')
    expect(doc).toContain('### DESCRIPTION')
    expect(doc).toContain('> Show working tree status')
  })

  it('assembles a task entry with status and priority', () => {
    const knowledge = factoryFor('task', {
      overrides: { id: 3, key: 'My Task', source: '/test.yml', priority: 'high', status: 'doing' }
    })
    const result = assembleDoc(knowledge, { now: NOW })
    expect(result.isOk()).toBe(true)
    const doc = result._unsafeUnwrap()
    expect(doc).toContain('# My Task')
    expect(doc).toContain('### STATUS')
    expect(doc).toContain('DOING')
    expect(doc).toContain('### PRIORITY')
    expect(doc).toContain('HIGH')
  })

  it('marks task as OVERDUE when due < now', () => {
    const knowledge = factoryFor('task', {
      overrides: { id: 3, key: 'My Task', source: '/test.yml', meta: { due: '2023-01-01' }, status: 'todo' }
    })
    const result = assembleDoc(knowledge, { now: NOW })
    expect(result._unsafeUnwrap()).toContain('⚠ OVERDUE')
  })

  it('does not mark done task as OVERDUE', () => {
    const knowledge = factoryFor('task', {
      overrides: { id: 3, key: 'My Task', source: '/test.yml', meta: { due: '2023-01-01' }, status: 'done' }
    })
    const result = assembleDoc(knowledge, { now: NOW })
    expect(result._unsafeUnwrap()).not.toContain('⚠ OVERDUE')
  })

  it('assembles a bookmark YouTube URL with embed and thumbnail', () => {
    const knowledge = factoryFor('bookmark', {
      overrides: { id: 1, source: '/test.yml', key: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
    })
    const result = assembleDoc(knowledge, { now: NOW })
    const doc = result._unsafeUnwrap()
    expect(doc).toContain('embed/dQw4w9WgXcQ')
    expect(doc).toContain('mqdefault')
  })

  it('renders md notes fragment inline', () => {
    const knowledge = factoryFor('command', {
      overrides: { id: 2, key: 'git status', source: '/test.yml', notes: [{ md: 'Some extra context' }] }
    })
    const result = assembleDoc(knowledge, { now: NOW })
    expect(result._unsafeUnwrap()).toContain('Some extra context')
  })

  it('renders mermaid notes as mermaid.ink image', () => {
    const knowledge = factoryFor('command', {
      overrides: { id: 2, key: 'git status', source: '/test.yml', notes: [{ mermaid: 'graph LR; A-->B' }] }
    })
    const result = assembleDoc(knowledge, { now: NOW })
    expect(result._unsafeUnwrap()).toContain('mermaid.ink')
  })
})

describe('toKnowledge() with assembleDoc integration', () => {
  const NOW_MS = 1_700_000_000_000
  const SOURCE = '/tmp/test.yaml'

  describe.each([
    [
      'bookmark',
      'bookmarks:\n  https://www.youtube.com/watch?v=dQw4w9WgXcQ:\n    desc: Test\n    tags: [test]',
      'embed/dQw4w9WgXcQ'
    ],
    ['command', 'commands:\n  git status:\n    desc: Show status\n    tags: [git]', 'git status'],
    ['cheat', 'cheats:\n  Math:\n    desc: Formulas\n    tags: [math]\n    notes:\n      - md: Formulas', 'Formulas'],
    ['task', 'tasks:\n  Build app:\n    desc: Do it\n    tags: [dev]\n    status: todo', 'Build app']
  ])('produces non-empty doc', (type, sourceBody, expectedText) => {
    it(`for a ${type} entry`, () => {
      const entries = parseSourceFile(SOURCE, sourceBody)
      const entry = entries[0]
      if (!entry) throw new Error('Expected at least one entry')
      const knowledge = toKnowledge(entry, NOW_MS)
      expect(knowledge.doc.length).toBeGreaterThan(0)
      expect(knowledge.doc).toContain(expectedText)
    })
  })
})

describe('assembleNotesDoc()', () => {
  it('returns empty string for no notes', () => {
    const result = assembleNotesDoc(factoryFor('bookmark', { overrides: { id: 1, source: '/test.yml' } }))
    expect(result._unsafeUnwrap()).toBe('')
  })

  it('joins multiple fragments with double newlines', () => {
    const knowledge = factoryFor('bookmark', {
      overrides: { id: 1, source: '/test.yml', notes: [{ md: 'Part 1' }, { md: 'Part 2' }] }
    })
    const result = assembleNotesDoc(knowledge)
    expect(result._unsafeUnwrap()).toBe('Part 1\n\nPart 2')
  })
})
