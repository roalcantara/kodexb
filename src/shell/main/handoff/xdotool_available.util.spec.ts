import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { installBunDollarMock, setBunDollarThrow, uninstallBunDollarMock } from '@testing'

beforeAll(() => installBunDollarMock())
afterAll(() => uninstallBunDollarMock())

describe('xdotoolAvailable()', () => {
  describe('when which xdotool succeeds', () => {
    it('returns true', async () => {
      setBunDollarThrow(false)
      const { xdotoolAvailable } = await import('./xdotool_available.util')
      expect(xdotoolAvailable()).toBe(true)
    })
  })

  describe('when which xdotool throws', () => {
    it('returns false', async () => {
      setBunDollarThrow(true)
      const { xdotoolAvailable } = await import('./xdotool_available.util')
      expect(xdotoolAvailable()).toBe(false)
    })
  })
})
