import type { RpcKnowledge } from '@shared/rpc'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildEntryActionPanel } from '../../actions/build_entry_action_panel.util'
import type { EntryActionContext } from '../../actions/entry_action_panel.types'
import type { EntryActionPanelDeps } from '../../actions/entry_action_panel_deps.util'
import { mapEntryActionsToPalette } from '../../actions/map_entry_actions_to_palette.util'
import type { CommandPaletteAction } from '../../components/actions/command_palette.component'

type CommandPaletteDeps = {
  selectedId: number | null
  rows: RpcKnowledge[]
  onEditTask: (entry: RpcKnowledge) => void
  onNewTask: () => void
  onSync: () => void
  onOpenSettings: () => void
  pushToast: (msg: string, type: 'success' | 'error') => void
  /** Shared ctx (entry filled per build); when omitted, built internally. */
  actionCtx?: EntryActionContext
  /** Set filter overlay visibility — for mutual exclusion when palette opens */
  setFilterOpen?: (v: boolean | ((prev: boolean) => boolean)) => void
  /** Suppress shortcut when overlay (settings/task sheet) is visible */
  shortcutsBlocked?: boolean
  entryPanelDeps: EntryActionPanelDeps
}

export function useCommandPalette({
  selectedId,
  rows,
  onEditTask,
  onNewTask,
  onSync,
  onOpenSettings,
  pushToast,
  actionCtx: sharedActionCtx,
  setFilterOpen,
  shortcutsBlocked,
  entryPanelDeps
}: CommandPaletteDeps) {
  const [open, setOpen] = useState(false)
  const entry = useMemo(() => rows.find(r => r.id === selectedId) ?? null, [rows, selectedId])
  const depsRef = useRef({ selectedId, rows, onEditTask, onNewTask, onSync, onOpenSettings, pushToast })
  depsRef.current = { selectedId, rows, onEditTask, onNewTask, onSync, onOpenSettings, pushToast }

  const actionCtx = useMemo<EntryActionContext>(
    () =>
      sharedActionCtx
        ? { ...sharedActionCtx, entry }
        : {
            entry,
            pushToast,
            onEditTask,
            onNewTask,
            onSync,
            onOpenSettings
          },
    [sharedActionCtx, entry, pushToast, onEditTask, onNewTask, onSync, onOpenSettings]
  )

  const actions = useMemo((): CommandPaletteAction[] => {
    if (!open) return []
    const panel = buildEntryActionPanel(actionCtx, entryPanelDeps)
    return mapEntryActionsToPalette(panel, entry, actionCtx, () => setOpen(false))
  }, [open, actionCtx, entry, entryPanelDeps])

  const openPalette = useCallback(() => {
    setFilterOpen?.(false)
    setOpen(true)
  }, [setFilterOpen])
  const closePalette = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (shortcutsBlocked) return

      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key === 'p') {
        e.preventDefault()
        setOpen(prev => {
          if (!prev) setFilterOpen?.(false)
          return !prev
        })
        return
      }

      if (mod && e.key === 'k') {
        e.preventDefault()
        setFilterOpen?.(prev => {
          if (!prev) setOpen(false)
          return !prev
        })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcutsBlocked, setFilterOpen])

  return { open, actions, openPalette, closePalette, actionCtx }
}
