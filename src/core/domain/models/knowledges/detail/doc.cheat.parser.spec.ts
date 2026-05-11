import { describe, expect, it } from 'bun:test'
import type { CheatKnowledge } from '../schemas/knowledge.schema'
import { buildCheatPreamble } from './doc.cheat.parser'

const cheatEntry: CheatKnowledge = {
  id: 1,
  type: 'cheat',
  key: 'sample-cheat',
  source: '/f.yml',
  desc: 'A cheat',
  tags: ['math'],
  doc: '',
  createdAt: 0,
  updatedAt: 0
}

describe('buildCheatPreamble()', () => {
  it('always returns an empty string', () => {
    expect(buildCheatPreamble(cheatEntry)).toBe('')
  })
})
