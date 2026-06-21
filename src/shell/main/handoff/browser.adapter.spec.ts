import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  installBunDollarMock,
  installBunSpawnSyncMock,
  uninstallBunDollarMock,
  uninstallBunSpawnSyncMock
} from '@testing'

let openExternalResult: boolean | 'throw' = true

mock.module('electrobun/bun', () => ({
  Utils: {
    openExternal: () => {
      if (openExternalResult === 'throw') throw new Error('bridge error')
      return openExternalResult
    }
  }
}))

beforeAll(() => installBunDollarMock())
afterAll(() => uninstallBunDollarMock())

describe('openInBrowser()', () => {
  describe('when frontmost is a known browser bundle', () => {
    beforeEach(() => {
      installBunSpawnSyncMock({ stdout: Buffer.from('com.google.Chrome') })
    })
    afterEach(() => {
      uninstallBunSpawnSyncMock()
    })

    it('returns ok:true', async () => {
      const { openInBrowser } = await import('./browser.adapter')
      expect(openInBrowser('https://example.com', 'darwin')).toEqual({ ok: true })
    })
  })

  describe('when frontmost is unknown (Linux equivalent)', () => {
    describe('when Utils.openExternal returns true', () => {
      it('returns ok:true', async () => {
        openExternalResult = true
        const { openInBrowser } = await import('./browser.adapter')
        expect(openInBrowser('https://example.com', 'linux')).toEqual({ ok: true })
      })
    })

    describe('when Utils.openExternal returns false', () => {
      it('returns error', async () => {
        openExternalResult = false
        const { openInBrowser } = await import('./browser.adapter')
        expect(openInBrowser('https://example.com', 'linux')).toEqual({
          ok: false,
          error: expect.stringContaining('openExternal')
        })
      })
    })
  })

  describe('when Utils.openExternal throws', () => {
    it('returns error with thrown message', async () => {
      openExternalResult = 'throw'
      const { openInBrowser } = await import('./browser.adapter')
      expect(openInBrowser('https://example.com', 'linux')).toEqual({ ok: false, error: 'Error: bridge error' })
    })
  })
})
