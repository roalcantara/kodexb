import { describe, expect, it } from 'bun:test'
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
