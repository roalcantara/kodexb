import { describe, expect, it } from 'bun:test'

import { adaptPositionForNativeWindow, adaptPositionFromNativeWindow } from './darwin_window_frame.util'
import { primaryDisplay as display } from './window.spec.fixtures'

describe('adaptPositionForNativeWindow()', () => {
  it('passes through screen coordinates on darwin', () => {
    expect(adaptPositionForNativeWindow({ x: 481, y: 275 }, 'darwin', display, display, 600)).toEqual({
      x: 481,
      y: 275
    })
  })

  it('passes through on non-darwin platforms', () => {
    expect(adaptPositionForNativeWindow({ x: 10, y: 20 }, 'linux', display, display, 600)).toEqual({
      x: 10,
      y: 20
    })
  })
})

describe('adaptPositionFromNativeWindow()', () => {
  it('passes through screen coordinates on darwin', () => {
    expect(adaptPositionFromNativeWindow({ x: 2840, y: 546 }, 'darwin', display, display, 600)).toEqual({
      x: 2840,
      y: 546
    })
  })
})
