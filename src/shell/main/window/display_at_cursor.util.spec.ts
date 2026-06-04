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

  describe.each([
    ['center', { x: 60, y: 120 }],
    ['top-left edge', { x: 10, y: 20 }],
    ['bottom-right edge exclusive', { x: 109, y: 219 }]
  ])('when point is inside %s', (_desc, point) => {
    it('returns true', () => {
      expect(pointInRect(point, r)).toBe(true)
    })
  })

  describe.each([
    ['before x', { x: 9, y: 120 }],
    ['after x+width', { x: 110, y: 120 }],
    ['before y', { x: 60, y: 19 }],
    ['after y+height', { x: 60, y: 220 }]
  ])('when point is outside %s', (_desc, point) => {
    it('returns false', () => {
      expect(pointInRect(point, r)).toBe(false)
    })
  })
})

describe('findDisplayAtPoint', () => {
  const displays = [display(1, rect(0, 0, 1920, 1080)), display(2, rect(1920, 0, 1920, 1080))]

  describe.each([
    ['cursor is on first display', { point: { x: 500, y: 500 }, displayValues: displays, expected: 1 }],
    ['cursor is on second display', { point: { x: 2500, y: 500 }, displayValues: displays, expected: 2 }],
    ['cursor is not on any display', { point: { x: -100, y: -100 }, displayValues: displays, expected: null }],
    ['display list is empty', { point: { x: 500, y: 500 }, displayValues: [], expected: null }]
  ])('when %s', (_desc, { point, displayValues, expected }) => {
    it(`returns ${expected === null ? 'null' : `display ${expected}`}`, () => {
      const result = findDisplayAtPoint(point, displayValues)
      if (expected === null) {
        expect(result).toBeNull()
      } else {
        expect(result?.id).toBe(expected)
      }
    })
  })
})
