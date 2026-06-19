/**
 * Utility functions for window placement.
 * Used to calculate the initial frame for the main window when no display work area is available.
 */
/** biome-ignore-all lint/style/noMagicNumbers: magic numbers are allowed for window placement */
import type { Display, Rectangle } from 'electrobun/bun'
import { findDisplayAtPoint } from './display_at_cursor.util'

export type Size = { width: number; height: number }
export type WindowFrame = Rectangle

/** Coordinates used when no display work area is available. Never `(0, 0)` per spec R2 fallback. */
export const SAFE_FALLBACK_X = 100
export const SAFE_FALLBACK_Y = 100

/** Menu bar inset when falling back from a bogus work-area report to full display bounds. */
export const MACOS_MENU_BAR_INSET = 32

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
 * Normalize a rectangle from the Screen API (missing or partial fields on some monitors).
 */
export function normalizeRectangle(rect: Rectangle | null | undefined): Rectangle | null {
  if (!rect || typeof rect !== 'object') return null
  const x = Number(rect.x)
  const y = Number(rect.y)
  const width = Number(rect.width)
  const height = Number(rect.height)
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null
  }
  return { x, y, width, height }
}

/**
 * When Electrobun reports a thin band along the bottom edge, centering pins the window
 * off-screen below the visible area. Fall back to bounds minus a menu-bar inset instead.
 */
export function resolveEffectiveWorkArea(bounds: Rectangle, workArea: Rectangle): Rectangle {
  if (workArea.width > bounds.width + 1 || workArea.height > bounds.height + 1) {
    return insetBoundsForMenuBar(bounds)
  }

  const heightRatio = workArea.height / bounds.height
  const widthRatio = workArea.width / bounds.width
  const boundsBottom = bounds.y + bounds.height
  const workBottom = workArea.y + workArea.height
  const thinStrip = workArea.height <= Math.max(160, bounds.height * 0.2)
  const anchoredToBottom =
    workArea.height < bounds.height &&
    Math.abs(workBottom - boundsBottom) <= 2 &&
    workArea.y >= bounds.y + bounds.height * 0.5
  const tooSmall = heightRatio < 0.5 && widthRatio < 0.95

  if (anchoredToBottom && (tooSmall || thinStrip)) {
    return insetBoundsForMenuBar(bounds)
  }

  if (workArea.y >= boundsBottom - Math.max(160, bounds.height * 0.15) && thinStrip) {
    return insetBoundsForMenuBar(bounds)
  }

  return workArea
}

function insetBoundsForMenuBar(bounds: Rectangle, menuBarPx = MACOS_MENU_BAR_INSET): Rectangle {
  return {
    x: bounds.x,
    y: bounds.y + menuBarPx,
    width: bounds.width,
    height: Math.max(1, bounds.height - menuBarPx)
  }
}

/**
 * Ensure every display has usable `bounds` and `workArea` (falls back bounds → workArea).
 */
export function normalizeDisplay(display: Display): Display {
  const bounds = normalizeRectangle(display.bounds)
  const workAreaCandidate = normalizeRectangle(display.workArea)
  const workArea = isUsableWorkArea(workAreaCandidate)
    ? bounds
      ? resolveEffectiveWorkArea(bounds, workAreaCandidate)
      : workAreaCandidate
    : isUsableWorkArea(bounds)
      ? bounds
      : { x: 0, y: 0, width: 1920, height: 1080 }
  return {
    ...display,
    bounds: bounds ?? workArea,
    workArea
  }
}

/**
 * Coerce a computed frame to finite integers; fall back to safe placement when native data is missing.
 */
export function ensureWindowFrame(frame: WindowFrame | null | undefined, size: Size): WindowFrame {
  if (
    frame &&
    isFiniteNumber(frame.x) &&
    isFiniteNumber(frame.y) &&
    isFiniteNumber(frame.width) &&
    isFiniteNumber(frame.height) &&
    frame.width > 0 &&
    frame.height > 0
  ) {
    return {
      x: Math.round(frame.x),
      y: Math.round(frame.y),
      width: Math.max(1, Math.floor(frame.width)),
      height: Math.max(1, Math.floor(frame.height))
    }
  }
  return resolveInitialFrame(null, size)
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
 * Resolve the **primary** display for launcher placement (Electrobun Utils pattern).
 */
export function resolveDisplayForPlacement(screen: { getPrimaryDisplay: () => Display }): Display {
  try {
    return normalizeDisplay(screen.getPrimaryDisplay())
  } catch {
    return normalizeDisplay({
      id: 0,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      scaleFactor: 1,
      isPrimary: true
    })
  }
}

/**
 * Resolve the display that currently contains the cursor, falling back to the
 * primary display when the cursor is off every display or the Screen API throws.
 *
 * The Electrobun Screen API reports cursor and display bounds in the same
 * top-left-origin global space, so {@link findDisplayAtPoint} can match directly.
 */
export function resolveDisplayAtCursor(screen: {
  getCursorScreenPoint: () => { x: number; y: number }
  getAllDisplays: () => Display[]
  getPrimaryDisplay: () => Display
}): Display {
  try {
    const displays = screen.getAllDisplays().map(normalizeDisplay)
    const atCursor = findDisplayAtPoint(screen.getCursorScreenPoint(), displays)
    if (atCursor) return atCursor
  } catch {
    // fall through to primary
  }
  return resolveDisplayForPlacement(screen)
}

/**
 * Initial window frame:
 * - centered on `display.workArea` when usable;
 * - safe fallback `(100, 100)` otherwise (per spec R2) — never `(0, 0)` unless the
 *   primary display work area genuinely starts at zero.
 */
export function resolveInitialFrame(display: Display | null, size: Size): WindowFrame {
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
