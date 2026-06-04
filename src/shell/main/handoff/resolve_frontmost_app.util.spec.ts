import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { resolveFrontmostAppBundleId } from './resolve_frontmost_app.util'

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
      it('returns the trimmed bundle id', () => {
        spawnSyncResult = { stdout: Buffer.from('com.apple.Safari') }
        expect(resolveFrontmostAppBundleId('darwin')).toBe('com.apple.Safari')
      })
    })

    describe('when osascript returns empty stdout', () => {
      it('returns null', () => {
        spawnSyncResult = { stdout: Buffer.from('') }
        expect(resolveFrontmostAppBundleId('darwin')).toBeNull()
      })
    })

    describe('when Bun.spawnSync throws', () => {
      it('returns null', () => {
        spawnSyncResult = 'throw'
        expect(resolveFrontmostAppBundleId('darwin')).toBeNull()
      })
    })
  })

  describe('when platform is not darwin', () => {
    it('returns null', () => {
      expect(resolveFrontmostAppBundleId('linux')).toBeNull()
    })
  })
})
