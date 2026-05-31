import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

let spawnSyncResult: { stdout: Buffer } | 'throw' = { stdout: Buffer.from('') }

const origSpawnSync = Bun.spawnSync
beforeEach(() => {
  Bun.spawnSync = (() => {
    if (spawnSyncResult === 'throw') throw new Error('spawn failed')
    return spawnSyncResult
  }) as unknown as typeof Bun.spawnSync
})
afterEach(() => {
  Bun.spawnSync = origSpawnSync
})

describe('resolveFrontmostAppBundleId()', () => {
  describe('when platform is darwin', () => {
    describe('when osascript returns a bundle id', () => {
      it('returns the trimmed bundle id', async () => {
        spawnSyncResult = { stdout: Buffer.from('com.apple.Safari') }
        const { resolveFrontmostAppBundleId } = await import('./resolve_frontmost_app.util')
        expect(resolveFrontmostAppBundleId('darwin')).toBe('com.apple.Safari')
      })
    })

    describe('when osascript returns empty stdout', () => {
      it('returns null', async () => {
        spawnSyncResult = { stdout: Buffer.from('') }
        const { resolveFrontmostAppBundleId } = await import('./resolve_frontmost_app.util')
        expect(resolveFrontmostAppBundleId('darwin')).toBeNull()
      })
    })

    describe('when Bun.spawnSync throws', () => {
      it('returns null', async () => {
        spawnSyncResult = 'throw'
        const { resolveFrontmostAppBundleId } = await import('./resolve_frontmost_app.util')
        expect(resolveFrontmostAppBundleId('darwin')).toBeNull()
      })
    })
  })

  describe('when platform is not darwin', () => {
    it('returns null', async () => {
      const { resolveFrontmostAppBundleId } = await import('./resolve_frontmost_app.util')
      expect(resolveFrontmostAppBundleId('linux')).toBeNull()
    })
  })
})
