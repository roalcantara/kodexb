import { afterEach, describe, expect, test } from 'bun:test'
import path from 'node:path'

import { createTempDir } from '@testing/helpers/testing.tmp'

import { loadWindowState, loadWindowStateSync, parseWindowStateJson, saveWindowState, validateBounds } from './state'

describe('window.state', () => {
  test('validateBounds returns false for non-positive dimensions', () => {
    expect(validateBounds({ x: 0, y: 0, width: 0, height: 600 })).toBe(false)
    expect(validateBounds({ x: 0, y: 0, width: 820, height: -1 })).toBe(false)
    expect(validateBounds({ x: 0, y: 0, width: Number.NaN, height: 600 })).toBe(false)
    expect(validateBounds({ x: -10, y: 5, width: 400, height: 300 })).toBe(true)
  })

  test('parseWindowStateJson returns null for corrupt JSON', () => {
    expect(parseWindowStateJson('not json')).toBeNull()
    expect(parseWindowStateJson('{}')).toBeNull()
    expect(parseWindowStateJson('{"x":0,"y":0,"width":0,"height":1}')).toBeNull()
  })

  test('parseWindowStateJson returns bounds when valid', () => {
    expect(parseWindowStateJson('{"x":1,"y":2,"width":3,"height":4}')).toEqual({
      x: 1,
      y: 2,
      width: 3,
      height: 4
    })
  })
})

describe('loadWindowState / saveWindowState', () => {
  let tmp: Awaited<ReturnType<typeof createTempDir>> | undefined

  afterEach(async () => {
    await tmp?.cleanup()
    tmp = undefined
  })

  test('loadWindowState returns null when file missing', async () => {
    tmp = await createTempDir()
    const cfg = path.join(tmp.dir, 'config.yaml')
    expect(await loadWindowState(cfg)).toBeNull()
    expect(loadWindowStateSync(cfg)).toBeNull()
  })

  test('loadWindowState returns null when file is corrupt JSON', async () => {
    tmp = await createTempDir()
    const cfg = path.join(tmp.dir, 'config.yaml')
    const statePath = path.join(tmp.dir, 'window-state.json')
    await Bun.write(statePath, '{broken')
    expect(await loadWindowState(cfg)).toBeNull()
    expect(loadWindowStateSync(cfg)).toBeNull()
  })

  test('save then load returns same bounds', async () => {
    tmp = await createTempDir()
    const cfg = path.join(tmp.dir, 'config.yaml')
    const bounds = { x: 10, y: 20, width: 640, height: 480 }
    await saveWindowState(cfg, bounds)
    expect(await loadWindowState(cfg)).toEqual(bounds)
    expect(loadWindowStateSync(cfg)).toEqual(bounds)
  })
})
