import type { RpcKnowledge } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { useEffect, useRef } from 'react'
import { cyclePriority, cycleStatus, reorderTask } from '../../rpc/client'

export type TaskKeyboardDeps = {
  selectedId: number | null
  rows: RpcKnowledge[]
  onRefresh: () => void
  onNewTask: () => void
  onRequestDelete?: (entry: RpcKnowledge) => void
}

type DepsSnapshot = {
  selectedId: number | null
  rows: RpcKnowledge[]
  onRefresh: () => void
  onNewTask: () => void
  onRequestDelete?: (entry: RpcKnowledge) => void
}

function handleCreateKey(e: globalThis.KeyboardEvent, deps: DepsSnapshot): boolean {
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault()
    deps.onNewTask()
    return true
  }
  return false
}

function handleCycleKey(e: globalThis.KeyboardEvent, entry: RpcKnowledge, onRefresh: () => void): boolean {
  if (e.key === 's' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault()
    fireAndForget(cycleStatus(entry.id, 'forward').then(() => onRefresh()))
    return true
  }
  if (e.key === 'p' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault()
    fireAndForget(cyclePriority(entry.id, 'forward').then(() => onRefresh()))
    return true
  }
  return false
}

function handleReorderKey(e: globalThis.KeyboardEvent, entry: RpcKnowledge, onRefresh: () => void): boolean {
  if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
    e.preventDefault()
    fireAndForget(reorderTask(entry.id, 'up').then(() => onRefresh()))
    return true
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
    e.preventDefault()
    fireAndForget(reorderTask(entry.id, 'down').then(() => onRefresh()))
    return true
  }
  return false
}

function handleDeleteKey(
  e: globalThis.KeyboardEvent,
  entry: RpcKnowledge,
  onRequestDelete?: (entry: RpcKnowledge) => void
): boolean {
  if (e.key !== 'Delete' && e.key !== 'Backspace') return false
  if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') return false
  e.preventDefault()
  if (onRequestDelete) {
    onRequestDelete(entry)
  }
  return true
}

function findTaskEntry(rows: RpcKnowledge[], selectedId: number): RpcKnowledge | null {
  const entry = rows.find(r => r.id === selectedId)
  if (entry?.type !== 'task') return null
  return entry
}

export function useTaskKeyboard(deps: TaskKeyboardDeps) {
  const depsRef = useRef(deps)
  depsRef.current = deps

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const snapshot = depsRef.current

      if (handleCreateKey(e, snapshot)) return

      if (snapshot.selectedId == null) return
      const entry = findTaskEntry(snapshot.rows, snapshot.selectedId)
      if (!entry) return

      if (handleReorderKey(e, entry, snapshot.onRefresh)) return
      if (handleCycleKey(e, entry, snapshot.onRefresh)) return
      handleDeleteKey(e, entry, snapshot.onRequestDelete)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
