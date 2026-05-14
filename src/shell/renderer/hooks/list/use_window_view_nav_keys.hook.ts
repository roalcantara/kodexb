import { useEffect } from 'react'

export type WindowViewNavKeysOpts = {
  disabled: boolean
  handleKey: (e: KeyboardEvent) => void
}

/** Capture-phase `window` listener so ArrowLeft/ArrowRight reach `handleKey` when Electrobun webview focus is outside the list shell (e.g. full detail). */
export function useWindowViewNavKeys({ disabled, handleKey }: WindowViewNavKeysOpts): void {
  useEffect(() => {
    if (disabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      handleKey(e)
      if (e.defaultPrevented) e.stopPropagation()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [disabled, handleKey])
}
