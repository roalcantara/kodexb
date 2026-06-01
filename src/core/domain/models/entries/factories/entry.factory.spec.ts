import { describe, expect, it } from 'bun:test'
import type { ShortcutEntry } from '../schemas/entry.schema'
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

describe('toEntry() — shortcut type', () => {
  it('parses a shortcut entry with chord strings', () => {
    const raw = {
      desc: 'VS Code shortcuts',
      tags: ['editor'],
      platform: 'macos',
      bindings: [
        { chord: 'cmd+p', scope: 'global', action: 'Quick Open' },
        { chord: 'cmd+shift+p', scope: 'global', action: 'Command Palette' }
      ]
    }
    const e = toEntry('shortcut', raw, 'vscode', '/shortcuts.yml') as ShortcutEntry
    expect(e.type).toBe('shortcut')
    if (e.type === 'shortcut') {
      expect(e.key).toBe('vscode')
      expect(e.bindings).toHaveLength(2)
      expect(e.bindings[0]?.action).toBe('Quick Open')
      expect(e.bindings[0]?.chord).toHaveLength(1)
      expect(e.bindings[0]?.chord[0]?.key).toBe('p')
      expect(e.bindings[0]?.chord[0]?.modifiers).toEqual(['cmd'])
      expect(e.bindings[1]?.chord[0]?.modifiers).toEqual(['cmd', 'shift'])
    }
  })

  it('preserves entry-level platform field', () => {
    const raw = {
      desc: 'Linux shortcuts',
      tags: ['linux'],
      platform: 'linux',
      bindings: [{ chord: 'ctrl+c', scope: 'global', action: 'Copy' }]
    }
    const e = toEntry('shortcut', raw, 'shell', '/shortcuts.yml') as ShortcutEntry
    if (e.type === 'shortcut') {
      expect(e.platform).toBe('linux')
    }
  })

  it('filters out bindings with unparsable chords and keeps valid ones', () => {
    const raw = {
      desc: 'Mixed',
      tags: ['x'],
      bindings: [
        { chord: '', scope: 'global', action: 'Bad' },
        { chord: 'cmd+s', scope: 'global', action: 'Save' }
      ]
    }
    const e = toEntry('shortcut', raw, 'app', '/shortcuts.yml') as ShortcutEntry
    if (e.type === 'shortcut') {
      expect(e.bindings).toHaveLength(1)
      expect(e.bindings[0]?.action).toBe('Save')
    }
  })

  it('throws when all bindings fail chord parsing', () => {
    const raw = {
      desc: 'All bad',
      tags: ['x'],
      bindings: [{ chord: '', scope: 'global', action: 'Bad' }]
    }
    expect(() => toEntry('shortcut', raw, 'allbad', '/shortcuts.yml')).toThrow()
  })

  it('throws when bindings array is missing', () => {
    const raw = { desc: 'Empty shortcuts', tags: ['empty'] }
    expect(() => toEntry('shortcut', raw, 'empty', '/shortcuts.yml')).toThrow()
  })

  it('throws on invalid shortcut entry (missing action)', () => {
    const raw = {
      desc: 'Bad',
      tags: ['bad'],
      bindings: [{ chord: 'cmd+p', scope: 'global', action: '' }]
    }
    expect(() => toEntry('shortcut', raw, 'bad', '/shortcuts.yml')).toThrow()
  })
})
