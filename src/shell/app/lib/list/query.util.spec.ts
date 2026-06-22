import { describe, expect, it } from 'bun:test'
import { createSeededMemoryDb, factoryFor } from '@testing'
import { countKnowledgeForOpts, listKnowledgeForOpts } from './query.util'

describe('countKnowledgeForOpts', () => {
  it('matches list length for same filters', async () => {
    const { raw } = await createSeededMemoryDb()
    const loaded = factoryFor('loadedConfig', {
      overrides: {
        display: { pageSize: '50', terminalApp: 'Terminal.app', editorApp: 'Code.app' }
      }
    })
    const cache = new Map()
    const filters = { query: 'git' }
    const listed = listKnowledgeForOpts(raw, loaded, { ...filters, limit: -1, offset: 0 }, cache)
    expect(countKnowledgeForOpts(raw, loaded, filters)).toBe(listed.length)
  })
})
