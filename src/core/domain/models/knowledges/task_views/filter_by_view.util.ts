import type { TaskView } from './task_view.types'
import type { Knowledge } from '../schemas/knowledge.schema'
import { addDays, parseDue, startOfDay, type TaskKnowledge } from './task_date.util'

/** Rolling window for `this_week` (calendar days from start of today). */
const DAYS_SPAN_THIS_WEEK = 7

function isActionablePlaceholder(k: TaskKnowledge): boolean {
  return k.status === 'todo'
}

function isOverdue(k: TaskKnowledge, now: Date): boolean {
  if (k.status === 'done') return false
  const due = parseDue(k)
  if (!due) return false
  return due < startOfDay(now)
}

function isTask(k: Knowledge): k is TaskKnowledge {
  return k.type === 'task'
}

function isDueToday(k: TaskKnowledge, now: Date): boolean {
  if (k.status === 'done') return false
  const due = parseDue(k)
  if (!due) return false
  return startOfDay(due).getTime() === startOfDay(now).getTime()
}

function isDueThisWeek(k: TaskKnowledge, now: Date): boolean {
  if (k.status === 'done') return false
  const due = parseDue(k)
  if (!due) return false
  const end = addDays(startOfDay(now), DAYS_SPAN_THIS_WEEK)
  return due >= startOfDay(now) && due < end
}

const TASK_VIEW_MATCH: Record<TaskView, (k: TaskKnowledge, now: Date) => boolean> = {
  actionable: k => isActionablePlaceholder(k),
  today: (k, now) => isDueToday(k, now) || isOverdue(k, now),
  overdue: (k, now) => isOverdue(k, now),
  this_week: (k, now) => isDueThisWeek(k, now),
  all_pending: k => k.status === 'todo',
  all_doing: k => k.status === 'doing'
}

export function taskMatchesView(k: TaskKnowledge, view: TaskView, now = new Date()): boolean {
  return TASK_VIEW_MATCH[view](k, now)
}

export function filterKnowledgeByTaskView(rows: Knowledge[], view: TaskView, now = new Date()): Knowledge[] {
  return rows.filter((r): r is TaskKnowledge => isTask(r) && taskMatchesView(r, view, now))
}
