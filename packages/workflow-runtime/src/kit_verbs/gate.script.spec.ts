import { describe, expect, it } from 'bun:test'
import { KB_KIT_SMOKE_ENV } from '../kit_smoke.script.ts'

describe('kit gate', () => {
  it('dispatch module is importable', async () => {
    const mod = await import('./gate.script.ts')
    expect(typeof mod.run).toBe('function')
  })

  it('smoke mode skips gate.sh', async () => {
    const prev = process.env[KB_KIT_SMOKE_ENV]
    process.env[KB_KIT_SMOKE_ENV] = '1'
    const { run } = await import('./gate.script.ts')
    expect(run([])).toBe(0)
    if (prev === undefined) delete process.env[KB_KIT_SMOKE_ENV]
    else process.env[KB_KIT_SMOKE_ENV] = prev
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
