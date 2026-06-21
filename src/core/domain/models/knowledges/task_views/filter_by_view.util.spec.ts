import { describe, expect, it } from 'bun:test'
import type { Knowledge } from '@core'
import { factoryFor } from '@testing'
import { filterKnowledgeByTaskView, taskMatchesView } from './filter_by_view.util'

const NOW = new Date('2026-06-20T00:00:00Z')

function taskRow(overrides: Partial<Knowledge>): Knowledge {
  return factoryFor('task', { overrides: overrides as Record<string, unknown> }) as Knowledge
}

function pastDueDate(daysAgo: number): number {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return d.getTime()
}

function futureDueDate(daysFromNow: number): number {
  const d = new Date(NOW)
  d.setDate(d.getDate() + daysFromNow)
  return d.getTime()
}

describe('taskMatchesView', () => {
  describe('when view is actionable', () => {
    it('returns true for todo tasks', () => {
      const k = taskRow({ status: 'todo' })
      expect(taskMatchesView(k as never, 'actionable', NOW)).toBe(true)
    })

    it('returns false for doing tasks', () => {
      const k = taskRow({ status: 'doing' })
      expect(taskMatchesView(k as never, 'actionable', NOW)).toBe(false)
    })
  })

  describe('when view is overdue', () => {
    it('returns true when due is in the past and not done', () => {
      const k = taskRow({ status: 'todo', dueDate: pastDueDate(2) })
      expect(taskMatchesView(k as never, 'overdue', NOW)).toBe(true)
    })

    it('returns false when due is in the past but done', () => {
      const k = taskRow({ status: 'done', dueDate: pastDueDate(2) })
      expect(taskMatchesView(k as never, 'overdue', NOW)).toBe(false)
    })

    it('returns false when there is no due date', () => {
      const k = taskRow({ status: 'todo' })
      expect(taskMatchesView(k as never, 'overdue', NOW)).toBe(false)
    })

    it('returns false when due is in the future', () => {
      const k = taskRow({ status: 'todo', dueDate: futureDueDate(3) })
      expect(taskMatchesView(k as never, 'overdue', NOW)).toBe(false)
    })
  })

  describe('when view is today', () => {
    it('returns true for tasks due today', () => {
      const k = taskRow({ status: 'todo', dueDate: NOW.getTime() })
      expect(taskMatchesView(k as never, 'today', NOW)).toBe(true)
    })

    it('returns true for overdue tasks', () => {
      const k = taskRow({ status: 'todo', dueDate: pastDueDate(1) })
      expect(taskMatchesView(k as never, 'today', NOW)).toBe(true)
    })
  })

  describe('when view is this_week', () => {
    it('returns true for tasks due within the week', () => {
      const k = taskRow({ status: 'todo', dueDate: futureDueDate(3) })
      expect(taskMatchesView(k as never, 'this_week', NOW)).toBe(true)
    })

    it('returns false for tasks due beyond the week', () => {
      const k = taskRow({ status: 'todo', dueDate: futureDueDate(14) })
      expect(taskMatchesView(k as never, 'this_week', NOW)).toBe(false)
    })
  })

  describe('when view is all_pending', () => {
    it('returns true for pending tasks', () => {
      const k = taskRow({ status: 'todo' })
      expect(taskMatchesView(k as never, 'all_pending', NOW)).toBe(true)
    })

    it('returns false for doing tasks', () => {
      const k = taskRow({ status: 'doing' })
      expect(taskMatchesView(k as never, 'all_pending', NOW)).toBe(false)
    })
  })

  describe('when view is all_doing', () => {
    it('returns true for doing tasks', () => {
      const k = taskRow({ status: 'doing' })
      expect(taskMatchesView(k as never, 'all_doing', NOW)).toBe(true)
    })

    it('returns false for pending tasks', () => {
      const k = taskRow({ status: 'todo' })
      expect(taskMatchesView(k as never, 'all_doing', NOW)).toBe(false)
    })
  })
})

describe('filterKnowledgeByTaskView', () => {
  it('filters tasks by the given view', () => {
    const rows: Knowledge[] = [
      taskRow({ status: 'todo', dueDate: pastDueDate(1) }),
      taskRow({ status: 'doing' }),
      taskRow({ status: 'done', dueDate: pastDueDate(1) })
    ] as Knowledge[]
    const result = filterKnowledgeByTaskView(rows, 'overdue', NOW)
    expect(result).toHaveLength(1)
  })

  it('returns empty when no tasks match', () => {
    const rows: Knowledge[] = [taskRow({ status: 'doing' })] as Knowledge[]
    const result = filterKnowledgeByTaskView(rows, 'overdue', NOW)
    expect(result).toHaveLength(0)
  })
})
