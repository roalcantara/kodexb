import { describe, expect, it } from 'bun:test'
import { factoryFor } from '@testing'

import {
  centerBoundsInWorkArea,
  isUsableWorkArea,
  resolveInitialFrame,
  SAFE_FALLBACK_X,
  SAFE_FALLBACK_Y
} from './placement.util'

const fakeDisplay = (workArea: ReturnType<typeof factoryFor<'rectangle'>>) => ({
  id: 1,
  bounds: workArea,
  workArea,
  scaleFactor: 1,
  isPrimary: true
})

describe('centerBoundsInWorkArea', () => {
  const windowSize = factoryFor('windowSize')

  describe('with a zero-origin work area', () => {
    const workArea = factoryFor('rectangle')
    const frame = () => centerBoundsInWorkArea(workArea, windowSize)

    it('centers the window', () => {
      expect(frame()).toEqual(factoryFor('rectangle', { overrides: { x: 620, y: 330, width: 680, height: 420 } }))
    })
  })

  describe('with a non-zero work-area origin', () => {
    const workArea = factoryFor('rectangle', { overrides: { y: 25, width: 1440, height: 875 } })
    const frame = () => centerBoundsInWorkArea(workArea, windowSize)

    it('honors the macOS menu-bar offset', () => {
      expect(frame()).toEqual(factoryFor('rectangle', { overrides: { x: 380, y: 253, width: 680, height: 420 } }))
    })
  })

  describe('with half-pixel offsets', () => {
    const workArea = factoryFor('rectangle', { overrides: { width: 1001, height: 601 } })
    const window = factoryFor('windowSize', { overrides: { width: 200, height: 100 } })
    const result = centerBoundsInWorkArea(workArea, window)

    it('rounds to integers', () => {
      expect(result).toEqual(factoryFor('rectangle', { overrides: { x: 401, y: 251, width: 200, height: 100 } }))
    })

    it('produces integer coordinates', () => {
      expect(Number.isInteger(result.x)).toBe(true)
      expect(Number.isInteger(result.y)).toBe(true)
    })
  })

  describe('when window fills the work area', () => {
    const workArea = factoryFor('rectangle', { overrides: { x: 10, y: 20, width: 680, height: 420 } })
    const frame = () => centerBoundsInWorkArea(workArea, windowSize)

    it('clamps to work-area origin', () => {
      expect(frame()).toEqual(factoryFor('rectangle', { overrides: { x: 10, y: 20, width: 680, height: 420 } }))
    })
  })

  describe('when window exceeds the work area', () => {
    const workArea = factoryFor('rectangle', { overrides: { x: 10, y: 20, width: 600, height: 400 } })
    const window = factoryFor('windowSize', { overrides: { width: 800, height: 500 } })
    const frame = () => centerBoundsInWorkArea(workArea, window)

    it('pins to work-area origin', () => {
      expect(frame()).toEqual(factoryFor('rectangle', { overrides: { x: 10, y: 20, width: 800, height: 500 } }))
    })
  })

  describe('with fractional input sizes', () => {
    const workArea = factoryFor('rectangle', { overrides: { width: 1000, height: 800 } })
    const window = factoryFor('windowSize', { overrides: { width: 680.9, height: 420.1 } })
    const frame = () => centerBoundsInWorkArea(workArea, window)

    it('floors the values', () => {
      expect(frame().width).toBe(680)
      expect(frame().height).toBe(420)
    })
  })
})

describe('isUsableWorkArea', () => {
  describe('with invalid dimensions', () => {
    const invalidCases = [
      { name: 'null', input: null },
      { name: 'undefined', input: undefined },
      { name: 'zero width', input: factoryFor('rectangle', { overrides: { width: 0, height: 600 } }) },
      { name: 'negative height', input: factoryFor('rectangle', { overrides: { width: 800, height: -1 } }) },
      { name: 'NaN width', input: factoryFor('rectangle', { overrides: { width: Number.NaN, height: 600 } }) }
    ]

    for (const { name, input } of invalidCases) {
      it(`rejects ${name}`, () => {
        expect(isUsableWorkArea(input)).toBe(false)
      })
    }
  })

  describe('with a normal work area', () => {
    it('accepts the value', () => {
      expect(isUsableWorkArea(factoryFor('rectangle', { overrides: { y: 25, width: 1440, height: 875 } }))).toBe(true)
    })
  })
})

describe('resolveInitialFrame', () => {
  const windowSize = factoryFor('windowSize')
  const safeFallbackFrame = factoryFor('rectangle', {
    overrides: { x: SAFE_FALLBACK_X, y: SAFE_FALLBACK_Y, width: windowSize.width, height: windowSize.height }
  })

  describe('when display has a usable work area', () => {
    const display = fakeDisplay(factoryFor('rectangle'))

    it('centers the window', () => {
      expect(resolveInitialFrame(display, windowSize)).toEqual(
        factoryFor('rectangle', { overrides: { x: 620, y: 330, width: 680, height: 420 } })
      )
    })
  })

  describe('when display is missing', () => {
    it('falls back to safe coordinates', () => {
      expect(resolveInitialFrame(null, windowSize)).toEqual(safeFallbackFrame)
    })
  })

  describe('when Electrobun reports an empty work area', () => {
    const display = fakeDisplay(factoryFor('rectangle', { overrides: { width: 0, height: 0 } }))

    it('falls back to safe coordinates', () => {
      expect(resolveInitialFrame(display, windowSize)).toEqual(safeFallbackFrame)
    })
  })
})
