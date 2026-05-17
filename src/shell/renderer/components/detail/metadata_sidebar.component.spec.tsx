/// <reference lib="dom" />

import { describe, expect, it } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
import { render, screen } from '@testing-library/react'

import { MetadataSidebar } from './metadata_sidebar.component'

const task = factoryFor('task', {
  overrides: {
    id: 42,
    key: 'ship-detail',
    source: '/tasks.yml',
    desc: 'Ship detail view',
    tags: ['kb', 'ui'],
    status: 'todo',
    priority: 'mid',
    doc: '',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
    dueDate: new Date('2026-04-28').getTime(),
    taskOrder: 7
  }
}) as RpcKnowledge
describe('MetadataSidebar', () => {
  describe('when rendering common fields', () => {
    it('shows type, source and tags', () => {
      render(<MetadataSidebar entry={task} />)
      expect(screen.getByText('task')).not.toBeNull()
      expect(screen.getByText('/tasks.yml')).not.toBeNull()
      expect(screen.getByText('kb, ui')).not.toBeNull()
    })
  })

  describe('when rendering task-specific fields', () => {
    it('shows status, priority, due date and order', () => {
      render(<MetadataSidebar entry={task} />)
      expect(screen.getByText('todo')).not.toBeNull()
      expect(screen.getByText('mid')).not.toBeNull()
      expect(screen.getByText('28 Apr 2026')).not.toBeNull()
      expect(screen.getByText('7')).not.toBeNull()
    })
  })
})
