/// <reference lib="dom" />

import { expect, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { render, screen } from '@testing-library/react'

import { MetadataSidebar } from './metadata_sidebar.component'

const task: RpcKnowledge = {
  type: 'task',
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

test('MetadataSidebar renders common fields', () => {
  render(<MetadataSidebar entry={task} />)
  expect(screen.getByText('task')).not.toBeNull()
  expect(screen.getByText('/tasks.yml')).not.toBeNull()
  expect(screen.getByText('kb, ui')).not.toBeNull()
})

test('MetadataSidebar renders task fields', () => {
  render(<MetadataSidebar entry={task} />)
  expect(screen.getByText('todo')).not.toBeNull()
  expect(screen.getByText('mid')).not.toBeNull()
  expect(screen.getByText('28 Apr 2026')).not.toBeNull()
  expect(screen.getByText('7')).not.toBeNull()
})
