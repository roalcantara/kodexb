// pattern: Functional Core

/**
 * Pure BFS cycle detection (ARCH-1 AC3).
 *
 * `readDepIds` is a synchronous callback that returns the dependency IDs for a
 * given task row. The shell wraps its SQL-backed `readTaskDependencyIds` to
 * satisfy this interface — the call to SQL is the only I/O, and the shell owns
 * it.
 */
export function wouldCreateCycle(
  taskId: number,
  newDepId: number,
  readDepIds: (id: number) => number[],
  maxDepth = 3
): boolean {
  if (taskId === newDepId) return true
  const visited = new Set<number>([taskId])
  const queue: Array<{ id: number; depth: number }> = [{ id: newDepId, depth: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || current.depth >= maxDepth) continue
    if (visited.has(current.id)) continue
    visited.add(current.id)

    for (const depId of readDepIds(current.id)) {
      if (depId === taskId) return true
      queue.push({ id: depId, depth: current.depth + 1 })
    }
  }
  return false
}
