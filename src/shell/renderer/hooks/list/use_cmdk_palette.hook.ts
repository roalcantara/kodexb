import type { RpcKnowledge } from '@shared/rpc'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CmdkAction } from '../../components/actions/cmdk_palette.component'
import { cyclePriority, cycleStatus, openExternal, openInEditor, quitApp } from '../../rpc/client'

const APPLE_UA_PATTERN = /Mac|iPhone|iPod|iPad/i

type CmdkPaletteDeps = {
  selectedEntry: RpcKnowledge | null
  onEditTask: (entry: RpcKnowledge) => void
  onNewTask: () => void
  onSync: () => void
  pushToast: (msg: string, type: 'success' | 'error') => void
}

function paletteQuitShortcut(): string {
  if (typeof navigator === 'undefined') return '⌘Q'
  return APPLE_UA_PATTERN.test(navigator.userAgent) ? '⌘Q' : 'Ctrl+Q'
}

function clipboardToast(pushToast: (msg: string, type: 'success' | 'error') => void, label: string) {
  return (promise: Promise<void>) => {
    promise.then(
      () => pushToast(`${label} copied`, 'success'),
      () => pushToast(`${label} copy failed`, 'error')
    )
  }
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: palette action list is intentionally flat for readability
function buildActions(
  entry: RpcKnowledge | null,
  onEditTask: (entry: RpcKnowledge) => void,
  onNewTask: () => void,
  onSync: () => void,
  pushToast: (msg: string, type: 'success' | 'error') => void
): CmdkAction[] {
  const actions: CmdkAction[] = [
    { id: 'sync', label: 'Sync', handler: () => onSync() },
    { id: 'new-task', label: 'New Task', handler: () => onNewTask() },
    {
      id: 'quit',
      label: 'Quit kb',
      shortcut: paletteQuitShortcut(),
      handler: () => {
        quitApp().catch(() => pushToast('Failed to quit', 'error'))
      }
    }
  ]

  if (!entry) return actions

  switch (entry.type) {
    case 'bookmark':
      actions.push({
        id: 'open-url',
        label: 'Open URL',
        handler: () => {
          openExternal(entry.key).catch(() => pushToast('Failed to open URL', 'error'))
        }
      })
      break
    case 'command':
      actions.push({
        id: 'paste-terminal',
        label: 'Paste in Terminal',
        handler: () => {
          clipboardToast(pushToast, 'Command')(navigator.clipboard.writeText(entry.key))
        }
      })
      break
    case 'cheat':
      actions.push({
        id: 'copy-doc',
        label: 'Copy to Clipboard',
        handler: () => {
          clipboardToast(pushToast, 'Content')(navigator.clipboard.writeText(entry.doc ?? ''))
        }
      })
      break
    case 'task':
      actions.push({ id: 'edit-task', label: 'Edit Task', handler: () => onEditTask(entry) })
      break
  }

  actions.push(
    {
      id: 'copy-title',
      label: 'Copy Title',
      handler: () => clipboardToast(pushToast, 'Title')(navigator.clipboard.writeText(entry.key))
    },
    {
      id: 'copy-desc',
      label: 'Copy Description',
      handler: () => clipboardToast(pushToast, 'Description')(navigator.clipboard.writeText(entry.desc ?? ''))
    },
    {
      id: 'copy-tags',
      label: 'Copy Tags',
      handler: () => clipboardToast(pushToast, 'Tags')(navigator.clipboard.writeText(entry.tags.join(', ')))
    },
    {
      id: 'copy-notes',
      label: 'Copy Notes',
      handler: () => clipboardToast(pushToast, 'Notes')(navigator.clipboard.writeText(entry.doc ?? ''))
    },
    {
      id: 'open-editor',
      label: 'Open in Editor',
      handler: () => {
        openInEditor(entry.source).catch(() => pushToast('Failed to open editor', 'error'))
      }
    }
  )

  if (entry.type === 'task') {
    actions.push(
      {
        id: 'cycle-status',
        label: 'Cycle Status',
        handler: () => {
          cycleStatus(entry.id, 'forward').catch(() => pushToast('Status cycle failed', 'error'))
        }
      },
      {
        id: 'cycle-priority',
        label: 'Cycle Priority',
        handler: () => {
          cyclePriority(entry.id, 'forward').catch(() => pushToast('Priority cycle failed', 'error'))
        }
      }
    )
  }

  return actions
}

export function useCmdkPalette({ selectedEntry, onEditTask, onNewTask, onSync, pushToast }: CmdkPaletteDeps) {
  const [open, setOpen] = useState(false)
  const depsRef = useRef({ selectedEntry, onEditTask, onNewTask, onSync, pushToast })
  depsRef.current = { selectedEntry, onEditTask, onNewTask, onSync, pushToast }

  const actions = useMemo(
    () => buildActions(selectedEntry, onEditTask, onNewTask, onSync, pushToast),
    [selectedEntry, onEditTask, onNewTask, onSync, pushToast]
  )

  const openPalette = useCallback(() => setOpen(true), [])
  const closePalette = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openPalette()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openPalette])

  return { open, actions, openPalette, closePalette }
}
