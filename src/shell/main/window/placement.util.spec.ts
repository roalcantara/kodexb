import { describe, expect, test } from 'bun:test'
import type { Display, Rectangle } from 'electrobun/bun'

import {
  centerBoundsInWorkArea,
  isUsableWorkArea,
  resolveInitialFrame,
  SAFE_FALLBACK_X,
  SAFE_FALLBACK_Y
} from './placement.util'

const fakeDisplay = (workArea: Rectangle): Display => ({
  id: 1,
  bounds: workArea,
  workArea,
  scaleFactor: 1,
  isPrimary: true
})

describe('centerBoundsInWorkArea', () => {
  test('centers within a zero-origin work area', () => {
    const frame = centerBoundsInWorkArea({ x: 0, y: 0, width: 1920, height: 1080 }, { width: 680, height: 420 })
    expect(frame).toEqual({ x: 620, y: 330, width: 680, height: 420 })
  })

  test('honors a non-zero work-area origin (macOS menu-bar offset)', () => {
    const frame = centerBoundsInWorkArea({ x: 0, y: 25, width: 1440, height: 875 }, { width: 680, height: 420 })
    expect(frame).toEqual({ x: 380, y: 253, width: 680, height: 420 })
  })

  test('rounds half-pixel offsets to integers', () => {
    const frame = centerBoundsInWorkArea({ x: 0, y: 0, width: 1001, height: 601 }, { width: 200, height: 100 })
    expect(frame).toEqual({ x: 401, y: 251, width: 200, height: 100 })
    expect(Number.isInteger(frame.x)).toBe(true)
    expect(Number.isInteger(frame.y)).toBe(true)
  })

  test('clamps to work-area origin when window exactly fills the work area', () => {
    const frame = centerBoundsInWorkArea({ x: 10, y: 20, width: 680, height: 420 }, { width: 680, height: 420 })
    expect(frame).toEqual({ x: 10, y: 20, width: 680, height: 420 })
  })

  test('pins to work-area origin when window is larger than work area', () => {
    const frame = centerBoundsInWorkArea({ x: 10, y: 20, width: 600, height: 400 }, { width: 800, height: 500 })
    expect(frame).toEqual({ x: 10, y: 20, width: 800, height: 500 })
  })

  test('floors fractional input sizes', () => {
    const frame = centerBoundsInWorkArea({ x: 0, y: 0, width: 1000, height: 800 }, { width: 680.9, height: 420.1 })
    expect(frame.width).toBe(680)
    expect(frame.height).toBe(420)
  })
})

describe('isUsableWorkArea', () => {
  test('rejects null/undefined and zero-or-negative dimensions', () => {
    expect(isUsableWorkArea(null)).toBe(false)
    expect(isUsableWorkArea(undefined)).toBe(false)
    expect(isUsableWorkArea({ x: 0, y: 0, width: 0, height: 600 })).toBe(false)
    expect(isUsableWorkArea({ x: 0, y: 0, width: 800, height: -1 })).toBe(false)
    expect(isUsableWorkArea({ x: 0, y: 0, width: Number.NaN, height: 600 })).toBe(false)
  })

  test('accepts a normal work area', () => {
    expect(isUsableWorkArea({ x: 0, y: 25, width: 1440, height: 875 })).toBe(true)
  })
})

describe('resolveInitialFrame', () => {
  test('centers when display has a usable work area', () => {
    const display = fakeDisplay({ x: 0, y: 0, width: 1920, height: 1080 })
    expect(resolveInitialFrame(display, { width: 680, height: 420 })).toEqual({
      x: 620,
      y: 330,
      width: 680,
      height: 420
    })
  })

  test('falls back to safe coordinates when display is null', () => {
    expect(resolveInitialFrame(null, { width: 680, height: 420 })).toEqual({
      x: SAFE_FALLBACK_X,
      y: SAFE_FALLBACK_Y,
      width: 680,
      height: 420
    })
  })

  test('falls back when work area has zero dimensions (Electrobun default empty Display)', () => {
    const display = fakeDisplay({ x: 0, y: 0, width: 0, height: 0 })
    expect(resolveInitialFrame(display, { width: 680, height: 420 })).toEqual({
      x: SAFE_FALLBACK_X,
      y: SAFE_FALLBACK_Y,
      width: 680,
      height: 420
    })
  })
})
