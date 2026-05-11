import { describe, expect, it } from 'bun:test'
import type { CommandKnowledge } from '../schemas/knowledge.schema'
import { buildCommandPreamble } from './doc.command.parser'

const cmd: CommandKnowledge = {
  id: 1,
  type: 'command',
  key: 'git status',
  source: '/f.yml',
  desc: 'Show working tree status',
  tags: ['git'],
  doc: '',
  createdAt: 0,
  updatedAt: 0
}

describe('buildCommandPreamble()', () => {
  it('renders a fenced sh block with the key, then DESCRIPTION blockquote', () => {
    const out = buildCommandPreamble(cmd)
    expect(out).toContain('```sh')
    expect(out).toContain('git status')
    expect(out).toContain('```')
    expect(out).toContain('### DESCRIPTION')
    expect(out).toContain('> Show working tree status')
  })
})
