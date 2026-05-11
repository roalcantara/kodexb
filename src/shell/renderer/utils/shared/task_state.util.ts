import type { Knowledge } from '@core'

export type TaskKnowledge = Extract<Knowledge, { type: 'task' }>

export function isTaskKnowledge(k: Knowledge): k is TaskKnowledge {
  return k.type === 'task'
}

export function taskIsOverdue(task: TaskKnowledge, now = new Date()): boolean {
  if (task.status === 'done') return false
  const raw = task.meta?.due
  if (raw === undefined || typeof raw !== 'string' || raw.trim() === '') return false
  const due = new Date(raw)
  if (Number.isNaN(due.getTime())) return false
  const startToday = new Date(now)
  startToday.setHours(0, 0, 0, 0)
  const dueDay = new Date(due)
  dueDay.setHours(0, 0, 0, 0)
  return dueDay < startToday
}

/** Dependency graph not in DB yet — always false until task deps land. */
export function taskIsBlocked(_task: TaskKnowledge, _all: Knowledge[]): boolean {
  return false
}
