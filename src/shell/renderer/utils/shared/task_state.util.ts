import type { Knowledge } from '@core'

export type TaskKnowledge = Extract<Knowledge, { type: 'task' }>

export function isTaskKnowledge(k: Knowledge): k is TaskKnowledge {
  return k.type === 'task'
}

export function taskIsOverdue(task: TaskKnowledge): boolean {
  if (!task.dueDate) return false
  return task.dueDate < Date.now()
}

export function taskIsBlocked(task: TaskKnowledge): boolean {
  return (task.dependsOn?.length ?? 0) > 0
}
