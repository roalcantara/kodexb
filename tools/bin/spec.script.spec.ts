import { describe, expect, it } from 'bun:test'

describe('spec.script', () => {
  it('exports a dispatch entrypoint module', async () => {
    const mod = await import('./spec.script.ts')
    expect(typeof mod).toBe('object')
  })
})
