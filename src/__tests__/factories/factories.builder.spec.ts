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
})
