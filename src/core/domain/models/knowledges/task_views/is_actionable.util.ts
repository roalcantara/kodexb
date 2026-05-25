import type { Knowledge } from '../schemas/knowledge.schema'

type TaskKnowledge = Extract<Knowledge, { type: 'task' }>

/** `status === 'todo'` without dependency graph (Phase 7 adds blocking). */
export function isActionablePlaceholder(k: TaskKnowledge): boolean {
  return k.status === 'todo'
}
