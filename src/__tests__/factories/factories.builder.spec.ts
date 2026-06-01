import { describe, expect, it } from 'bun:test'
import { factoryFor } from './factories.builder'

describe('factoryFor()', () => {
  describe.each(['bookmark', 'command', 'cheat', 'task'] as const)('with param `%s`', val => {
    const value = factoryFor(val)
    it(`builds entry type ${val}`, () => {
      expect(value.type).toBe(val)
    })
    it('with non-empty doc', () => {
      expect(value.doc.length).toBeGreaterThan(0)
    })
  })

  describe('with param `loadedConfig`', () => {
    const value = factoryFor('loadedConfig')
    it('builds a config', () => {
      expect(value).toBeDefined()
    })
    it('with source path `minimal`', () => {
      expect(value.sources.path).toContain('minimal')
    })
  })

  describe.each([
    ['knowledge:weaker', 'bookmark', 'coding'],
    ['knowledge:stronger', 'command', 'brew']
  ])('with param `%s` of `%s` with `%s`', (name, model, prop) => {
    const value = factoryFor(name as 'knowledge:weaker' | 'knowledge:stronger')
    it(`builds ${model}`, () => {
      expect(value.type).toBe(model as 'bookmark' | 'command')
    })
    it(`with tag '${prop}'`, () => {
      expect(value.tags).toContain(prop as string)
    })
  })
})
