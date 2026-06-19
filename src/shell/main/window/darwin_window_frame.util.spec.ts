import { describe, expect, it } from 'bun:test'

import {
  applyNativeFrameWithCalibration,
  nativeFrameToScreenFrame,
  screenFrameToNativeFrame
} from './darwin_window_frame.util'

const display = (bounds: { x?: number; y?: number; width: number; height: number }, id = 1, isPrimary = id === 1) => ({
  id,
  bounds: { x: bounds.x ?? 0, y: bounds.y ?? 0, width: bounds.width, height: bounds.height },
  workArea: { x: bounds.x ?? 0, y: bounds.y ?? 0, width: bounds.width, height: bounds.height },
  scaleFactor: 2,
  isPrimary
})

describe('screenFrameToNativeFrame()', () => {
  it('uses primary height for built-in when external is primary', () => {
    const primary = display({ x: 0, width: 3008, height: 1692 }, 2, true)
    const macbook = display({ x: -1710, width: 1710, height: 1112 }, 1, false)
    const screenFrame = { x: -1229, y: 275, width: 748, height: 600 }

    expect(screenFrameToNativeFrame(screenFrame, macbook, primary)).toEqual({
      x: -1229,
      y: 817,
      width: 748,
      height: 600
    })
  })

  it('uses primary height for external when external is primary', () => {
    const primary = display({ x: 0, width: 3008, height: 1692 }, 2, true)
    const screenFrame = { x: 1130, y: 546, width: 748, height: 600 }

    expect(screenFrameToNativeFrame(screenFrame, primary, primary)).toEqual({
      x: 1130,
      y: 546,
      width: 748,
      height: 600
    })
  })

  it('offsets taller external when built-in is primary', () => {
    const primary = display({ x: -1710, width: 1710, height: 1112 }, 1, true)
    const external = display({ x: 0, width: 3008, height: 1692 }, 2, false)
    const screenFrame = { x: 1130, y: 546, width: 748, height: 600 }

    expect(screenFrameToNativeFrame(screenFrame, external, primary)).toEqual({
      x: 1130,
      y: -34,
      width: 748,
      height: 600
    })
  })
})

describe('nativeFrameToScreenFrame()', () => {
  it('round-trips through primary-height Y space', () => {
    const primary = display({ x: 0, width: 3008, height: 1692 }, 2, true)
    const macbook = display({ x: -1710, width: 1710, height: 1112 }, 1, false)
    const screenFrame = { x: -1229, y: 275, width: 748, height: 600 }
    const nativeFrame = screenFrameToNativeFrame(screenFrame, macbook, primary)

    expect(nativeFrameToScreenFrame(nativeFrame, macbook, primary)).toEqual(screenFrame)
  })
})

describe('applyNativeFrameWithCalibration()', () => {
  it('corrects height-delta drift after switching from built-in to external', () => {
    const primary = display({ x: 0, width: 3008, height: 1692 }, 2, true)
    const external = display({ x: 0, width: 3008, height: 1692 }, 2, true)
    const targetScreen = { x: 1130, y: 546, width: 748, height: 600 }
    const heightDelta = 1692 - 1112
    let nativeY = 546

    const win = {
      setFrame: (_x: number, y: number) => {
        nativeY = y
      },
      getFrame: () => ({ x: 1130, y: nativeY + heightDelta, width: 748, height: 600 })
    }

    applyNativeFrameWithCalibration(win, targetScreen, external, primary, 'darwin')

    expect(nativeY).toBe(546 - heightDelta)
  })
})
