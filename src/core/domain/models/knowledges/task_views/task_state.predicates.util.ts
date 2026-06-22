// pattern: Functional Core

import type { TaskKnowledge } from './task_date.util'

/**
 * ARCH-1 AC4: overdue rule in core.
 *
 * Behaviour-frozen: mirrors the original renderer predicate exactly
 * (raw dueDate < Date.now() with no status guard) so observable output
 * is unchanged. The `now` parameter exists for testability.
 */
export function taskIsOverdue(task: TaskKnowledge, now = Date.now()): boolean {
  if (!task.dueDate) return false
  return task.dueDate < now
}

/**
 * ARCH-1 AC4: blocked rule in core.
 *
 * A task is blocked when it lists one or more dependency IDs (dependsOn
 * is non-empty). No I/O — `dependsOn` is a property of the TaskKnowledge
 * value object, so this is a pure structural check.
 */
export function taskIsBlocked(task: TaskKnowledge): boolean {
  return (task.dependsOn?.length ?? 0) > 0
}
