import type { RefObject } from 'react'
import { useEffect } from 'react'

export type GlobalShortcutAction = 'open-editor' | 'copy-desc'

export type WindowViewNavKeysOpts = {
  disabled: boolean
  /**
   * When true, the capture listener does not handle Escape (lets compact filter / in-DOM
   * handlers receive it on the bubble phase).
   */
  skipEscapeCapture?: boolean
  handleKey: (e: KeyboardEvent) => void
  /** Cmd/Ctrl+L (defaults to `handleKey`). */
  handleModL?: (e: KeyboardEvent) => void
  /** Plain ArrowUp/Down when focus is outside the list surface (detail panel, etc.). */
  handleListArrows?: (e: KeyboardEvent) => void
  /** Return / mod+Return for entry primary/secondary actions. */
  handleEntryReturn?: (e: KeyboardEvent) => void
  /** Global entry-action keyboard shortcuts (Meta+Alt+c → copy-desc, Meta+o → open-editor). */
  handleGlobalShortcut?: (action: GlobalShortcutAction) => void
  /** Scroll container for ⌘/⌃+ArrowUp/ArrowDown (detail / split). */
  detailScrollRef?: RefObject<HTMLElement | null>
  /** When true, ⌘/⌃+vertical arrows scroll `detailScrollRef` instead of doing nothing. */
  detailScrollActive?: boolean
}

function isModL(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && e.key === 'l'
}

function isModC(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && e.key === 'c' && !e.altKey && !e.shiftKey
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

const MOD_OR_CTRL = (e: KeyboardEvent) => e.metaKey || e.ctrlKey

function globalShortcutAction(e: KeyboardEvent): GlobalShortcutAction | null {
  if (!MOD_OR_CTRL(e)) return null
  if (e.key === 'o' && !e.altKey && !e.shiftKey) return 'open-editor'
  if (e.key === 'c' && e.altKey && !e.shiftKey) return 'copy-desc'
  return null
}

function tryGlobalShortcutKeydown(
  e: KeyboardEvent,
  handleGlobalShortcut: ((action: GlobalShortcutAction) => void) | undefined
): boolean {
  if (!handleGlobalShortcut) return false
  const globalAction = globalShortcutAction(e)
  if (!globalAction) return false
  if (keyTargetIsTextField(e.target)) return false
  handleGlobalShortcut(globalAction)
  e.preventDefault()
  return true
}

function runListWindowKeydown(
  e: KeyboardEvent,
  disabled: boolean,
  skipEscapeCapture: boolean | undefined,
  handleKey: (e: KeyboardEvent) => void,
  onModL: (e: KeyboardEvent) => void,
  handleListArrows: ((e: KeyboardEvent) => void) | undefined,
  handleEntryReturn: ((e: KeyboardEvent) => void) | undefined,
  handleGlobalShortcut: ((action: GlobalShortcutAction) => void) | undefined,
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
  if (tryGlobalShortcutKeydown(e, handleGlobalShortcut)) return
  if (e.key === 'Enter' && handleEntryReturn) {
    if (!keyTargetIsTextField(e.target)) {
      handleEntryReturn(e)
      stopIfDefaultPrevented(e)
    }
    return
  }
  if (e.key === 'Escape') {
    if (skipEscapeCapture) return
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
  skipEscapeCapture,
  handleKey,
  handleModL,
  handleListArrows,
  handleEntryReturn,
  handleGlobalShortcut,
  detailScrollRef,
  detailScrollActive
}: WindowViewNavKeysOpts): void {
  const onModL = handleModL ?? handleKey
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      runListWindowKeydown(
        e,
        disabled,
        skipEscapeCapture,
        handleKey,
        onModL,
        handleListArrows,
        handleEntryReturn,
        handleGlobalShortcut,
        detailScrollRef,
        detailScrollActive
      )
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [
    disabled,
    skipEscapeCapture,
    handleKey,
    onModL,
    handleListArrows,
    handleEntryReturn,
    handleGlobalShortcut,
    detailScrollRef,
    detailScrollActive
  ])
}
