import type { RefObject } from 'react'

/** If focus is inside `root` but not on `root` itself, blur it (e.g. a nested row button). */
export function blurDescendantsKeepingRoot(root: HTMLElement | null): void {
  if (root === null) return
  const ae = document.activeElement
  if (ae instanceof HTMLElement && root.contains(ae) && ae !== root) {
    ae.blur()
  }
}

export function focusListSurface(listSurfaceRef: RefObject<HTMLElement | null>): void {
  blurDescendantsKeepingRoot(listSurfaceRef.current)
  listSurfaceRef.current?.focus()
}
