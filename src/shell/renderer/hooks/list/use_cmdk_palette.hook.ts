import type { RpcKnowledge } from '@shared/rpc'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CmdkAction } from '../../components/actions/cmdk_palette.component'
import { cyclePriority, cycleStatus, openExternal, openInEditor } from '../../rpc/client'

type CmdkPaletteDeps = {
  selectedEntry: RpcKnowledge | null
  onEditTask: (entry: RpcKnowledge) => void
}

function buildActions(entry: RpcKnowledge | null, onEditTask: (entry: RpcKnowledge) => void): CmdkAction[] {
  if (!entry) return []

  const actions: CmdkAction[] = []

  switch (entry.type) {
    case 'bookmark':
      actions.push({ id: 'open-url', label: 'Open URL', handler: () => openExternal(entry.key) })
      break
    case 'command':
      actions.push({
        id: 'paste-terminal',
        label: 'Paste in Terminal',
        handler: () => {
          navigator.clipboard.writeText(entry.key).catch(() => undefined)
        }
      })
      break
    case 'cheat':
      actions.push({
        id: 'copy-doc',
        label: 'Copy to Clipboard',
        handler: () => navigator.clipboard.writeText(entry.doc ?? '').catch(() => undefined)
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
      handler: () => navigator.clipboard.writeText(entry.key).catch(() => undefined)
    },
    {
      id: 'copy-desc',
      label: 'Copy Description',
      handler: () => navigator.clipboard.writeText(entry.desc ?? '').catch(() => undefined)
    },
    {
      id: 'copy-tags',
      label: 'Copy Tags',
      handler: () => navigator.clipboard.writeText(entry.tags.join(', ')).catch(() => undefined)
    },
    {
      id: 'copy-notes',
      label: 'Copy Notes',
      handler: () => navigator.clipboard.writeText(entry.doc ?? '').catch(() => undefined)
    },
    { id: 'open-editor', label: 'Open in Editor', handler: () => openInEditor(entry.source) }
  )

  if (entry.type === 'task') {
    actions.push(
      {
        id: 'cycle-status',
        label: 'Cycle Status',
        handler: () => cycleStatus(entry.id, 'forward').catch(() => undefined)
      },
      {
        id: 'cycle-priority',
        label: 'Cycle Priority',
        handler: () => cyclePriority(entry.id, 'forward').catch(() => undefined)
      }
    )
  }

  return actions
}

export function useCmdkPalette({ selectedEntry, onEditTask }: CmdkPaletteDeps) {
  const [open, setOpen] = useState(false)
  const depsRef = useRef({ selectedEntry, onEditTask })
  depsRef.current = { selectedEntry, onEditTask }

  const actions = useMemo(() => buildActions(selectedEntry, onEditTask), [selectedEntry, onEditTask])

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
