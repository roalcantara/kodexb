import { describe, expect, it } from 'bun:test'
import { crc32 } from '@shared/utils'
import type { Entry } from '../../entries/schemas/entry.schema'
import { deriveId, toKnowledge } from './knowledge.factory'

describe('deriveId()', () => {
  it('returns crc32(type + ":" + key)', () => {
    const expected = crc32('bookmark:https://example.com')
    expect(deriveId('bookmark', 'https://example.com')).toBe(expected)
  })

  it('is deterministic across calls', () => {
    const a = deriveId('command', 'git status')
    const b = deriveId('command', 'git status')
    expect(a).toBe(b)
  })

  it('is sensitive to type', () => {
    const a = deriveId('bookmark', 'k')
    const b = deriveId('cheat', 'k')
    expect(a).not.toBe(b)
  })

  it('is sensitive to key', () => {
    const a = deriveId('task', 'k1')
    const b = deriveId('task', 'k2')
    expect(a).not.toBe(b)
  })
})

describe('toKnowledge()', () => {
  it('adds id + createdAt + updatedAt to a non-task entry', () => {
    const now = 1_700_000_000_000
    const entry: Entry = {
      type: 'bookmark',
      key: 'https://example.com',
      source: '/f.yml',
      desc: 'Example',
      tags: ['x']
    }
    const k = toKnowledge(entry, now)
    expect(k.id).toBe(deriveId('bookmark', 'https://example.com'))
    expect(k.createdAt).toBe(now)
    expect(k.updatedAt).toBe(now)
  })

  it('preserves task-specific fields', () => {
    const now = 1_700_000_000_000
    const entry: Entry = {
      type: 'task',
      key: 't',
      source: '/f.yml',
      desc: 'Do',
      tags: ['todo'],
      status: 'todo'
    }
    const k = toKnowledge(entry, now)
    expect(k.type).toBe('task')
  })
})
