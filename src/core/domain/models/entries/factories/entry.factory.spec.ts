import { describe, expect, it } from 'bun:test'
import { toEntry, toEntryWithSourceHint } from './entry.factory'

const BAD_KEY_HINT = /\/abs\/file\.yml.*entry "bad-key"/

describe('toEntry()', () => {
  it('returns a non-task entry as-is when valid', () => {
    const raw = { desc: 'Example', tags: ['x'] }
    const e = toEntry('bookmark', raw, 'https://example.com', '/f.yml')
    expect(e.type).toBe('bookmark')
    expect(e.key).toBe('https://example.com')
  })

  it('parses task priority and status from the source row', () => {
    const raw = { desc: 'Do it', tags: ['todo'], priority: 'high', status: 'doing' }
    const e = toEntry('task', raw, 'task-key', '/f.yml')
    expect(e.type).toBe('task')
    if (e.type === 'task') {
      expect(e.priority).toBe('high')
      expect(e.status).toBe('doing')
    }
  })

  it('throws validation error for an invalid task row (empty desc)', () => {
    const raw = { desc: '', tags: [] }
    expect(() => toEntry('task', raw, '', '/f.yml')).toThrow()
  })
})

describe('toEntryWithSourceHint()', () => {
  it('rethrows with file:line hint when validation fails', () => {
    const raw = { desc: '', tags: [] }
    const yaml = `
tasks:
  bad-key:
    desc: ""
    tags: []
`
    let captured: Error | undefined
    try {
      toEntryWithSourceHint('task', raw, 'bad-key', '/abs/file.yml', 'tasks', yaml)
    } catch (err) {
      captured = err as Error
    }
    expect(captured?.message).toMatch(BAD_KEY_HINT)
  })

  it('returns the entry on success', () => {
    const raw = { desc: 'A', tags: ['t'] }
    const e = toEntryWithSourceHint('cheat', raw, 'k', '/f.yml', 'cheats', '')
    expect(e.type).toBe('cheat')
  })
})
