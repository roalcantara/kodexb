import { beforeEach, describe, expect, it } from 'bun:test'

describe('testing.bun_spawn_sync.mock', () => {
  let mod: typeof import('./testing.bun_spawn_sync.mock')

  beforeEach(async () => {
    mod = await import('./testing.bun_spawn_sync.mock')
    mod.uninstallBunSpawnSyncMock()
  })

  it('exports install, uninstall, set, reset, and setup helpers', () => {
    expect(typeof mod.installBunSpawnSyncMock).toBe('function')
    expect(typeof mod.uninstallBunSpawnSyncMock).toBe('function')
    expect(typeof mod.setBunSpawnSyncResult).toBe('function')
    expect(typeof mod.resetBunSpawnSyncMock).toBe('function')
    expect(typeof mod.setupBunSpawnSyncMock).toBe('function')
  })

  describe('when installed', () => {
    beforeEach(() => {
      mod.installBunSpawnSyncMock()
    })

    it('returns configured stdout', () => {
      mod.setBunSpawnSyncResult({ stdout: Buffer.from('com.apple.Safari') })
      const result = Bun.spawnSync(['osascript', '-e', ''])
      expect(result.stdout?.toString()).toBe('com.apple.Safari')
    })

    it('throws when stub is throw', () => {
      mod.setBunSpawnSyncResult('throw')
      expect(() => Bun.spawnSync([])).toThrow('spawn failed')
    })

    it('restores original after uninstall', () => {
      const whileMocked = Bun.spawnSync
      mod.uninstallBunSpawnSyncMock()
      expect(Bun.spawnSync).not.toBe(whileMocked)
    })
  })
})
