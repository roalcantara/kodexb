import type { TaskKnowledge } from '../schemas/knowledge.schema'

/**
 * Preamble for a task entry:
 *   # <title>
 *   > <desc>          (only when desc is present)
 *   ### STATUS
 *   <STATUS>
 *   ### PRIORITY
 *   <PRIORITY>
 *   ### DUE DATE      (only when meta.due is present)
 *   <date> ⚠ OVERDUE  (only when due < now && status !== 'done')
 */
export const buildTaskPreamble = (entry: TaskKnowledge, now: Date) => {
  const parts: string[] = [`# ${entry.key}`]

  if (entry.desc) {
    parts.push(`> ${entry.desc}`)
  }

  if (entry.status) {
    parts.push(`### STATUS\n\n${entry.status.toUpperCase()}`)
  }

  if (entry.priority) {
    parts.push(`### PRIORITY\n\n${entry.priority.toUpperCase()}`)
  }

  const due = entry.meta?.due
  if (due) {
    const dueDate = new Date(due)
    const isOverdue = !Number.isNaN(dueDate.getTime()) && dueDate < now && entry.status !== 'done'
    const suffix = isOverdue ? ' ⚠ OVERDUE' : ''
    parts.push(`### DUE DATE\n\n${due}${suffix}`)
  }

  return parts.join('\n\n')
}
