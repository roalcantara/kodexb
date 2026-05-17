/// <reference lib="dom" />

import { describe, expect, it } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
import { render, screen } from '@testing-library/react'

import { BadgeAccessory } from './badge_accessory.component'

const overdueTask = factoryFor('task', {
  overrides: {
    id: 2,
    key: 'task-overdue',
    source: 'fixtures/t.yaml',
    desc: 'Late task',
    tags: [],
    status: 'todo',
    priority: 'high',
    doc: '',
    createdAt: 0,
    updatedAt: 0,
    dueDate: new Date('1999-06-15').getTime()
  }
}) as RpcKnowledge
describe('BadgeAccessory', () => {
  describe('with a task entry', () => {
    it('shows overdue, priority and status pills', () => {
      render(<BadgeAccessory entry={overdueTask} allEntries={[overdueTask]} />)
      expect(screen.getByText('overdue')).toBeTruthy()
      expect(screen.getByText('high')).toBeTruthy()
      expect(screen.getByText('todo')).toBeTruthy()
    })
  })

  describe('with a bookmark entry', () => {
    it('shows URL pill when key is https', () => {
      const b = factoryFor('bookmark', {
        overrides: {
          id: 3,
          key: 'https://example.com',
          source: 'f.yaml',
          desc: 'Ex',
          tags: [],
          doc: '',
          createdAt: 0,
          updatedAt: 0
        }
      }) as RpcKnowledge
      render(<BadgeAccessory entry={b} />)
      expect(screen.getByTitle('Has URL')).toBeTruthy()
    })
  })
})
