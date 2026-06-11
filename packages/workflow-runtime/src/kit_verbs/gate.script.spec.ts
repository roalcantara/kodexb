import { describe, expect, it } from 'bun:test'

describe('kit gate', () => {
  it('dispatch module is importable', async () => {
    const mod = await import('./gate.script.ts')
    expect(typeof mod.run).toBe('function')
  })
})

describe('kit pr-prep', () => {
  it('dispatch module is importable', async () => {
    const mod = await import('./pr_prep.script.ts')
    expect(typeof mod.run).toBe('function')
  })
})

describe('kit pr-open', () => {
  it('dispatch module is importable', async () => {
    const mod = await import('./pr_open.script.ts')
    expect(typeof mod.run).toBe('function')
  })
})

describe('kit pr-check', () => {
  it('dispatch module is importable', async () => {
    const mod = await import('./pr_check.script.ts')
    expect(typeof mod.run).toBe('function')
  })
})
