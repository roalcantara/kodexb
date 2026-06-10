import { describe, expect, it } from 'bun:test'

describe('spec_test.script', () => {
  it('is importable', async () => {
    const mod = await import('./spec_test.script.ts')
    expect(typeof mod).toBe('object')
  })
})
