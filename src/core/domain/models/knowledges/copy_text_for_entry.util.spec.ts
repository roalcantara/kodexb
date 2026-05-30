import { describe, expect, it } from 'bun:test'
import { factoryFor } from '@testing'
import { copyTextForEntry } from './copy_text_for_entry.util'

describe('copyTextForEntry()', () => {
  describe.each([
    ['bookmark', factoryFor('knowledge:bookmark', { overrides: { key: 'https://x' } }), 'https://x'],
    ['command', factoryFor('knowledge:command', { overrides: { key: 'bun test' } }), 'bun test'],
    ['cheat', factoryFor('knowledge:cheat', { overrides: { doc: 'body', key: 'title' } }), 'body'],
    ['task', factoryFor('knowledge:task', { overrides: { doc: 'notes here', key: 'Task title' } }), 'notes here'],
    ['cheat with empty doc', factoryFor('knowledge:cheat', { overrides: { doc: '' } }), ''],
    ['task with empty doc', factoryFor('knowledge:task', { overrides: { doc: '' } }), '']
  ])('when entry is %s', (_, knowledge, expected) => {
    it('returns copy text', () => {
      expect(copyTextForEntry(knowledge)).toBe(expected)
    })
  })
})
