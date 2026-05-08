import { describe, expect, it } from 'bun:test'
import type { TaskKnowledge } from '../schemas/knowledge.schema'
import { buildTaskPreamble } from './doc.task.parser'

const baseTask: TaskKnowledge = {
  id: 1,
  type: 'task',
  key: 'Plan the launch',
  source: '/f.yml',
  desc: '',
  tags: ['work'],
  status: 'todo',
  createdAt: 0,
  updatedAt: 0
}

describe('buildTaskPreamble()', () => {
  it('renders title, status, and priority sections', () => {
    const t: TaskKnowledge = { ...baseTask, priority: 'high' }
    const out = buildTaskPreamble(t, new Date('2026-06-01T00:00:00Z'))
    expect(out).toContain('# Plan the launch')
    expect(out).toContain('### STATUS')
    expect(out).toContain('TODO')
    expect(out).toContain('### PRIORITY')
    expect(out).toContain('HIGH')
  })

  it('omits desc blockquote when desc is empty', () => {
    const out = buildTaskPreamble(baseTask, new Date('2026-06-01T00:00:00Z'))
    expect(out).not.toContain('>')
  })

  it('renders desc blockquote when desc is present', () => {
    const t: TaskKnowledge = { ...baseTask, desc: 'Coordinate the team' }
    const out = buildTaskPreamble(t, new Date('2026-06-01T00:00:00Z'))
    expect(out).toContain('> Coordinate the team')
  })

  it('marks DUE DATE as OVERDUE when due < now and status !== done', () => {
    const t: TaskKnowledge = { ...baseTask, meta: { due: '2026-05-01' } }
    const out = buildTaskPreamble(t, new Date('2026-06-01T00:00:00Z'))
    expect(out).toContain('### DUE DATE')
    expect(out).toContain('⚠ OVERDUE')
  })

  it('does NOT mark OVERDUE when status === done', () => {
    const t: TaskKnowledge = {
      ...baseTask,
      status: 'done',
      meta: { due: '2026-05-01' }
    }
    const out = buildTaskPreamble(t, new Date('2026-06-01T00:00:00Z'))
    expect(out).toContain('### DUE DATE')
    expect(out).not.toContain('⚠ OVERDUE')
  })

  it('omits DUE DATE section when meta.due is absent', () => {
    const out = buildTaskPreamble(baseTask, new Date('2026-06-01T00:00:00Z'))
    expect(out).not.toContain('### DUE DATE')
  })
})
