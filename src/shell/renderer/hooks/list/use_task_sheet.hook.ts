import type { RpcKnowledge } from '@shared/rpc'
import { useCallback, useState } from 'react'
import { createTask, cyclePriority, cycleStatus, updateTask } from '../../rpc/client'

const STATUS_CYCLE = ['todo', 'doing', 'done'] as const
const PRIORITY_CYCLE = ['low', 'mid', 'high', 'urgent'] as const

function nextInCycle<T>(cycle: readonly T[], current: T): T | undefined {
  const idx = cycle.indexOf(current)
  return cycle[(idx + 1) % cycle.length]
}

function withCycledField<K extends 'status' | 'priority'>(
  prev: TaskSheetFormState,
  field: K,
  next: TaskSheetFormState[K] | undefined
): TaskSheetFormState {
  if (!next) return { ...prev, saving: false }
  return { ...prev, [field]: next, saving: false }
}

export type TaskSheetFormState = {
  key: string
  desc: string
  status: 'todo' | 'doing' | 'done'
  priority: 'low' | 'mid' | 'high' | 'urgent'
  dueDateStr: string
  tags: string
  dependsOn: string
  saving: boolean
  error: string | null
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: pre-existing pattern outside Phase 9 scope
export function useTaskSheet(entry: RpcKnowledge | null | undefined, onClose: () => void) {
  const [form, setForm] = useState<TaskSheetFormState>(() => {
    const dueMs = entry?.type === 'task' ? entry.dueDate : undefined
    const dueDateStr = dueMs == null ? '' : toDateInputValue(dueMs)
    return {
      key: entry?.key ?? '',
      desc: entry?.desc ?? '',
      status: entry?.type === 'task' ? entry.status : 'todo',
      priority: entry?.type === 'task' ? (entry.priority ?? 'mid') : 'mid',
      dueDateStr,
      tags: entry?.tags?.join(', ') ?? '',
      dependsOn: entry?.type === 'task' && entry.dependsOn ? entry.dependsOn.join(', ') : '',
      saving: false,
      error: null
    }
  })

  const dirty =
    form.key !== (entry?.key ?? '') ||
    form.desc !== (entry?.desc ?? '') ||
    form.status !== (entry?.type === 'task' ? entry.status : 'todo') ||
    form.priority !== (entry?.type === 'task' ? (entry.priority ?? 'mid') : 'mid') ||
    form.dueDateStr !== toDateInputValue(entry?.type === 'task' ? entry.dueDate : undefined) ||
    form.tags !== (entry?.tags?.join(', ') ?? '') ||
    form.dependsOn !== (entry?.type === 'task' && entry.dependsOn ? entry.dependsOn.join(', ') : '')

  const set = useCallback(<K extends keyof TaskSheetFormState>(key: K, value: TaskSheetFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value, error: null }))
  }, [])

  const handleCycleStatus = useCallback(async () => {
    if (!entry) return
    set('saving', true)
    try {
      const result = await cycleStatus(entry.id, 'forward')
      if (result.ok) {
        setForm(prev => withCycledField(prev, 'status', nextInCycle(STATUS_CYCLE, prev.status)))
      } else {
        setForm(prev => ({ ...prev, error: result.message, saving: false }))
      }
    } catch {
      setForm(prev => ({ ...prev, error: 'Failed to cycle status', saving: false }))
    }
  }, [entry, set])

  const handleCyclePriority = useCallback(async () => {
    if (!entry) return
    set('saving', true)
    try {
      const result = await cyclePriority(entry.id, 'forward')
      if (result.ok) {
        setForm(prev => withCycledField(prev, 'priority', nextInCycle(PRIORITY_CYCLE, prev.priority)))
      } else {
        setForm(prev => ({ ...prev, error: result.message, saving: false }))
      }
    } catch {
      setForm(prev => ({ ...prev, error: 'Failed to cycle priority', saving: false }))
    }
  }, [entry, set])

  const handleSave = useCallback(async () => {
    if (!form.key.trim()) {
      setForm(prev => ({ ...prev, error: 'Key is required' }))
      return
    }
    set('saving', true)
    try {
      const dueMs = form.dueDateStr ? new Date(form.dueDateStr).getTime() : undefined
      const dependsOnArr = form.dependsOn
        ? form.dependsOn
            .split(',')
            .map(s => Number.parseInt(s.trim(), 10))
            .filter(n => Number.isFinite(n))
        : undefined
      const tagsArr = form.tags
        ? form.tags
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        : undefined
      const result = entry
        ? await updateTask(
            entry.id,
            {
              key: form.key,
              desc: form.desc,
              priority: form.priority,
              status: form.status,
              dueDate: dueMs,
              dependsOn: dependsOnArr,
              tags: tagsArr
            },
            entry.updatedAt
          )
        : await createTask({
            key: form.key,
            desc: form.desc,
            priority: form.priority,
            dueDate: dueMs,
            dependsOn: dependsOnArr,
            tags: tagsArr
          })
      if (result.ok) {
        onClose()
      } else {
        setForm(prev => ({ ...prev, error: result.message, saving: false }))
      }
    } catch {
      setForm(prev => ({ ...prev, error: 'Failed to save', saving: false }))
    }
  }, [form, entry, set, onClose])

  return {
    form,
    set,
    dirty,
    handleSave,
    handleCycleStatus,
    handleCyclePriority,
    handleCancel: onClose
  }
}

function toDateInputValue(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return ''
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  const parts = d.toISOString().split('T')
  return parts[0] ?? ''
}
