import { type RefObject, useEffect } from 'react'

function entryIdFromPoint(clientX: number, clientY: number): number | null {
  const hit = document.elementFromPoint(clientX, clientY)
  const row = hit?.closest('[data-entry-id]')
  if (!row) return null
  const id = Number((row as HTMLElement).dataset.entryId)
  return Number.isFinite(id) ? id : null
}

/**
 * Keeps keyboard selection aligned with the row under the pointer when the user
 * scrolls with wheel/trackpad (browsers often skip mouseenter on scroll-only moves).
 */
export function useListPointerSelection(args: {
  scrollRootRef: RefObject<HTMLElement | null>
  active: boolean
  onHoverEntry: (id: number) => void
}): void {
  const { scrollRootRef, active, onHoverEntry } = args

  useEffect(() => {
    if (!active) return
    const root = scrollRootRef.current
    if (root === null) return

    let clientX = 0
    let clientY = 0
    let tracking = false

    const syncSelectionAtPointer = () => {
      if (!tracking) return
      const id = entryIdFromPoint(clientX, clientY)
      if (id !== null) onHoverEntry(id)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.buttons !== 0) return
      if (!(e.target instanceof Node) || !root.contains(e.target)) return
      clientX = e.clientX
      clientY = e.clientY
      tracking = true
      syncSelectionAtPointer()
    }

    const onPointerLeave = (e: PointerEvent) => {
      const next = e.relatedTarget
      if (next instanceof Node && root.contains(next)) return
      tracking = false
    }

    root.addEventListener('pointermove', onPointerMove)
    root.addEventListener('pointerleave', onPointerLeave)
    root.addEventListener('scroll', syncSelectionAtPointer, { passive: true })
    return () => {
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerleave', onPointerLeave)
      root.removeEventListener('scroll', syncSelectionAtPointer)
    }
  }, [active, onHoverEntry, scrollRootRef])
}
