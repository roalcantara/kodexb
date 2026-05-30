import { fireAndForget } from '@shared/utils'
import { useEffect, useState } from 'react'
import { getConfig } from '../../rpc/client'
import type { QuickLookupFilterMode } from './use_quick_lookup_overlay.hook'

export function useQuickLookupOverlayLifecycle(open: boolean) {
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [filterMode, setFilterMode] = useState<QuickLookupFilterMode>('all')
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [filterSearch, setFilterSearch] = useState('')
  const [displayAdvisories, setDisplayAdvisories] = useState(false)
  const [forcedMode, setForcedMode] = useState<'text' | 'chord' | null>(null)

  useEffect(() => {
    if (!open) return
    fireAndForget(
      getConfig().then(cfg => {
        setDisplayAdvisories(cfg.display.advisories ?? false)
      })
    )
  }, [open])

  useEffect(() => {
    if (!open) return
    setHighlightIndex(0)
    setFilterMode('all')
    setFilterSearch('')
    setForcedMode(null)
  }, [open])

  return {
    highlightIndex,
    setHighlightIndex,
    filterMode,
    setFilterMode,
    filterModalOpen,
    setFilterModalOpen,
    filterSearch,
    setFilterSearch,
    displayAdvisories,
    forcedMode,
    setForcedMode
  }
}
