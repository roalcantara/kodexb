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
    it('does not parse the content', () => {
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

  describe('when the reader returns valid text', () => {
    it('parses the text', () => {
      expect(loadWindowStateFrom('/tmp/config.yaml', parse, () => 'ok')).toEqual(bounds)
    })

    describe('when the reader returns invalid text', () => {
      it('returns null', () => {
        expect(loadWindowStateFrom('/tmp/config.yaml', parse, () => 'bad')).toBeNull()
      })
    })
  })

  describe('when the reader returns a promise', () => {
    it('parses the text', () => {
      expect(loadWindowStateFrom('/tmp/config.yaml', parse, async () => 'ok')).resolves.toEqual(bounds)
    })

    describe('when the reader rejects', () => {
      it('returns null', () => {
        expect(
          loadWindowStateFrom('/tmp/config.yaml', parse, async () => Promise.reject(new Error('read failed')))
        ).resolves.toBeNull()
      })
    })
  })
})
