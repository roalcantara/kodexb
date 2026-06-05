import { describe, expect, it } from 'bun:test'

describe('test.script', () => {
  it('tag layerFilter defaults to both layers', async () => {
    const { layerFilter } = await import('../catalog/tag.script.ts')
    expect(layerFilter(false, false)).toEqual({ e2e: true, unit: true })
  })
})
