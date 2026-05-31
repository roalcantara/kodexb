import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'
import { installBunDollarMock, uninstallBunDollarMock } from '@testing'

let frontmostBundleId: string | null = null
let openExternalResult: boolean | 'throw' = true

mock.module('./resolve_frontmost_app.util', () => ({
  resolveFrontmostAppBundleId: () => frontmostBundleId
}))

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
    it('returns ok:true', async () => {
      frontmostBundleId = 'com.google.Chrome'
      const { openInBrowser } = await import('./browser_handoff.util')
      expect(openInBrowser('https://example.com')).toEqual({ ok: true })
    })
  })

  describe('when frontmost is unknown (Linux equivalent)', () => {
    describe('when Utils.openExternal returns true', () => {
      it('returns ok:true', async () => {
        frontmostBundleId = null
        openExternalResult = true
        const { openInBrowser } = await import('./browser_handoff.util')
        expect(openInBrowser('https://example.com')).toEqual({ ok: true })
      })
    })

    describe('when Utils.openExternal returns false', () => {
      it('returns error', async () => {
        frontmostBundleId = null
        openExternalResult = false
        const { openInBrowser } = await import('./browser_handoff.util')
        expect(openInBrowser('https://example.com')).toEqual({
          ok: false,
          error: expect.stringContaining('openExternal')
        })
      })
    })
  })

  describe('when Utils.openExternal throws', () => {
    it('returns error with thrown message', async () => {
      frontmostBundleId = null
      openExternalResult = 'throw'
      const { openInBrowser } = await import('./browser_handoff.util')
      expect(openInBrowser('https://example.com')).toEqual({ ok: false, error: 'Error: bridge error' })
    })
  })
})
