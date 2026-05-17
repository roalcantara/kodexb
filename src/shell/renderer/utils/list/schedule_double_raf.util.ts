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
