import type { Knowledge } from '@core'
import type { TaskView } from '@shared/rpc'

type TaskKnowledge = Extract<Knowledge, { type: 'task' }>

/** Rolling window for `this_week` (calendar days from start of today). */
const DAYS_SPAN_THIS_WEEK = 7

function isTask(k: Knowledge): k is TaskKnowledge {
  return k.type === 'task'
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function parseDue(k: TaskKnowledge): Date | null {
  const raw = k.meta?.due
  if (!raw || typeof raw !== 'string') return null
  const dt = new Date(raw)
  return Number.isNaN(dt.getTime()) ? null : dt
}

/** `status === 'todo'` without dependency graph (Phase 7 adds blocking). */
function isActionablePlaceholder(k: TaskKnowledge): boolean {
  return k.status === 'todo'
}

function isOverdue(k: TaskKnowledge, now: Date): boolean {
  if (k.status === 'done') return false
  const due = parseDue(k)
  if (!due) return false
  return due < startOfDay(now)
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

const TASK_VIEWS: TaskView[] = ['actionable', 'today', 'overdue', 'this_week', 'all_pending', 'all_doing']

export function countTasksByView(tasks: TaskKnowledge[], now = new Date()): Record<TaskView, number> {
  const out = {} as Record<TaskView, number>
  for (const v of TASK_VIEWS) out[v] = 0
  for (const t of tasks) {
    for (const v of TASK_VIEWS) {
      if (taskMatchesView(t, v, now)) out[v]++
    }
  }
  return out
}

export function filterKnowledgeByTaskView(rows: Knowledge[], view: TaskView, now = new Date()): Knowledge[] {
  return rows.filter((r): r is TaskKnowledge => isTask(r) && taskMatchesView(r, view, now))
}
