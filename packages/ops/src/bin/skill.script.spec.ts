import { describe, expect, it } from 'bun:test'

describe('skill.script', () => {
  it('exports a dispatch entrypoint module', async () => {
    const mod = await import('./skill.script')
    expect(typeof mod).toBe('object')
  })
})
