import { describe, expect, it } from 'bun:test'
import { RENDERER_BUILD_ENV } from './renderer_build_env'

describe('RENDERER_BUILD_ENV', () => {
  it('exposes LOG_LEVEL and NODE_ENV keys from the build-time snapshot', () => {
    expect(RENDERER_BUILD_ENV).toHaveProperty('LOG_LEVEL')
    expect(RENDERER_BUILD_ENV).toHaveProperty('NODE_ENV')
  })
})
