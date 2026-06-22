import { useCallback, useState } from 'react'

export type OverlayName = 'commandPalette' | 'filter' | 'taskSheet' | 'syncModal' | 'quickLookup'

export type OverlayCoordinator = {
  overlays: Record<OverlayName, boolean>
  activeOverlay: OverlayName | null
  open: (name: OverlayName) => void
  close: (name: OverlayName) => void
  toggle: (name: OverlayName) => void
  closeAll: () => void
  closeActive: () => void
}

export function useOverlayCoordinator(): OverlayCoordinator {
  const [overlays, setOverlays] = useState<Record<OverlayName, boolean>>({
    commandPalette: false,
    filter: false,
    taskSheet: false,
    syncModal: false,
    quickLookup: false
  })

  const open = useCallback((name: OverlayName) => {
    setOverlays(prev => ({ ...prev, [name]: true }))
  }, [])

  const close = useCallback((name: OverlayName) => {
    setOverlays(prev => ({ ...prev, [name]: false }))
  }, [])

  const toggle = useCallback((name: OverlayName) => {
    setOverlays(prev => ({ ...prev, [name]: !prev[name] }))
  }, [])

  const closeAll = useCallback(() => {
    setOverlays({
      commandPalette: false,
      filter: false,
      taskSheet: false,
      syncModal: false,
      quickLookup: false
    })
  }, [])

  const closeActive = useCallback(() => {
    setOverlays(prev => {
      for (const name of ['quickLookup', 'syncModal', 'taskSheet', 'filter', 'commandPalette'] as OverlayName[]) {
        if (prev[name]) return { ...prev, [name]: false }
      }
      return prev
    })
  }, [])

  const activeOverlay: OverlayName | null = (() => {
    for (const name of ['quickLookup', 'syncModal', 'taskSheet', 'filter', 'commandPalette'] as OverlayName[]) {
      if (overlays[name]) return name
    }
    return null
  })()

  return { overlays, activeOverlay, open, close, toggle, closeAll, closeActive }
}
