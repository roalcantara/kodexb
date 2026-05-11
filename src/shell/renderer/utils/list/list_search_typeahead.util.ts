import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'

export type ListSearchTypeaheadAction = { type: 'none' } | { type: 'append'; char: string } | { type: 'backspace' }

/** Keys typed on the focused list surface that should move into the search field. */
export function listSearchTypeaheadAction(e: ReactKeyboardEvent<HTMLElement>): ListSearchTypeaheadAction {
  const isComposing = (e.nativeEvent as globalThis.KeyboardEvent).isComposing
  if (isComposing) return { type: 'none' }
  if (e.ctrlKey || e.metaKey || e.altKey) return { type: 'none' }
  if (e.key === 'Backspace') return { type: 'backspace' }
  if (e.key.length !== 1) return { type: 'none' }
  return { type: 'append', char: e.key }
}

export function focusSearchInputCaretAt(ref: RefObject<HTMLInputElement | null>, length: number): void {
  queueMicrotask(() => {
    const el = ref.current
    if (el === null) return
    el.focus()
    el.setSelectionRange(length, length)
  })
}
