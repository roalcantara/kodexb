import type { TaskView } from './task_view.types'
import type { Knowledge } from '../schemas/knowledge.schema'
import { taskMatchesView } from './filter_by_view.util'
import { TASK_VIEW_ORDER } from './task_view_order.const'

type TaskKnowledge = Extract<Knowledge, { type: 'task' }>

export function countTasksByView(tasks: TaskKnowledge[], now = new Date()): Record<TaskView, number> {
  const out = {} as Record<TaskView, number>
  for (const v of TASK_VIEW_ORDER) out[v] = 0
  for (const t of tasks) {
    for (const v of TASK_VIEW_ORDER) {
      if (taskMatchesView(t, v, now)) out[v]++
    }
  }
  return out
}
