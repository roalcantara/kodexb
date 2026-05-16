import type { RpcKnowledge } from '@shared/rpc'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { copyTextForEntry } from '../../../../core/index.ts'
import type { CommandPaletteAction } from '../../components/actions/command_palette.component'
import { cyclePriority, cycleStatus, openExternal, openInEditor, quitApp } from '../../rpc/client'
import { clipboardCopiedToastMessage } from '../../utils/list/clipboard_copy_toast.util'
import { recordEntryVisitFireAndForget } from '../../utils/list/record_entry_visit.util'

const APPLE_UA_PATTERN = /Mac|iPhone|iPod|iPad/i

type CommandPaletteDeps = {
  selectedId: number | null
  rows: RpcKnowledge[]
  onEditTask: (entry: RpcKnowledge) => void
  onNewTask: () => void
  onSync: () => void
  pushToast: (msg: string, type: 'success' | 'error') => void
  /** Set filter overlay visibility — for mutual exclusion when palette opens */
  setFilterOpen?: (v: boolean | ((prev: boolean) => boolean)) => void
  /** Suppress shortcut when overlay (settings/task sheet) is visible */
  shortcutsBlocked?: boolean
}

function paletteQuitShortcut(): string {
  if (typeof navigator === 'undefined') return '⌘Q'
  return APPLE_UA_PATTERN.test(navigator.userAgent) ? '⌘Q' : 'Ctrl+Q'
}

function libraryActions(onNewTask: () => void, onSync: () => void): [CommandPaletteAction, CommandPaletteAction] {
  return [
    { id: 'sync', label: 'Sync', section: 'library', handler: () => onSync() },
    { id: 'new-task', label: 'New Task', section: 'library', handler: () => onNewTask() }
  ]
}

function quitAction(pushToast: (msg: string, type: 'success' | 'error') => void): CommandPaletteAction {
  return {
    id: 'quit',
    label: 'Quit kb',
    section: 'app',
    shortcut: paletteQuitShortcut(),
    handler: () => {
      quitApp().catch(() => pushToast('Failed to quit', 'error'))
    }
  }
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: palette action list grouped by section
function buildActions(
  entry: RpcKnowledge | null,
  onEditTask: (entry: RpcKnowledge) => void,
  onNewTask: () => void,
  onSync: () => void,
  pushToast: (msg: string, type: 'success' | 'error') => void
): CommandPaletteAction[] {
  const lib = libraryActions(onNewTask, onSync)
  const quit = quitAction(pushToast)

  if (!entry) {
    return [...lib, quit]
  }

  const entryActions: CommandPaletteAction[] = []
  switch (entry.type) {
    case 'bookmark':
      entryActions.push({
        id: 'open-url',
        label: 'Open URL',
        section: 'entry',
        handler: () => {
          openExternal(entry.key).catch(() => pushToast('Failed to open URL', 'error'))
        }
      })
      break
    case 'command':
      entryActions.push({
        id: 'paste-terminal',
        label: 'Paste in Terminal',
        section: 'entry',
        handler: () => {
          navigator.clipboard.writeText(entry.key).then(
            () => {
              recordEntryVisitFireAndForget(entry.id)
              pushToast('Command copied', 'success')
            },
            () => pushToast('Command copy failed', 'error')
          )
        }
      })
      break
    case 'cheat':
      break
    case 'task':
      entryActions.push(
        { id: 'edit-task', label: 'Edit Task', section: 'entry', handler: () => onEditTask(entry) },
        {
          id: 'cycle-status',
          label: 'Cycle Status',
          section: 'entry',
          handler: () => {
            cycleStatus(entry.id, 'forward').catch(() => pushToast('Status cycle failed', 'error'))
          }
        },
        {
          id: 'cycle-priority',
          label: 'Cycle Priority',
          section: 'entry',
          handler: () => {
            cyclePriority(entry.id, 'forward').catch(() => pushToast('Priority cycle failed', 'error'))
          }
        }
      )
      break
  }

  const clipboard: CommandPaletteAction[] = [
    {
      id: 'copy',
      label: 'Copy',
      section: 'clipboard',
      handler: () => {
        const text = copyTextForEntry(entry)
        const msg = clipboardCopiedToastMessage(text)
        navigator.clipboard.writeText(text).then(
          () => {
            recordEntryVisitFireAndForget(entry.id)
            pushToast(msg, 'success')
          },
          () => pushToast('Copy failed', 'error')
        )
      }
    }
  ]

  const source: CommandPaletteAction[] = [
    {
      id: 'open-editor',
      label: 'Open in Editor',
      section: 'source',
      handler: () => {
        openInEditor(entry.source).catch(() => pushToast('Failed to open editor', 'error'))
      }
    }
  ]

  return [...entryActions, ...clipboard, ...source, ...lib, quit]
}

export function useCommandPalette({
  selectedId,
  rows,
  onEditTask,
  onNewTask,
  onSync,
  pushToast,
  setFilterOpen,
  shortcutsBlocked
}: CommandPaletteDeps) {
  const [open, setOpen] = useState(false)
  const entry = useMemo(() => rows.find(r => r.id === selectedId) ?? null, [rows, selectedId])
  const depsRef = useRef({ selectedId, rows, onEditTask, onNewTask, onSync, pushToast })
  depsRef.current = { selectedId, rows, onEditTask, onNewTask, onSync, pushToast }

  const actions = useMemo(
    () => buildActions(entry, onEditTask, onNewTask, onSync, pushToast),
    [entry, onEditTask, onNewTask, onSync, pushToast]
  )

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

      // ⌘P: toggle command palette
      if (mod && e.key === 'p') {
        e.preventDefault()
        setOpen(prev => {
          if (!prev) setFilterOpen?.(false)
          return !prev
        })
        return
      }

      // ⌘K: toggle filter overlay — mutual exclusion with palette
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

  return { open, actions, openPalette, closePalette }
}
