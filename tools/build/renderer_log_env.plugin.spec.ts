import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { rendererLogEnvPlugin } from './renderer_log_env.plugin'

const root = join(import.meta.dir, '../..')
const rendererBuildEnv = join(root, 'src/shared/logging/renderer_build_env.ts')

describe('rendererLogEnvPlugin', () => {
  let originalLogLevel: string | undefined
  let originalNodeEnv: string | undefined

  beforeEach(() => {
    originalLogLevel = process.env.LOG_LEVEL
    originalNodeEnv = process.env.NODE_ENV
    process.env.LOG_LEVEL = 'trace'
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    if (originalLogLevel === undefined) delete process.env.LOG_LEVEL
    else process.env.LOG_LEVEL = originalLogLevel
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
  })

  it('inlines LOG_LEVEL and NODE_ENV literals into the renderer build env module', async () => {
    const result = await Bun.build({
      entrypoints: [rendererBuildEnv],
      plugins: [rendererLogEnvPlugin()],
      target: 'browser',
      write: false
    })
    expect(result.success).toBe(true)
    const text = await result.outputs[0]?.text()
    expect(text).toContain('LOG_LEVEL: "trace"')
    expect(text).not.toContain('process.env.LOG_LEVEL')
  })
})
