import { describe, expect, it } from 'bun:test'
import { factoryFor } from './factories.builder'

describe('factoryFor()', () => {
  describe('bookmark preset', () => {
    it('defaults type bookmark', () => {
      const row = factoryFor('bookmark')
      expect(row.type).toBe('bookmark')
    })
  })

  describe('loadedConfig preset', () => {
    it('uses minimal sources path', () => {
      const cfg = factoryFor('loadedConfig')
      expect(cfg.sources.path).toContain('minimal')
    })
  })

  it('produces rows with non-empty doc', () => {
    const bookmark = factoryFor('bookmark')
    expect(bookmark.doc.length).toBeGreaterThan(0)

    const command = factoryFor('command')
    expect(command.doc.length).toBeGreaterThan(0)

    const cheat = factoryFor('cheat')
    expect(cheat.doc.length).toBeGreaterThan(0)

    const task = factoryFor('task')
    expect(task.doc.length).toBeGreaterThan(0)
  })

  describe('knowledge FTS ranking pair', () => {
    it('builds weaker and stronger presets for BM25 specs', () => {
      const weaker = factoryFor('knowledge:weaker')
      const stronger = factoryFor('knowledge:stronger')
      expect(weaker.type).toBe('bookmark')
      expect(stronger.type).toBe('command')
      expect(weaker.tags).toContain('coding')
      expect(stronger.tags).toContain('brew')
    })
  })
})
