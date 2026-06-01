import { describe, expect, it } from 'bun:test'
import { findDisplayAtPoint, pointInRect } from './display_at_cursor.util'

function rect(x: number, y: number, width: number, height: number) {
  return { x, y, width, height }
}

function display(id: number, bounds: ReturnType<typeof rect>) {
  return { id, bounds, workArea: bounds, scaleFactor: 1, isPrimary: false }
}

describe('pointInRect', () => {
  const r = rect(10, 20, 100, 200)

  describe('when point is inside', () => {
    it('returns true for center', () => {
      expect(pointInRect({ x: 60, y: 120 }, r)).toBe(true)
    })

    it('returns true for top-left edge', () => {
      expect(pointInRect({ x: 10, y: 20 }, r)).toBe(true)
    })

    it('returns true for bottom-right edge exclusive', () => {
      expect(pointInRect({ x: 109, y: 219 }, r)).toBe(true)
    })
  })

  describe('when point is outside', () => {
    it('returns false for before x', () => {
      expect(pointInRect({ x: 9, y: 120 }, r)).toBe(false)
    })

    it('returns false for after x+width', () => {
      expect(pointInRect({ x: 110, y: 120 }, r)).toBe(false)
    })

    it('returns false for before y', () => {
      expect(pointInRect({ x: 60, y: 19 }, r)).toBe(false)
    })

    it('returns false for after y+height', () => {
      expect(pointInRect({ x: 60, y: 220 }, r)).toBe(false)
    })
  })
})

describe('findDisplayAtPoint', () => {
  const displays = [display(1, rect(0, 0, 1920, 1080)), display(2, rect(1920, 0, 1920, 1080))]

  describe('when cursor is on first display', () => {
    it('returns display 1', () => {
      const result = findDisplayAtPoint({ x: 500, y: 500 }, displays)
      expect(result?.id).toBe(1)
    })
  })

  describe('when cursor is on second display', () => {
    it('returns display 2', () => {
      const result = findDisplayAtPoint({ x: 2500, y: 500 }, displays)
      expect(result?.id).toBe(2)
    })
  })

  describe('when cursor is not on any display', () => {
    it('returns null', () => {
      const result = findDisplayAtPoint({ x: -100, y: -100 }, displays)
      expect(result).toBeNull()
    })
  })

  describe('when display list is empty', () => {
    it('returns null', () => {
      const result = findDisplayAtPoint({ x: 500, y: 500 }, [])
      expect(result).toBeNull()
    })
  })
})
