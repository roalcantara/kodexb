import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { loadConfig, saveConfig } from './config.loader'

const invalidFixture = path.join(import.meta.dir, '../../../__tests__/fixtures/config.invalid.yaml')
const CONFIG_AT = /config at/
const KB_TEST_RE = /kb-test/
const ORIGINAL_NODE_ENV = process.env.NODE_ENV

describe('loadConfig', () => {
  afterAll(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
  })

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

  describe('when NODE_ENV is test', () => {
    const testDir = path.join(tmpdir(), 'kb-cfg-test-profile')

    beforeAll(() => {
      process.env.NODE_ENV = 'test'
      process.env.KB_TEST_DIR = testDir
    })

    afterAll(async () => {
      await rm(testDir, { recursive: true, force: true })
      delete process.env.KB_TEST_DIR
    })

    it('resolves config under KB_TEST_DIR when no pathArg or APP_CONFIG_PATH', async () => {
      const cfg = await loadConfig()
      expect(cfg.configPath).toStartWith(testDir)
      expect(cfg.configPath).toEndWith('config.yaml')
      expect(cfg.database.path).toStartWith(testDir)
      expect(cfg.database.path).toEndWith('knowledge.sqlite')
      expect(cfg.sources.path).toStartWith(testDir)
      expect(cfg.sources.path).toEndWith('sources')
    })

    it('creates config.yaml if missing', async () => {
      const fresh = path.join(testDir, '_fresh', 'config.yaml')
      const db = path.join(testDir, '_fresh', 'knowledge.sqlite')
      const src = path.join(testDir, '_fresh', 'sources')
      await mkdir(path.dirname(fresh), { recursive: true })
      process.env.KB_TEST_DIR = path.dirname(fresh)
      try {
        const cfg = await loadConfig()
        const stat = await import('node:fs/promises').then(m => m.stat(fresh))
        expect(stat.isFile()).toBe(true)
        expect(cfg.configPath).toBe(fresh)
        expect(cfg.database.path).toBe(db)
        expect(cfg.sources.path).toBe(src)
      } finally {
        await rm(path.dirname(fresh), { recursive: true, force: true })
      }
    })

    it('honours APP_CONFIG_PATH override over test profile', async () => {
      const customDir = await mkdtemp(path.join(tmpdir(), 'kb-cfg-override-'))
      const customCfg = path.join(customDir, 'my-config.yaml')
      await writeFile(customCfg, 'display:\n  pageSize: "100"\n')
      process.env.APP_CONFIG_PATH = customCfg
      try {
        const cfg = await loadConfig()
        expect(cfg.configPath).toBe(customCfg)
        expect(cfg.display.pageSize).toBe('100')
      } finally {
        await rm(customDir, { recursive: true, force: true })
        delete process.env.APP_CONFIG_PATH
      }
    })

    it('honours explicit pathArg over test profile', async () => {
      const explicitDir = await mkdtemp(path.join(tmpdir(), 'kb-cfg-explicit-'))
      const explicitCfg = path.join(explicitDir, 'explicit.yaml')
      await writeFile(explicitCfg, 'display:\n  pageSize: "200"\n')
      try {
        const cfg = await loadConfig(explicitCfg)
        expect(cfg.configPath).toBe(explicitCfg)
        expect(cfg.display.pageSize).toBe('200')
      } finally {
        await rm(explicitDir, { recursive: true, force: true })
      }
    })
  })

  describe('when NODE_ENV is development (default)', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'development'
      delete process.env.KB_TEST_DIR
    })

    it('does not use test profile paths when called with an explicit pathArg', async () => {
      const devDir = await mkdtemp(path.join(tmpdir(), 'kb-cfg-dev-'))
      const devCfg = path.join(devDir, 'config.yaml')
      await writeFile(devCfg, 'display:\n  pageSize: "25"\n')
      try {
        const cfg = await loadConfig(devCfg)
        expect(cfg.configPath).toBe(devCfg)
        expect(cfg.display.pageSize).toBe('25')
        expect(cfg.configPath).not.toMatch(KB_TEST_RE)
      } finally {
        await rm(devDir, { recursive: true, force: true })
      }
    })

    it('does not use test profile paths when APP_CONFIG_PATH is set', async () => {
      const devDir = await mkdtemp(path.join(tmpdir(), 'kb-cfg-dev2-'))
      const devCfg = path.join(devDir, 'config.yaml')
      await writeFile(devCfg, 'display:\n  pageSize: "50"\n')
      process.env.APP_CONFIG_PATH = devCfg
      try {
        const cfg = await loadConfig()
        expect(cfg.configPath).toBe(devCfg)
        expect(cfg.configPath).not.toMatch(KB_TEST_RE)
      } finally {
        await rm(devDir, { recursive: true, force: true })
        delete process.env.APP_CONFIG_PATH
      }
    })
  })

  describe('display.advisories round-trip', () => {
    it('loads advisories from YAML and persists through saveConfig', async () => {
      const dir = await mkdtemp(path.join(tmpdir(), 'kb-cfg-adv-'))
      const cfgPath = path.join(dir, 'config.yaml')
      try {
        await writeFile(cfgPath, 'display:\n  advisories: true\n', 'utf-8')
        const cfg = await loadConfig(cfgPath)
        expect(cfg.display.advisories).toBe(true)

        const patched = await saveConfig(cfg, { advisories: false })
        expect(patched.display.advisories).toBe(false)

        const reloaded = await loadConfig(cfgPath)
        expect(reloaded.display.advisories).toBe(false)
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    })

    it('defaults to undefined when advisories is absent', async () => {
      const dir = await mkdtemp(path.join(tmpdir(), 'kb-cfg-adv2-'))
      const cfgPath = path.join(dir, 'config.yaml')
      try {
        await writeFile(cfgPath, 'display:\n  pageSize: "50"\n', 'utf-8')
        const cfg = await loadConfig(cfgPath)
        expect(cfg.display.advisories).toBeUndefined()
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    })
  })
})
