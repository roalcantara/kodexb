import { describe, expect, it } from 'bun:test'
import { setBunSpawnSyncResult, setupBunSpawnSyncMock } from '@testing'

import { resolveFrontmostAppBundleId } from './app.resolver'

setupBunSpawnSyncMock({ stdout: Buffer.from('') })

describe('resolveFrontmostAppBundleId()', () => {
  describe('when platform is darwin', () => {
    describe('when osascript returns a bundle id', () => {
      it('returns the trimmed bundle id', () => {
        setBunSpawnSyncResult({ stdout: Buffer.from('com.apple.Safari') })
        expect(resolveFrontmostAppBundleId('darwin')).toBe('com.apple.Safari')
      })
    })

    describe('when osascript returns empty stdout', () => {
      it('returns null', () => {
        setBunSpawnSyncResult({ stdout: Buffer.from('') })
        expect(resolveFrontmostAppBundleId('darwin')).toBeNull()
      })
    })

    describe('when Bun.spawnSync throws', () => {
      it('returns null', () => {
        setBunSpawnSyncResult('throw')
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
