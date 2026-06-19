import type { Database } from 'bun:sqlite'
import { repositoryStmts } from '@shared/logging'
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

const FIND_DEPENDENCIES_SQL = 'SELECT * FROM knowledges WHERE id IN ('

const FIND_DEPENDENTS_SQL = 'SELECT * FROM knowledges WHERE type = ? AND depends_on IS NOT NULL'

function initStmts(db: Database) {
  return repositoryStmts(db, 'Task', {
    maxOrder: MAX_TASK_ORDER_SQL,
    deps: FIND_DEPS_SQL,
    taskOrder: FIND_TASK_ORDER_SQL,
    setOrder: SET_TASK_ORDER_SQL,
    dependents: FIND_DEPENDENTS_SQL
  })
}

export function maxTaskOrder(db: Database): number {
  const s = initStmts(db)
  const row = s.maxOrder.get('task') as { max_order: number } | undefined
  return row ? row.max_order + 1 : 0
}

function parseDependsOnJson(raw: string | null): number[] | null {
  if (!raw) return null
  try {
    const deps = JSON.parse(raw) as unknown
    if (!Array.isArray(deps)) return null
    return deps as number[]
  } catch {
    return null
  }
}

function readTaskDependencyIds(db: Database, taskRowId: number): number[] {
  const s = initStmts(db)
  const row = s.deps.get(taskRowId, 'task') as { depends_on: string | null } | undefined
  return parseDependsOnJson(row?.depends_on ?? null) ?? []
}

export function wouldCreateCycle(db: Database, taskId: number, newDepId: number, maxDepth: number = 3): boolean {
  if (taskId === newDepId) return true
  const visited = new Set<number>([taskId])
  const queue: Array<{ id: number; depth: number }> = [{ id: newDepId, depth: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || current.depth >= maxDepth) continue
    if (visited.has(current.id)) continue
    visited.add(current.id)

    for (const depId of readTaskDependencyIds(db, current.id)) {
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
  const s = initStmts(db)
  const current = s.taskOrder.get(taskId, 'task') as { task_order: number | null } | undefined

  if (current?.task_order == null) return []

  const op = dir === 'up' ? '<' : '>'
  const orderDir = dir === 'up' ? 'DESC' : 'ASC'
  const neighborSql = FIND_NEIGHBOR_SQL.replace('$OP', op).replace('$DIR', orderDir)

  const neighbor = db
    .query<{ id: number; task_order: number }, [string, number, number]>(neighborSql)
    .get('task', current.task_order, taskId)

  if (!neighbor) return []

  db.transaction(() => {
    s.setOrder.run(neighbor.task_order, taskId, 'task')
    s.setOrder.run(current.task_order, neighbor.id, 'task')
  })()

  return [
    { id: taskId, taskOrder: neighbor.task_order },
    { id: neighbor.id, taskOrder: current.task_order }
  ]
}

export function findDependencies(db: Database, dependsOn: number[]): Knowledge[] {
  if (dependsOn.length === 0) return []
  const placeholders = dependsOn.map(() => '?').join(',')
  const sql = `${FIND_DEPENDENCIES_SQL}${placeholders})`
  const rows = db.query<KnowledgeRow, number[]>(sql).all(...dependsOn)
  return rows.map(row => rowToKnowledge(row))
}

export function findDependents(db: Database, taskId: number): Knowledge[] {
  const s = initStmts(db)
  const rows = s.dependents.all('task') as KnowledgeRow[]
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
