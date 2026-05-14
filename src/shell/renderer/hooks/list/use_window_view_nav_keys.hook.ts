import type { RefObject } from 'react'
import { useEffect } from 'react'

export type WindowViewNavKeysOpts = {
  disabled: boolean
  handleKey: (e: KeyboardEvent) => void
  /** Cmd/Ctrl+L (defaults to `handleKey`). */
  handleModL?: (e: KeyboardEvent) => void
  /** Plain ArrowUp/Down when focus is outside the list surface (detail panel, etc.). */
  handleListArrows?: (e: KeyboardEvent) => void
  /** Scroll container for ⌘/⌃+ArrowUp/ArrowDown (detail / split). */
  detailScrollRef?: RefObject<HTMLElement | null>
  /** When true, ⌘/⌃+vertical arrows scroll `detailScrollRef` instead of doing nothing. */
  detailScrollActive?: boolean
}

function isModL(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && e.key === 'l'
}

function isModC(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && e.key === 'c'
}

function isArrowLeftOrRight(e: KeyboardEvent): boolean {
  return e.key === 'ArrowLeft' || e.key === 'ArrowRight'
}

function stopIfDefaultPrevented(e: KeyboardEvent): void {
  if (e.defaultPrevented) e.stopPropagation()
}

function keyTargetIsTextField(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return true
  return t.isContentEditable
}

const DETAIL_SCROLL_PAGE_RATIO = 0.85
const DETAIL_SCROLL_MIN_STEP_PX = 80

function tryDetailScroll(
  e: KeyboardEvent,
  detailScrollRef: RefObject<HTMLElement | null> | undefined,
  detailScrollActive: boolean | undefined
): boolean {
  if (!detailScrollActive || !detailScrollRef?.current) return false
  if (!(e.metaKey || e.ctrlKey)) return false
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return false
  if (keyTargetIsTextField(e.target)) return false
  const el = detailScrollRef.current
  const page = Math.max(DETAIL_SCROLL_MIN_STEP_PX, Math.round(el.clientHeight * DETAIL_SCROLL_PAGE_RATIO))
  const delta = e.key === 'ArrowDown' ? page : -page
  e.preventDefault()
  el.scrollTop = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + delta))
  return true
}

function tryListArrows(e: KeyboardEvent, handleListArrows?: (e: KeyboardEvent) => void): void {
  if (!handleListArrows) return
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (keyTargetIsTextField(e.target)) return
  handleListArrows(e)
  stopIfDefaultPrevented(e)
}

function runListWindowKeydown(
  e: KeyboardEvent,
  disabled: boolean,
  handleKey: (e: KeyboardEvent) => void,
  onModL: (e: KeyboardEvent) => void,
  handleListArrows: ((e: KeyboardEvent) => void) | undefined,
  detailScrollRef: RefObject<HTMLElement | null> | undefined,
  detailScrollActive: boolean | undefined
): void {
  if (isModL(e)) {
    if (disabled) return
    onModL(e)
    stopIfDefaultPrevented(e)
    return
  }
  if (disabled) return
  if (tryDetailScroll(e, detailScrollRef, detailScrollActive)) {
    stopIfDefaultPrevented(e)
    return
  }
  if (isModC(e)) {
    handleKey(e)
    stopIfDefaultPrevented(e)
    return
  }
  if (e.key === 'Escape') {
    handleKey(e)
    stopIfDefaultPrevented(e)
    return
  }
  tryListArrows(e, handleListArrows)
  if (!isArrowLeftOrRight(e)) return
  handleKey(e)
  stopIfDefaultPrevented(e)
}

/** Capture-phase `window` listener so ⌘C, Escape, arrows, and ⌘L reach handlers when focus is outside the list shell (e.g. full detail). */
export function useWindowViewNavKeys({
  disabled,
  handleKey,
  handleModL,
  handleListArrows,
  detailScrollRef,
  detailScrollActive
}: WindowViewNavKeysOpts): void {
  const onModL = handleModL ?? handleKey
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      runListWindowKeydown(e, disabled, handleKey, onModL, handleListArrows, detailScrollRef, detailScrollActive)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [disabled, handleKey, onModL, handleListArrows, detailScrollRef, detailScrollActive])
}
