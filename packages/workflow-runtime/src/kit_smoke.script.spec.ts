import { describe, expect, it } from 'bun:test'
import { featureDirFromArgv, isKitSmokeMode, KB_KIT_SMOKE_ENV } from './kit_smoke.script.ts'

describe('kit_smoke', () => {
  it('isKitSmokeMode is true when KB_KIT_SMOKE=1', () => {
    const prev = process.env[KB_KIT_SMOKE_ENV]
    process.env[KB_KIT_SMOKE_ENV] = '1'
    expect(isKitSmokeMode()).toBe(true)
    if (prev === undefined) delete process.env[KB_KIT_SMOKE_ENV]
    else process.env[KB_KIT_SMOKE_ENV] = prev
  })

  it('featureDirFromArgv reads --feature', () => {
    expect(featureDirFromArgv(['--feature', 'features/demo'])).toBe('features/demo')
  })
})
