import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'

function tabIndexAttr(el: HTMLElement): number | null {
  if (!el.hasAttribute('tabindex')) return null
  const v = Number.parseInt(el.getAttribute('tabindex') ?? '', 10)
  return Number.isFinite(v) ? v : null
}

/** Rough HTML tab-focusability (toolbar/list still use explicit refs in the ring). */
function isTabFocusableCandidate(el: HTMLElement): boolean {
  if (el.hidden) return false
  const ti = tabIndexAttr(el)
  if (ti !== null && ti < 0) return false
  if (el.hasAttribute('inert')) return false

  const tag = el.tagName
  if (tag === 'BUTTON' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return !(el as HTMLButtonElement | HTMLTextAreaElement | HTMLSelectElement).disabled
  }
  if (tag === 'INPUT') {
    const inp = el as HTMLInputElement
    if (inp.disabled) return false
    if (inp.type === 'hidden') return false
    return true
  }
  if (tag === 'A') {
    return (el as HTMLAnchorElement).hasAttribute('href')
  }
  if (ti !== null && ti >= 0) return true
  return false
}

/** Document-order focusables under `root`. */
export function collectTabOrderedFocusables(root: Element): HTMLElement[] {
  const out: HTMLElement[] = []
  if (root instanceof HTMLElement && isTabFocusableCandidate(root)) out.push(root)
  for (const node of Array.from(root.querySelectorAll('*'))) {
    if (node instanceof HTMLElement && isTabFocusableCandidate(node)) out.push(node)
  }
  return out
}

export type ListPageFocusRingRefs = {
  filterButtonRef: RefObject<HTMLButtonElement | null>
  searchInputRef: RefObject<HTMLInputElement | null>
  syncButtonRef: RefObject<HTMLButtonElement | null>
  settingsButtonRef: RefObject<HTMLButtonElement | null>
  listSurfaceRef: RefObject<HTMLDivElement | null>
}

export type ListPageFocusRingContext = {
  listPageRoot: HTMLElement | null
  filterOpen: boolean
  detailOpen: boolean
}

export function listPageFocusRingElements(refs: ListPageFocusRingRefs, ctx: ListPageFocusRingContext): HTMLElement[] {
  const chain: HTMLElement[] = []
  for (const ref of [
    refs.filterButtonRef,
    refs.searchInputRef,
    refs.syncButtonRef,
    refs.settingsButtonRef,
    refs.listSurfaceRef
  ]) {
    const el = ref.current
    if (el !== null) chain.push(el)
  }

  const { listPageRoot, filterOpen, detailOpen } = ctx
  if (listPageRoot === null) return chain

  if (detailOpen) {
    const detail = listPageRoot.querySelector<HTMLElement>('aside.cmp-detail-panel--visible')
    if (detail !== null) chain.push(...collectTabOrderedFocusables(detail))
  }

  if (filterOpen) {
    const filterStack = listPageRoot.querySelector<HTMLElement>('.cmp-filter-stack')
    if (filterStack !== null) chain.push(...collectTabOrderedFocusables(filterStack))
  }

  return chain
}

/** Returns true when default Tab should be overridden and focus moved. */
export function tryApplyListPageTabRing(e: ReactKeyboardEvent<HTMLDivElement>, chain: HTMLElement[]): boolean {
  if (e.key !== 'Tab') return false
  const active = document.activeElement
  if (active === null || !(active instanceof HTMLElement)) return false
  const i = chain.indexOf(active)
  if (i < 0) return false
  e.preventDefault()
  e.stopPropagation()
  const len = chain.length
  const next = e.shiftKey ? (i - 1 + len) % len : (i + 1) % len
  chain[next]?.focus()
  return true
}

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
