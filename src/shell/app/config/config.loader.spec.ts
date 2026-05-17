import { describe, expect, it } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { loadConfig } from './config.loader'

const invalidFixture = path.join(import.meta.dir, '../../../__tests__/fixtures/config.invalid.yaml')
const CONFIG_AT = /config at/

describe('loadConfig', () => {
  it('rejects YAML with invalid schema', async () => {
    await expect(loadConfig(invalidFixture)).rejects.toThrow(CONFIG_AT)
  })

  it('rejects malformed YAML', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'kb-cfg-'))
    const cfgPath = path.join(dir, 'config.yaml')
    try {
      await writeFile(cfgPath, '{ not: valid yaml [[[\n', 'utf-8')
      await expect(loadConfig(cfgPath)).rejects.toThrow()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
