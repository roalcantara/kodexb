import type { RefObject } from 'react'

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
  scheduleDoubleRaf(() => {
    const el = ref.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.select()
  })
}
