import { useRef, useState } from 'react'

export function useListFilterOverlay() {
  const [filterOpen, setFilterOpen] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)

  const openFilter = () => {
    const el = filterButtonRef.current
    setAnchorRect(el === null ? null : el.getBoundingClientRect())
    setFilterOpen(true)
  }

  return { filterOpen, setFilterOpen, anchorRect, filterButtonRef, openFilter }
}
