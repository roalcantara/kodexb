import { describe, expect, it } from 'bun:test'
import { factoryFor } from '@testing'

import {
  centerBoundsInWorkArea,
  ensureWindowFrame,
  isUsableWorkArea,
  MACOS_MENU_BAR_INSET,
  normalizeDisplay,
  normalizeRectangle,
  resolveDisplayAtCursor,
  resolveDisplayForPlacement,
  resolveEffectiveWorkArea,
  resolveInitialFrame,
  SAFE_FALLBACK_X,
  SAFE_FALLBACK_Y
} from './placement.util'
import { primaryDisplay } from './window.spec.fixtures'

const fakeDisplay = (workArea: ReturnType<typeof factoryFor<'rectangle'>>) => ({
  id: 1,
  bounds: workArea,
  workArea,
  scaleFactor: 1,
  isPrimary: true
})

const bogusBottomStrip = (id: number) =>
  normalizeDisplay({
    id,
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 980, width: 1920, height: 100 },
    scaleFactor: 2,
    isPrimary: true
  })

describe('normalizeDisplay()', () => {
  it('uses bounds when workArea is missing', () => {
    const normalized = normalizeDisplay({
      id: 2,
      bounds: { x: 0, y: 25, width: 1440, height: 875 },
      workArea: undefined as never,
      scaleFactor: 2,
      isPrimary: true
    })

    expect(normalized.workArea).toEqual({ x: 0, y: 25, width: 1440, height: 875 })
  })

  it('replaces a thin work-area strip pinned to the bottom edge', () => {
    const normalized = bogusBottomStrip(3)

    expect(normalized.workArea).toEqual({
      x: 0,
      y: MACOS_MENU_BAR_INSET,
      width: 1920,
      height: 1080 - MACOS_MENU_BAR_INSET
    })
  })

  it('replaces a work area that spans the full virtual desktop', () => {
    const normalized = normalizeDisplay({
      id: 2,
      bounds: { x: 0, y: 0, width: 1538, height: 1692 },
      workArea: { x: 0, y: 0, width: 3008, height: 1692 },
      scaleFactor: 2,
      isPrimary: false
    })

    expect(normalized.workArea).toEqual({
      x: 0,
      y: MACOS_MENU_BAR_INSET,
      width: 1538,
      height: 1692 - MACOS_MENU_BAR_INSET
    })
  })
})

describe('resolveEffectiveWorkArea()', () => {
  it('keeps a normal menu-bar inset work area', () => {
    const bounds = { x: 0, y: 0, width: 1440, height: 900 }
    const workArea = { x: 0, y: 25, width: 1440, height: 875 }

    expect(resolveEffectiveWorkArea(bounds, workArea)).toEqual(workArea)
  })

  it('rejects a bottom-edge strip that would center off-screen', () => {
    const bounds = { x: -1920, y: 0, width: 1920, height: 1080 }
    const workArea = { x: -1920, y: 980, width: 1920, height: 100 }

    expect(resolveEffectiveWorkArea(bounds, workArea)).toEqual({
      x: -1920,
      y: MACOS_MENU_BAR_INSET,
      width: 1920,
      height: 1080 - MACOS_MENU_BAR_INSET
    })
  })
})

describe('ensureWindowFrame()', () => {
  it('returns safe fallback when frame values are missing', () => {
    const windowSize = factoryFor('windowSize')
    expect(ensureWindowFrame(undefined, windowSize)).toEqual(
      factoryFor('rectangle', {
        overrides: { x: SAFE_FALLBACK_X, y: SAFE_FALLBACK_Y, width: windowSize.width, height: windowSize.height }
      })
    )
  })
})

describe('normalizeRectangle()', () => {
  it('returns null for non-numeric rectangles', () => {
    expect(normalizeRectangle({ x: Number.NaN, y: 0, width: 100, height: 100 })).toBeNull()
  })
})

describe('centerBoundsInWorkArea()', () => {
  const windowSize = factoryFor('windowSize')

  describe('with a zero-origin work area', () => {
    const workArea = factoryFor('rectangle')
    const frame = () => centerBoundsInWorkArea(workArea, windowSize)

    it('centers the window', () => {
      expect(frame()).toEqual(factoryFor('rectangle', { overrides: { x: 620, y: 240, width: 680, height: 600 } }))
    })
  })

  describe('with a non-zero work-area origin', () => {
    const workArea = factoryFor('rectangle', { overrides: { y: 25, width: 1440, height: 875 } })
    const frame = () => centerBoundsInWorkArea(workArea, windowSize)

    it('honors the menu-bar offset', () => {
      expect(frame()).toEqual(factoryFor('rectangle', { overrides: { x: 380, y: 163, width: 680, height: 600 } }))
    })
  })

  describe('with half-pixel offsets', () => {
    const workArea = factoryFor('rectangle', { overrides: { width: 1001, height: 601 } })
    const window = factoryFor('windowSize', { overrides: { width: 200, height: 100 } })
    const result = centerBoundsInWorkArea(workArea, window)

    it('rounds coordinates', () => {
      expect(result).toEqual(factoryFor('rectangle', { overrides: { x: 401, y: 251, width: 200, height: 100 } }))
    })

    describe.each([
      ['x', result.x],
      ['y', result.y]
    ])('when checking %s', (_, coordinate) => {
      it('is an integer', () => {
        expect(Number.isInteger(coordinate)).toBe(true)
      })
    })
  })

  describe('when window fills the work area', () => {
    const workArea = factoryFor('rectangle', { overrides: { x: 10, y: 20, width: 680, height: 600 } })
    const frame = () => centerBoundsInWorkArea(workArea, windowSize)

    it('clamps to work-area origin', () => {
      expect(frame()).toEqual(factoryFor('rectangle', { overrides: { x: 10, y: 20, width: 680, height: 600 } }))
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

    it('floors width and height', () => {
      expect(frame().width).toBe(680)
      expect(frame().height).toBe(420)
    })
  })
})

describe('isUsableWorkArea()', () => {
  describe('with invalid dimensions', () => {
    describe.each([
      ['null input', null],
      ['undefined input', undefined],
      ['zero width', factoryFor('rectangle', { overrides: { width: 0, height: 600 } })],
      ['negative height', factoryFor('rectangle', { overrides: { width: 800, height: -1 } })],
      ['NaN width', factoryFor('rectangle', { overrides: { width: Number.NaN, height: 600 } })]
    ])('when work area is %s', (_, input) => {
      it('returns false', () => {
        expect(isUsableWorkArea(input)).toBe(false)
      })
    })
  })

  describe('with a normal work area', () => {
    it('returns true', () => {
      expect(isUsableWorkArea(factoryFor('rectangle', { overrides: { y: 25, width: 1440, height: 875 } }))).toBe(true)
    })
  })
})

describe('resolveDisplayForPlacement()', () => {
  const primary = fakeDisplay(factoryFor('rectangle', { overrides: { width: 1920, height: 1080 } }))
  const secondary = fakeDisplay(factoryFor('rectangle', { overrides: { x: 1920, width: 1920, height: 1080 } }))

  it('always returns the primary display regardless of cursor position', () => {
    const screen = {
      getPrimaryDisplay: () => primary
    }

    expect(resolveDisplayForPlacement(screen).id).toBe(primary.id)
  })

  it('normalizes the primary display work area', () => {
    const screen = {
      getPrimaryDisplay: () => secondary
    }

    expect(resolveDisplayForPlacement(screen).id).toBe(secondary.id)
  })

  it('falls back to a safe display when getPrimaryDisplay throws', () => {
    const result = resolveDisplayForPlacement({
      getPrimaryDisplay: () => {
        throw new Error('no screen')
      }
    })
    expect(result.isPrimary).toBe(true)
    expect(result.workArea.width).toBe(1920)
  })
})

describe('resolveDisplayAtCursor()', () => {
  const primary = primaryDisplay
  const external = {
    id: 3,
    bounds: { x: 1710, y: 0, width: 3008, height: 1692 },
    workArea: { x: 1710, y: 0, width: 3008, height: 1692 },
    scaleFactor: 2,
    isPrimary: false
  }

  it('returns the display under the cursor', () => {
    const screen = {
      getCursorScreenPoint: () => ({ x: 3272, y: 878 }),
      getAllDisplays: () => [primary, external],
      getPrimaryDisplay: () => primary
    }

    expect(resolveDisplayAtCursor(screen).id).toBe(external.id)
  })

  it('returns the primary display when the cursor is on it', () => {
    const screen = {
      getCursorScreenPoint: () => ({ x: 800, y: 400 }),
      getAllDisplays: () => [primary, external],
      getPrimaryDisplay: () => primary
    }

    expect(resolveDisplayAtCursor(screen).id).toBe(primary.id)
  })

  it('falls back to the primary display when the cursor is off every display', () => {
    const screen = {
      getCursorScreenPoint: () => ({ x: -5000, y: -5000 }),
      getAllDisplays: () => [primary, external],
      getPrimaryDisplay: () => primary
    }

    expect(resolveDisplayAtCursor(screen).id).toBe(primary.id)
  })

  it('falls back to the primary display when getAllDisplays throws', () => {
    const screen = {
      getCursorScreenPoint: () => ({ x: 3272, y: 878 }),
      getAllDisplays: (): never => {
        throw new Error('no screens')
      },
      getPrimaryDisplay: () => primary
    }

    expect(resolveDisplayAtCursor(screen).id).toBe(primary.id)
  })
})

describe('resolveInitialFrame()', () => {
  const windowSize = factoryFor('windowSize')
  const safeFallbackFrame = factoryFor('rectangle', {
    overrides: { x: SAFE_FALLBACK_X, y: SAFE_FALLBACK_Y, width: windowSize.width, height: windowSize.height }
  })

  describe('when display has a usable work area', () => {
    const display = fakeDisplay(factoryFor('rectangle'))

    it('centers the window', () => {
      expect(resolveInitialFrame(display, windowSize)).toEqual(
        factoryFor('rectangle', { overrides: { x: 620, y: 240, width: 680, height: 600 } })
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

  describe('when work area is a bogus bottom strip', () => {
    const display = bogusBottomStrip(4)

    it('centers using corrected bounds instead of the strip', () => {
      expect(resolveInitialFrame(display, windowSize)).toEqual(
        factoryFor('rectangle', { overrides: { x: 620, y: 256, width: 680, height: 600 } })
      )
    })
  })
})
