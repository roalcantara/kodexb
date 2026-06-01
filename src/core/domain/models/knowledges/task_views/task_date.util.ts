import type { Knowledge } from '../schemas/knowledge.schema'

export type TaskKnowledge = Extract<Knowledge, { type: 'task' }>

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function parseDue(k: TaskKnowledge): Date | null {
  const raw = k.dueDate
  if (raw === undefined || raw === null) return null
  const dt = new Date(raw)
  return Number.isNaN(dt.getTime()) ? null : dt
}
