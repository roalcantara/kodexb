import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'
import { factoryFor } from '../../../__tests__/factories/factories.builder'
import type { Knowledge } from '../../../core'
import { upsert } from './entry.repository'
import { findDependencies, findDependents, maxTaskOrder, updateTaskOrder, wouldCreateCycle } from './task.repository'

function freshDb(): Database {
  const db = new Database(':memory:')
  db.run(`CREATE TABLE IF NOT EXISTS knowledges (
    id          INTEGER PRIMARY KEY,
    type        TEXT    NOT NULL,
    key         TEXT    NOT NULL,
    source      TEXT    NOT NULL,
    desc        TEXT    NOT NULL,
    tags        TEXT    NOT NULL DEFAULT '[]',
    links       TEXT             DEFAULT '[]',
    notes       TEXT             DEFAULT '[]',
    doc         TEXT    NOT NULL DEFAULT '',
    priority    TEXT,
    status      TEXT,
    due_date    INTEGER,
    task_order  INTEGER,
    depends_on  TEXT             DEFAULT '[]',
    meta        TEXT             DEFAULT '{}',
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  )`)
  return db
}

describe('maxTaskOrder', () => {
  it('returns 0 when no tasks exist', () => {
    const db = freshDb()
    expect(maxTaskOrder(db)).toBe(0)
  })

  it('returns the highest task_order + 1', () => {
    const db = freshDb()
    const t1 = factoryFor('task', { overrides: { taskOrder: 0 } })
    const t2 = factoryFor('task', { overrides: { taskOrder: 5 } })
    upsert(db, t1)
    upsert(db, t2)
    expect(maxTaskOrder(db)).toBe(6)
  })

  it('ignores non-task rows', () => {
    const db = freshDb()
    const bm = factoryFor('bookmark')
    ;(bm as Record<string, unknown>).taskOrder = 99
    upsert(db, bm as Knowledge)
    const t = factoryFor('task', { overrides: { taskOrder: 2 } })
    upsert(db, t)
    expect(maxTaskOrder(db)).toBe(3)
  })

  it('handles null task_order gracefully', () => {
    const db = freshDb()
    const t = factoryFor('task', { overrides: { taskOrder: undefined } })
    upsert(db, t)
    const result = maxTaskOrder(db)
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })
})

describe('wouldCreateCycle', () => {
  it('returns true for self-dependency', () => {
    const db = freshDb()
    const task = factoryFor('task')
    upsert(db, task)
    expect(wouldCreateCycle(db, task.id, task.id)).toBe(true)
  })

  it('returns false when there is no depends_on link', () => {
    const db = freshDb()
    const a = factoryFor('task')
    const b = factoryFor('task')
    upsert(db, a)
    upsert(db, b)
    expect(wouldCreateCycle(db, a.id, b.id)).toBe(false)
  })

  it('detects direct cycle (B→A→B)', () => {
    const db = freshDb()
    // B depends on A (B→A)
    // Would adding A as dep of B (B→A is already true, but check if A→B would cycle)
    // Actually: A depends on B. Check if adding B as dep of A creates B→A→B
    const b = factoryFor('task', { overrides: { dependsOn: [] } })
    upsert(db, b)
    const a = factoryFor('task', { overrides: { dependsOn: [b.id] } })
    upsert(db, a)
    // A→B. Now check: would making B depend on A create a cycle?
    // BFS from A follows A's deps: A→B. B is the taskId → cycle!
    expect(wouldCreateCycle(db, b.id, a.id)).toBe(true)
  })

  it('detects indirect cycle (C→A→B→C) within maxDepth', () => {
    const db = freshDb()
    // C has no deps (yet)
    const c = factoryFor('task', { overrides: { dependsOn: [] } })
    upsert(db, c)
    // B depends on C (B→C)
    const b = factoryFor('task', { overrides: { dependsOn: [c.id] } })
    upsert(db, b)
    // A depends on B (A→B)
    const a = factoryFor('task', { overrides: { dependsOn: [b.id] } })
    upsert(db, a)
    // Chain: A→B→C. Check: would making C depend on A create C→A→B→C?
    // BFS from A: A→B (depth 1), B→C (depth 2). C === taskId → cycle!
    expect(wouldCreateCycle(db, c.id, a.id)).toBe(true)
  })

  it('returns false for no-cycle chain', () => {
    const db = freshDb()
    const a = factoryFor('task', { overrides: { dependsOn: [] } })
    const b = factoryFor('task', { overrides: { dependsOn: [] } })
    upsert(db, a)
    upsert(db, b)
    expect(wouldCreateCycle(db, a.id, b.id)).toBe(false)
  })

  it('returns false when cycle depth exceeds maxDepth', () => {
    const db = freshDb()
    // Chain: D→C→B→A (D depends on C depends on B depends on A)
    const a = factoryFor('task', { overrides: { dependsOn: [] } })
    upsert(db, a)
    const b = factoryFor('task', { overrides: { dependsOn: [a.id] } })
    upsert(db, b)
    const c = factoryFor('task', { overrides: { dependsOn: [b.id] } })
    upsert(db, c)
    const d = factoryFor('task', { overrides: { dependsOn: [c.id] } })
    upsert(db, d)
    // D→C→B→A. Check: would making A depend on D create A→D→C→B→A?
    // BFS from D: D→C (depth 1), C→B (depth 2), B→A at depth 3
    // With maxDepth=2: depth 2 == maxDepth, so skip C's deps. Won't reach A.
    // With maxDepth=3 (default): depth 2 < 3, visit B. B→A at depth 3. depth 3 >= 3 → skip. Won't reach A either!
    // With maxDepth=4: would find A.
    // So with maxDepth=2 it definitely won't find it.
    expect(wouldCreateCycle(db, a.id, d.id, 2)).toBe(false)
  })

  it('returns false when depends_on is malformed JSON', () => {
    const db = freshDb()
    const a = factoryFor('task')
    const b = factoryFor('task', { overrides: { dependsOn: [] } })
    upsert(db, a)
    upsert(db, b)
    db.query('UPDATE knowledges SET depends_on = ? WHERE id = ?').run('not-json', b.id)
    expect(wouldCreateCycle(db, a.id, b.id)).toBe(false)
  })
})

describe('updateTaskOrder', () => {
  it('moves a task up (swaps with previous task)', () => {
    const db = freshDb()
    const t1 = factoryFor('task', { overrides: { taskOrder: 0 } })
    const t2 = factoryFor('task', { overrides: { taskOrder: 1 } })
    upsert(db, t1)
    upsert(db, t2)
    const result = updateTaskOrder(db, t2.id, 'up')
    expect(result).toHaveLength(2)
    expect(result.find(r => r.id === t2.id)?.taskOrder).toBe(0)
    expect(result.find(r => r.id === t1.id)?.taskOrder).toBe(1)
  })

  it('moves a task down (swaps with next task)', () => {
    const db = freshDb()
    const t1 = factoryFor('task', { overrides: { taskOrder: 10 } })
    const t2 = factoryFor('task', { overrides: { taskOrder: 20 } })
    upsert(db, t1)
    upsert(db, t2)
    const result = updateTaskOrder(db, t1.id, 'down')
    expect(result).toHaveLength(2)
    expect(result.find(r => r.id === t1.id)?.taskOrder).toBe(20)
    expect(result.find(r => r.id === t2.id)?.taskOrder).toBe(10)
  })

  it('returns empty array when no neighbor exists (move up from top)', () => {
    const db = freshDb()
    const t = factoryFor('task', { overrides: { taskOrder: 0 } })
    upsert(db, t)
    const result = updateTaskOrder(db, t.id, 'up')
    expect(result).toEqual([])
  })

  it('returns empty array when no neighbor exists (move down from bottom)', () => {
    const db = freshDb()
    const t = factoryFor('task', { overrides: { taskOrder: 100 } })
    upsert(db, t)
    const result = updateTaskOrder(db, t.id, 'down')
    expect(result).toEqual([])
  })

  it('returns empty array when task has null task_order', () => {
    const db = freshDb()
    const t = factoryFor('task', { overrides: { taskOrder: undefined } })
    upsert(db, t)
    const result = updateTaskOrder(db, t.id, 'up')
    expect(result).toEqual([])
  })

  it('persists the swap in the database', () => {
    const db = freshDb()
    const t1 = factoryFor('task', { overrides: { taskOrder: 50 } })
    const t2 = factoryFor('task', { overrides: { taskOrder: 60 } })
    upsert(db, t1)
    upsert(db, t2)
    updateTaskOrder(db, t1.id, 'down')

    const row1 = db
      .query<{ task_order: number }, [number, string]>('SELECT task_order FROM knowledges WHERE id = ? AND type = ?')
      .get(t1.id, 'task')
    const row2 = db
      .query<{ task_order: number }, [number, string]>('SELECT task_order FROM knowledges WHERE id = ? AND type = ?')
      .get(t2.id, 'task')

    expect(row1?.task_order).toBe(60)
    expect(row2?.task_order).toBe(50)
  })
})

describe('findDependencies', () => {
  describe.each([
    ['task', 'task'] as const,
    ['bookmark', 'bookmark'] as const
  ])('findDependencies with %s dep', (factoryName, expectedType) => {
    it('returns the dependency', () => {
      const db = freshDb()
      const dep = factoryFor(factoryName)
      const main = factoryFor('task', { overrides: { dependsOn: [dep.id] } })
      upsert(db, dep)
      upsert(db, main)

      const result = findDependencies(db, [dep.id])
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe(dep.id)
      expect(result[0]?.type).toBe(expectedType)
    })
  })

  it('returns empty array for empty input', () => {
    const db = freshDb()
    expect(findDependencies(db, [])).toHaveLength(0)
  })

  it('returns empty array when no matching IDs', () => {
    const db = freshDb()
    expect(findDependencies(db, [999_999_999])).toHaveLength(0)
  })

  it('returns multiple dependencies', () => {
    const db = freshDb()
    const d1 = factoryFor('task')
    const d2 = factoryFor('command')
    const main = factoryFor('task', { overrides: { dependsOn: [d1.id, d2.id] } })
    upsert(db, d1)
    upsert(db, d2)
    upsert(db, main)

    const result = findDependencies(db, [d1.id, d2.id])
    expect(result).toHaveLength(2)
    const ids = result.map(r => r.id)
    expect(ids).toContain(d1.id)
    expect(ids).toContain(d2.id)
  })
})

describe('findDependents', () => {
  it('finds tasks that depend on the given task', () => {
    const db = freshDb()
    const dep = factoryFor('task')
    const child = factoryFor('task', { overrides: { dependsOn: [dep.id] } })
    upsert(db, dep)
    upsert(db, child)

    const result = findDependents(db, dep.id)
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe(child.id)
  })

  it('returns empty array when no tasks depend on it', () => {
    const db = freshDb()
    const task = factoryFor('task')
    upsert(db, task)
    expect(findDependents(db, task.id)).toHaveLength(0)
  })

  it('returns multiple dependents', () => {
    const db = freshDb()
    const dep = factoryFor('task')
    const c1 = factoryFor('task', { overrides: { dependsOn: [dep.id] } })
    const c2 = factoryFor('task', { overrides: { dependsOn: [dep.id] } })
    upsert(db, dep)
    upsert(db, c1)
    upsert(db, c2)

    const result = findDependents(db, dep.id)
    expect(result).toHaveLength(2)
  })

  it('ignores non-task rows in depends_on search', () => {
    const db = freshDb()
    const dep = factoryFor('bookmark')
    const task = factoryFor('task')
    upsert(db, dep)
    upsert(db, task)

    const result = findDependents(db, dep.id)
    expect(result).toHaveLength(0)
  })

  it('handles malformed depends_on JSON gracefully', () => {
    const db = freshDb()
    const dep = factoryFor('task')
    const bad = factoryFor('task')
    upsert(db, dep)
    upsert(db, bad)
    db.query('UPDATE knowledges SET depends_on = ? WHERE id = ?').run('{{bad', bad.id)

    const result = findDependents(db, dep.id)
    expect(result).toHaveLength(0)
  })
})
