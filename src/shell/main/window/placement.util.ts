/**
 * Utility functions for window placement.
 * Used to calculate the initial frame for the main window when no display work area is available.
 */
import type { Display, Rectangle } from 'electrobun/bun'

export type Size = { width: number; height: number }
export type WindowFrame = Rectangle

/** Coordinates used when no display work area is available. Never `(0, 0)` per spec R2 fallback. */
export const SAFE_FALLBACK_X = 100
export const SAFE_FALLBACK_Y = 100

/**
 * Check if a number is finite.
 * @param n - The number to check.
 * @returns `true` if the number is finite, `false` otherwise.
 */
function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

/**
 * Clamp a value between a minimum and maximum value using the `Math.min` and `Math.max` functions.
 * To ensure the value is within the specified range and prevent values from going outside the allowed range.
 * @param value - The value to clamp.
 * @param lo - The minimum value.
 * @param hi - The maximum value.
 * @returns The clamped value.
 */
function clamp(value: number, lo: number, hi: number): number {
  if (hi < lo) return lo
  return Math.min(hi, Math.max(lo, value))
}

/**
 * Check if a work area is usable by verifying that all fields are finite and dimensions are strictly positive.
 * @param area - The work area to check.
 * @returns `true` if the work area is usable, `false` otherwise.
 */
export function isUsableWorkArea(area: Rectangle | null | undefined): area is Rectangle {
  if (!area) return false
  return (
    isFiniteNumber(area.x) &&
    isFiniteNumber(area.y) &&
    isFiniteNumber(area.width) &&
    isFiniteNumber(area.height) &&
    area.width > 0 &&
    area.height > 0
  )
}

/**
 * Center `size` inside `workArea` with integer coordinates, clamped so the window stays
 * fully on-screen when possible. If the window is wider/taller than the work area, the
 * window pins to the work-area origin on that axis (best-effort, never negative offsets).
 */
export function centerBoundsInWorkArea(workArea: Rectangle, size: Size): WindowFrame {
  const width = Math.max(1, Math.floor(size.width))
  const height = Math.max(1, Math.floor(size.height))

  const rawX = workArea.x + (workArea.width - width) / 2
  const rawY = workArea.y + (workArea.height - height) / 2

  const maxX = workArea.x + Math.max(0, workArea.width - width)
  const maxY = workArea.y + Math.max(0, workArea.height - height)

  const x = clamp(Math.round(rawX), workArea.x, maxX)
  const y = clamp(Math.round(rawY), workArea.y, maxY)

  return { x, y, width, height }
}

/**
 * Resolve the display for initial window placement:
 * - Use the display under the cursor when found,
 * - Fall back to the primary display otherwise.
 */
export function resolveDisplayForPlacement(
  screen: {
    getCursorScreenPoint: () => { x: number; y: number }
    getAllDisplays: () => Display[]
    getPrimaryDisplay: () => Display
  },
  findDisplay: (cursor: { x: number; y: number }, displays: readonly Display[]) => Display | null
): Display {
  try {
    const cursor = screen.getCursorScreenPoint()
    const displays = screen.getAllDisplays()
    const atCursor = findDisplay(cursor, displays)
    return atCursor ?? screen.getPrimaryDisplay()
  } catch {
    return screen.getPrimaryDisplay()
  }
}

/**
 * Initial window frame:
 * - centered on `display.workArea` when usable;
 * - safe fallback `(100, 100)` otherwise (per spec R2) — never `(0, 0)` unless the
 *   primary display work area genuinely starts at zero.
 */
export function resolveInitialFrame(display: Display | null, size: Size): WindowFrame {
  // If the display is usable, center the window inside the work area.
  if (display && isUsableWorkArea(display.workArea)) {
    return centerBoundsInWorkArea(display.workArea, size)
  }
  return {
    x: SAFE_FALLBACK_X,
    y: SAFE_FALLBACK_Y,
    width: Math.max(1, Math.floor(size.width)),
    height: Math.max(1, Math.floor(size.height))
  }
}
