import { describe, expect, it } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
import { copyTextForEntry } from './copy_text_for_entry.util'

function row(type: RpcKnowledge['type'], overrides: Partial<RpcKnowledge> = {}): RpcKnowledge {
  const base = {
    id: 1,
    key: 'k',
    desc: '',
    tags: [] as string[],
    doc: '',
    source: '/s.yaml',
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  }
  return factoryFor(type, { overrides: base }) as RpcKnowledge
}

describe('copyTextForEntry', () => {
  it('uses key for bookmark', () => {
    expect(copyTextForEntry(row('bookmark', { key: 'https://x' }))).toBe('https://x')
  })

  it('uses key for command', () => {
    expect(copyTextForEntry(row('command', { key: 'bun test' }))).toBe('bun test')
  })

  it('uses doc for cheat', () => {
    expect(copyTextForEntry(row('cheat', { doc: 'body', key: 'title' }))).toBe('body')
  })

  it('uses doc for task', () => {
    expect(copyTextForEntry(row('task', { doc: 'notes here', key: 'Task title' }))).toBe('notes here')
  })

  it('uses empty string when doc is empty for cheat and task', () => {
    expect(copyTextForEntry(row('cheat', { doc: '' }))).toBe('')
    expect(copyTextForEntry(row('task', { doc: '' }))).toBe('')
  })
})
