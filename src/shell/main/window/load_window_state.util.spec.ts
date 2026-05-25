import { describe, expect, it } from 'bun:test'
import path from 'node:path'

import { factoryFor } from '@testing'

import { loadWindowStateFrom, windowStatePathForConfigFile } from './load_window_state.util'

describe('windowStatePathForConfigFile', () => {
  it('places window-state.json beside the config file', () => {
    const cfg = '/data/kb/config.yaml'
    expect(windowStatePathForConfigFile(cfg)).toBe(path.join('/data/kb', 'window-state.json'))
  })
})

describe('loadWindowStateFrom', () => {
  const bounds = factoryFor('rectangle', { overrides: { x: 1, y: 2, width: 640, height: 480 } })
  const parse = (text: string) => (text === 'ok' ? bounds : null)

  describe('when the reader returns null', () => {
    it('returns null without calling parse on content', () => {
      let parseCalls = 0
      const result = loadWindowStateFrom(
        '/tmp/config.yaml',
        () => {
          parseCalls += 1
          return bounds
        },
        () => null
      )
      expect(result).toBeNull()
      expect(parseCalls).toBe(0)
    })
  })

  describe('when the reader returns text synchronously', () => {
    it('returns parsed bounds', () => {
      expect(loadWindowStateFrom('/tmp/config.yaml', parse, () => 'ok')).toEqual(bounds)
    })

    it('returns null when parse rejects the text', () => {
      expect(loadWindowStateFrom('/tmp/config.yaml', parse, () => 'bad')).toBeNull()
    })
  })

  describe('when the reader returns a promise', () => {
    it('returns parsed bounds', async () => {
      await expect(loadWindowStateFrom('/tmp/config.yaml', parse, async () => 'ok')).resolves.toEqual(bounds)
    })

    it('returns null when the reader rejects', async () => {
      await expect(
        loadWindowStateFrom('/tmp/config.yaml', parse, async () => Promise.reject(new Error('read failed')))
      ).resolves.toBeNull()
    })
  })
})
