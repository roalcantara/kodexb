import { afterEach, describe, expect, it } from 'bun:test'
import path from 'node:path'

import { createTempDir, factoryFor } from '@testing'

import { loadWindowState, loadWindowStateSync, parseWindowStateJson, saveWindowState, validateBounds } from './state'

describe('validateBounds', () => {
  describe('with non-positive dimensions', () => {
    it('returns false', () => {
      expect(validateBounds(factoryFor('rectangle', { overrides: { width: 0 } }))).toBe(false)
      expect(validateBounds(factoryFor('rectangle', { overrides: { width: 820, height: -1 } }))).toBe(false)
      expect(validateBounds(factoryFor('rectangle', { overrides: { width: Number.NaN } }))).toBe(false)
    })
  })

  describe('with valid dimensions', () => {
    it('returns true', () => {
      expect(validateBounds(factoryFor('rectangle', { overrides: { x: -10, y: 5, width: 400, height: 300 } }))).toBe(
        true
      )
    })
  })
})

describe('parseWindowStateJson', () => {
  describe('with corrupt or invalid JSON', () => {
    it('returns null', () => {
      expect(parseWindowStateJson('not json')).toBeNull()
      expect(parseWindowStateJson('{}')).toBeNull()
      expect(parseWindowStateJson('{"x":0,"y":0,"width":0,"height":1}')).toBeNull()
    })
  })

  describe('with valid bounds JSON', () => {
    const validJson = '{"x":1,"y":2,"width":3,"height":4}'

    it('returns the parsed bounds', () => {
      expect(parseWindowStateJson(validJson)).toEqual(
        factoryFor('rectangle', { overrides: { x: 1, y: 2, width: 3, height: 4 } })
      )
    })
  })
})

describe('loadWindowState / saveWindowState', () => {
  let tmp: Awaited<ReturnType<typeof createTempDir>> | undefined

  afterEach(async () => {
    await tmp?.cleanup()
    tmp = undefined
  })

  describe('when the file is missing', () => {
    it('returns null', async () => {
      tmp = await createTempDir()
      const cfg = path.join(tmp.dir, 'config.yaml')
      expect(await loadWindowState(cfg)).toBeNull()
      expect(loadWindowStateSync(cfg)).toBeNull()
    })
  })

  describe('when the file is corrupt JSON', () => {
    it('returns null', async () => {
      tmp = await createTempDir()
      const cfg = path.join(tmp.dir, 'config.yaml')
      const statePath = path.join(tmp.dir, 'window-state.json')
      await Bun.write(statePath, '{broken')
      expect(await loadWindowState(cfg)).toBeNull()
      expect(loadWindowStateSync(cfg)).toBeNull()
    })
  })

  describe('after saving bounds', () => {
    const bounds = factoryFor('rectangle', { overrides: { x: 10, y: 20, width: 640, height: 480 } })

    it('load returns the same bounds', async () => {
      tmp = await createTempDir()
      const cfg = path.join(tmp.dir, 'config.yaml')
      await saveWindowState(cfg, bounds)
      expect(await loadWindowState(cfg)).toEqual(bounds)
      expect(loadWindowStateSync(cfg)).toEqual(bounds)
    })
  })
})
