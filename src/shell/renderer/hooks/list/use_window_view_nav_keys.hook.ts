import { useEffect } from 'react'

export type WindowViewNavKeysOpts = {
  disabled: boolean
  handleKey: (e: KeyboardEvent) => void
  /** Cmd/Ctrl+L (defaults to `handleKey`). */
  handleModL?: (e: KeyboardEvent) => void
}

function isModL(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && e.key === 'l'
}

function isArrowLeftOrRight(e: KeyboardEvent): boolean {
  return e.key === 'ArrowLeft' || e.key === 'ArrowRight'
}

function stopIfDefaultPrevented(e: KeyboardEvent): void {
  if (e.defaultPrevented) e.stopPropagation()
}

function runListWindowKeydown(
  e: KeyboardEvent,
  disabled: boolean,
  handleKey: (e: KeyboardEvent) => void,
  onModL: (e: KeyboardEvent) => void
): void {
  if (isModL(e)) {
    if (disabled) return
    onModL(e)
    stopIfDefaultPrevented(e)
    return
  }
  if (disabled) return
  if (!isArrowLeftOrRight(e)) return
  handleKey(e)
  stopIfDefaultPrevented(e)
}

/** Capture-phase `window` listener so ArrowLeft/ArrowRight and ⌘L reach handlers when focus is outside the list shell (e.g. full detail). */
export function useWindowViewNavKeys({ disabled, handleKey, handleModL }: WindowViewNavKeysOpts): void {
  const onModL = handleModL ?? handleKey
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      runListWindowKeydown(e, disabled, handleKey, onModL)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [disabled, handleKey, onModL])
}
