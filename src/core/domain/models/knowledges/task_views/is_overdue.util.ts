import type { TaskKnowledge } from './task_date.util'
import { parseDue, startOfDay } from './task_date.util'

export function isOverdue(k: TaskKnowledge, now: Date): boolean {
  if (k.status === 'done') return false
  const due = parseDue(k)
  if (!due) return false
  return due < startOfDay(now)
}
