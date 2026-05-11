import type { Database } from 'bun:sqlite'
import type { Knowledge } from '../../../core'
import { rowToKnowledge } from './entry.repository'
import type { KnowledgeRow } from './schema'

const MAX_TASK_ORDER_SQL = 'SELECT COALESCE(MAX(task_order), -1) AS max_order FROM knowledges WHERE type = ?'

const FIND_DEPS_SQL = 'SELECT depends_on FROM knowledges WHERE id = ? AND type = ?'

const FIND_TASK_ORDER_SQL = 'SELECT task_order FROM knowledges WHERE id = ? AND type = ?'

const FIND_NEIGHBOR_SQL = `SELECT id, task_order FROM knowledges
  WHERE type = ? AND task_order IS NOT NULL AND task_order $OP ? AND id != ?
  ORDER BY task_order $DIR LIMIT 1`

const SET_TASK_ORDER_SQL = 'UPDATE knowledges SET task_order = ? WHERE id = ? AND type = ?'

export function maxTaskOrder(db: Database): number {
  const row = db.query<{ max_order: number }, [string]>(MAX_TASK_ORDER_SQL).get('task')
  return row ? row.max_order + 1 : 0
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing pattern outside Phase 9 scope
export function wouldCreateCycle(db: Database, taskId: number, newDepId: number, maxDepth: number = 3): boolean {
  if (taskId === newDepId) return true
  const visited = new Set<number>([taskId])
  const queue: Array<{ id: number; depth: number }> = [{ id: newDepId, depth: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break
    if (current.depth >= maxDepth) continue
    if (visited.has(current.id)) continue
    visited.add(current.id)

    const row = db.query<{ depends_on: string | null }, [number, string]>(FIND_DEPS_SQL).get(current.id, 'task')

    if (!row?.depends_on) continue

    let deps: number[] = []
    try {
      deps = JSON.parse(row.depends_on) as number[]
    } catch {
      continue
    }
    if (!Array.isArray(deps)) continue

    for (const depId of deps) {
      if (depId === taskId) return true
      queue.push({ id: depId, depth: current.depth + 1 })
    }
  }
  return false
}

export function updateTaskOrder(
  db: Database,
  taskId: number,
  dir: 'up' | 'down'
): Array<{ id: number; taskOrder: number }> {
  const current = db.query<{ task_order: number | null }, [number, string]>(FIND_TASK_ORDER_SQL).get(taskId, 'task')

  if (current?.task_order == null) return []

  const op = dir === 'up' ? '<' : '>'
  const orderDir = dir === 'up' ? 'DESC' : 'ASC'
  const neighborSql = FIND_NEIGHBOR_SQL.replace('$OP', op).replace('$DIR', orderDir)

  const neighbor = db
    .query<{ id: number; task_order: number }, [string, number, number]>(neighborSql)
    .get('task', current.task_order, taskId)

  if (!neighbor) return []

  db.transaction(() => {
    db.query(SET_TASK_ORDER_SQL).run(neighbor.task_order, taskId, 'task')
    db.query(SET_TASK_ORDER_SQL).run(current.task_order, neighbor.id, 'task')
  })()

  return [
    { id: taskId, taskOrder: neighbor.task_order },
    { id: neighbor.id, taskOrder: current.task_order }
  ]
}

export function findDependencies(db: Database, dependsOn: number[]): Knowledge[] {
  if (!dependsOn || dependsOn.length === 0) return []
  const placeholders = dependsOn.map(() => '?').join(',')
  const sql = `SELECT * FROM knowledges WHERE id IN (${placeholders})`
  const rows = db.query<KnowledgeRow, number[]>(sql).all(...dependsOn)
  return rows.map(row => rowToKnowledge(row))
}

export function findDependents(db: Database, taskId: number): Knowledge[] {
  const rows = db
    .query<KnowledgeRow, [string]>('SELECT * FROM knowledges WHERE type = ? AND depends_on IS NOT NULL')
    .all('task')
  return rows
    .filter(row => {
      if (!row.depends_on) return false
      try {
        const deps = JSON.parse(row.depends_on) as number[]
        return Array.isArray(deps) && deps.includes(taskId)
      } catch {
        return false
      }
    })
    .map(row => rowToKnowledge(row))
}
