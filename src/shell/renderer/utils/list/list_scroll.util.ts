import type { RefObject } from 'react'

const SEARCH_FOCUS_MAX_ATTEMPTS = 6

/** Runs `run` after `queueMicrotask` + two `requestAnimationFrame` ticks (layout-friendly). */
export function scheduleDoubleRaf(run: () => void): void {
  queueMicrotask(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        run()
      })
    })
  })
}

/** Focuses the search input and selects all text (browser-style ⌘L). */
export function scheduleFocusSearchInputSelectAll(ref: RefObject<HTMLInputElement | null>): void {
  let attempts = 0
  const focusWhenMounted = () => {
    const el = ref.current
    if (!el) {
      attempts += 1
      if (attempts < SEARCH_FOCUS_MAX_ATTEMPTS) scheduleDoubleRaf(focusWhenMounted)
      return
    }
    el.focus({ preventScroll: true })
    el.select()
  }
  scheduleDoubleRaf(focusWhenMounted)
}

export type EnsureOptionRowVisibleOptions = {
  padTop?: number
  padBottom?: number
  maxPasses?: number
  gapTolerance?: number
  minPixelNudge?: number
}

const DEFAULT_PAD_TOP_PX = 6
const DEFAULT_PAD_BOTTOM_PX = 22
const DEFAULT_MAX_PASSES = 16
const DEFAULT_TALL_ROW_HEIGHT_EPSILON = 0.5
const DEFAULT_ADJ_ZERO_EPSILON = 0.001
const DEFAULT_FLOAT_TRIM = 1e-6
const DEFAULT_LAST_MILE_MAX = 8
const DEFAULT_GAP_TOLERANCE = 0.5
const DEFAULT_MIN_PIXEL_NUDGE = 1

/** Positive delta scrollTop reveals content lower in the column (element was clipped below). */
export function computeScrollTopAdjustmentForVisibility(
  containerTop: number,
  containerBottom: number,
  elementTop: number,
  elementBottom: number,
  padTop: number,
  padBottom: number = padTop
): number {
  if (elementBottom > containerBottom - padBottom) {
    return elementBottom - (containerBottom - padBottom)
  }
  if (elementTop < containerTop + padTop) {
    return -(containerTop + padTop - elementTop)
  }
  return 0
}

function tryAlignOversizedRow(
  el: HTMLElement,
  scrollRoot: HTMLElement,
  padTop: number,
  padBottom: number,
  tallEpsilon: number
): boolean {
  const c0 = scrollRoot.getBoundingClientRect()
  const e0 = el.getBoundingClientRect()
  const visibleH = c0.height - padTop - padBottom
  if (e0.height < visibleH - tallEpsilon) return false
  scrollRoot.scrollTop += e0.top - c0.top - padTop
  return true
}

function applyMainRevealPasses(
  el: HTMLElement,
  scrollRoot: HTMLElement,
  padTop: number,
  padBottom: number,
  maxPasses: number
): void {
  for (let k = 0; k < maxPasses; k++) {
    const cRect = scrollRoot.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    let adj = computeScrollTopAdjustmentForVisibility(
      cRect.top,
      cRect.bottom,
      eRect.top,
      eRect.bottom,
      padTop,
      padBottom
    )
    if (Math.abs(adj) < DEFAULT_ADJ_ZERO_EPSILON) return
    const trim = DEFAULT_FLOAT_TRIM
    if (adj > 0) adj = Math.ceil(adj - trim)
    else adj = Math.floor(adj + trim)
    scrollRoot.scrollTop += adj
  }
}

function nudgeResidualClip(
  el: HTMLElement,
  scrollRoot: HTMLElement,
  padTop: number,
  padBottom: number,
  gapTolerance: number,
  minNudge: number,
  lastMileMax: number
): void {
  for (let i = 0; i < lastMileMax; i++) {
    const cRect = scrollRoot.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    const bottomGap = eRect.bottom - (cRect.bottom - padBottom)
    const topGap = cRect.top + padTop - eRect.top
    if (bottomGap <= gapTolerance && topGap <= gapTolerance) return
    if (bottomGap > gapTolerance) {
      scrollRoot.scrollTop += Math.max(minNudge, Math.ceil(bottomGap - gapTolerance))
      continue
    }
    if (topGap > gapTolerance) {
      scrollRoot.scrollTop -= Math.max(minNudge, Math.ceil(topGap - gapTolerance))
      continue
    }
    return
  }
}

/** Adjusts scrollRoot.scrollTop so rowEl is fully inside the padded visible rect. */
export function ensureOptionRowVisibleInScrollRoot(
  scrollRoot: HTMLElement,
  rowEl: HTMLElement | null | undefined,
  options: EnsureOptionRowVisibleOptions = {}
): void {
  if (!rowEl || !scrollRoot.contains(rowEl)) return

  const padTop = options.padTop ?? DEFAULT_PAD_TOP_PX
  const padBottom = options.padBottom ?? DEFAULT_PAD_BOTTOM_PX
  const maxPasses = options.maxPasses ?? DEFAULT_MAX_PASSES
  const gapTolerance = options.gapTolerance ?? DEFAULT_GAP_TOLERANCE
  const minNudge = options.minPixelNudge ?? DEFAULT_MIN_PIXEL_NUDGE

  if (tryAlignOversizedRow(rowEl, scrollRoot, padTop, padBottom, DEFAULT_TALL_ROW_HEIGHT_EPSILON)) return
  applyMainRevealPasses(rowEl, scrollRoot, padTop, padBottom, maxPasses)
  nudgeResidualClip(rowEl, scrollRoot, padTop, padBottom, gapTolerance, minNudge, DEFAULT_LAST_MILE_MAX)
}
