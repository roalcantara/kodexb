/// <reference lib="dom" />

import { expect, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { render, screen } from '@testing-library/react'

import { BadgeAccessory } from './badge_accessory.component'

const overdueTask: RpcKnowledge = {
  type: 'task',
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

test('BadgeAccessory shows overdue pill for past due todo', () => {
  render(<BadgeAccessory entry={overdueTask} allEntries={[overdueTask]} />)
  expect(screen.getByText('overdue')).toBeTruthy()
  expect(screen.getByText('high')).toBeTruthy()
  expect(screen.getByText('todo')).toBeTruthy()
})

test('BadgeAccessory shows bookmark URL pill when key is https', () => {
  const b: RpcKnowledge = {
    type: 'bookmark',
    id: 3,
    key: 'https://example.com',
    source: 'f.yaml',
    desc: 'Ex',
    tags: [],
    doc: '',
    createdAt: 0,
    updatedAt: 0
  }
  render(<BadgeAccessory entry={b} />)
  expect(screen.getByTitle('Has URL')).toBeTruthy()
})
