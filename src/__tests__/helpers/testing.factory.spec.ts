import { describe, expect, it } from 'bun:test'
import { Factory } from 'fishery'
import { createFactoryFor } from './testing.factory'

describe('createFactoryFor()', () => {
  const factories = {
    n: Factory.define<{ value: number }>(() => ({ value: 1 }))
  } as const
  const factoryForLocal = createFactoryFor(factories)

  describe('with plain partial', () => {
    it('merges overrides', () => {
      const row = factoryForLocal('n', { value: 2 })
      expect(row.value).toBe(2)
    })
  })

  describe('with wrapped opts', () => {
    it('runs afterBuild', () => {
      const row = factoryForLocal('n', {
        overrides: { value: 3 },
        afterBuild: r => ({ ...r, value: r.value + 1 })
      })
      expect(row.value).toBe(4)
    })
  })
})
