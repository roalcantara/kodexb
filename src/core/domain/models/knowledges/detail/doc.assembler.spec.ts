import { describe, expect, it } from 'bun:test'
import { parseSourceFile } from '../../entries/parsers/source_document.parser'
import { toKnowledge } from '../factories/knowledge.factory'
import type { Knowledge } from '../schemas/knowledge.schema'
import { assembleDoc, assembleNotesDoc } from './doc.assembler'

const NOW = new Date('2024-01-15T12:00:00Z')

const makeBookmark = (overrides: Partial<Knowledge> = {}): Knowledge =>
  ({
    type: 'bookmark',
    id: 1,
    key: 'https://example.com',
    source: '/test.yml',
    desc: 'Example site',
    tags: ['example'],
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  }) as Knowledge

const makeCommand = (overrides: Partial<Knowledge> = {}): Knowledge =>
  ({
    type: 'command',
    id: 2,
    key: 'git status',
    source: '/test.yml',
    desc: 'Show working tree status',
    tags: ['git'],
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  }) as Knowledge

const makeTask = (overrides: Partial<Knowledge> = {}): Knowledge =>
  ({
    type: 'task',
    id: 3,
    key: 'My Task',
    source: '/test.yml',
    desc: 'Do something',
    tags: ['dev'],
    status: 'todo',
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  }) as Knowledge

describe('assembleDoc()', () => {
  it('assembles a command entry with sh code block and description', () => {
    const result = assembleDoc(makeCommand(), { now: NOW })
    expect(result.isOk()).toBe(true)
    const doc = result._unsafeUnwrap()
    expect(doc).toContain('```sh')
    expect(doc).toContain('git status')
    expect(doc).toContain('### DESCRIPTION')
    expect(doc).toContain('> Show working tree status')
  })

  it('assembles a task entry with status and priority', () => {
    const knowledge = makeTask({ priority: 'high', status: 'doing' })
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
    const knowledge = makeTask({ meta: { due: '2023-01-01' }, status: 'todo' })
    const result = assembleDoc(knowledge, { now: NOW })
    expect(result._unsafeUnwrap()).toContain('⚠ OVERDUE')
  })

  it('does not mark done task as OVERDUE', () => {
    const knowledge = makeTask({ meta: { due: '2023-01-01' }, status: 'done' })
    const result = assembleDoc(knowledge, { now: NOW })
    expect(result._unsafeUnwrap()).not.toContain('⚠ OVERDUE')
  })

  it('assembles a bookmark YouTube URL with embed and thumbnail', () => {
    const knowledge = makeBookmark({ key: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    const result = assembleDoc(knowledge, { now: NOW })
    const doc = result._unsafeUnwrap()
    expect(doc).toContain('embed/dQw4w9WgXcQ')
    expect(doc).toContain('mqdefault')
  })

  it('renders md notes fragment inline', () => {
    const knowledge = makeCommand({ notes: [{ md: 'Some extra context' }] })
    const result = assembleDoc(knowledge, { now: NOW })
    expect(result._unsafeUnwrap()).toContain('Some extra context')
  })

  it('renders mermaid notes as mermaid.ink image', () => {
    const knowledge = makeCommand({ notes: [{ mermaid: 'graph LR; A-->B' }] })
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
  ])('produces non-empty doc', (type, yamlContent, expectedText) => {
    it(`for a ${type} entry`, () => {
      const entries = parseSourceFile(SOURCE, yamlContent)
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
    const result = assembleNotesDoc(makeBookmark())
    expect(result._unsafeUnwrap()).toBe('')
  })

  it('joins multiple fragments with double newlines', () => {
    const knowledge = makeBookmark({ notes: [{ md: 'Part 1' }, { md: 'Part 2' }] })
    const result = assembleNotesDoc(knowledge)
    expect(result._unsafeUnwrap()).toBe('Part 1\n\nPart 2')
  })
})
