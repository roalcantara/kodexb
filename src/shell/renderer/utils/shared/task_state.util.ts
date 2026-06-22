import type { Knowledge } from '@core'
import { taskIsBlocked as coreIsBlocked, taskIsOverdue as coreIsOverdue } from '@core/domain/models/knowledges/task_views/task_state.predicates.util'
import type { TaskKnowledge } from '@core/domain/models/knowledges/task_views/task_date.util'

export type { TaskKnowledge }

export function taskIsOverdue(task: TaskKnowledge): boolean {
  return coreIsOverdue(task)
}

export function taskIsBlocked(task: TaskKnowledge): boolean {
  return coreIsBlocked(task)
}

export function isTaskKnowledge(k: Knowledge): k is TaskKnowledge {
  return k.type === 'task'
}
