import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type QuickLookupDeps = {
  isBlocked: boolean
  /** Invoked after the overlay closes — used to restore focus to the list shell. */
  onAfterClose?: () => void
}

export function useQuickLookupState({ isBlocked, onAfterClose }: QuickLookupDeps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const onAfterCloseRef = useRef(onAfterClose)
  onAfterCloseRef.current = onAfterClose

  const openOverlay = useCallback(() => {
    setSearch('')
    setHighlightIndex(0)
    setOpen(true)
  }, [])

  const closeOverlay = useCallback(() => {
    setOpen(false)
    setSearch('')
    setHighlightIndex(0)
    onAfterCloseRef.current?.()
  }, [])

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isBlocked) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === '/') {
        e.preventDefault()
        e.stopPropagation()
        setOpen(prev => !prev)
        return
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        closeOverlay()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [isBlocked, open, closeOverlay])

  const resultRows = useMemo(() => {
    if (!open) return [] as Array<{ bindingId: string; entryKey: string; action: string }>
    return []
  }, [open])

  return {
    open,
    openOverlay,
    closeOverlay,
    search,
    setSearch,
    highlightIndex,
    setHighlightIndex,
    searchInputRef,
    resultRows
  }
}
