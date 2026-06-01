import type { Display, Rectangle } from 'electrobun/bun'

export type Point = { x: number; y: number }

export function pointInRect(point: Point, rect: Rectangle): boolean {
  return point.x >= rect.x && point.x < rect.x + rect.width && point.y >= rect.y && point.y < rect.y + rect.height
}

export function findDisplayAtPoint(cursor: Point, displays: readonly Display[]): Display | null {
  if (displays.length === 0) return null
  const found = displays.find(d => pointInRect(cursor, d.bounds))
  return found ?? null
}
