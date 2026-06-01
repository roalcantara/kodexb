import { useLayoutEffect, useRef, useState } from 'react'

export function useListFilterOverlay() {
  const [filterOpen, setFilterOpen] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)

  const openFilter = () => {
    const el = filterButtonRef.current
    setAnchorRect(el === null ? null : el.getBoundingClientRect())
    setFilterOpen(true)
  }

  /** Keep anchor in sync when opening via ⌘K (not only via `openFilter()` click). */
  useLayoutEffect(() => {
    if (!filterOpen) return
    const el = filterButtonRef.current
    if (el) setAnchorRect(el.getBoundingClientRect())
  }, [filterOpen])

  return { filterOpen, setFilterOpen, anchorRect, filterButtonRef, openFilter }
}
