/// <reference lib="dom" />

import { expect, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DependencyGraph } from './dependency_graph.component'

const setup = factoryFor('task', {
  overrides: {
    id: 1,
    key: 'setup-project',
    source: '/tasks.yml',
    desc: 'Setup',
    tags: ['kb'],
    status: 'done',
    doc: '',
    createdAt: 0,
    updatedAt: 0
  }
}) as RpcKnowledge

const review = factoryFor('task', {
  overrides: {
    id: 2,
    key: 'review-pr',
    source: '/tasks.yml',
    desc: 'Review',
    tags: ['kb'],
    status: 'doing',
    priority: 'high',
    dependsOn: [1],
    doc: '',
    createdAt: 0,
    updatedAt: 0
  }
}) as RpcKnowledge

test('DependencyGraph does not render without deps', () => {
  render(<DependencyGraph entry={setup} allEntries={[setup]} onSelectEntry={() => undefined} />)
  expect(document.querySelector('.kb-dependencyGraph')).toBeNull()
})

test('DependencyGraph renders blocked-by list', () => {
  render(<DependencyGraph entry={review} allEntries={[setup, review]} onSelectEntry={() => undefined} />)
  expect(screen.getByText('Blocked by')).not.toBeNull()
  expect(screen.getByText('setup-project')).not.toBeNull()
})

test('DependencyGraph renders blocking list', () => {
  render(<DependencyGraph entry={setup} allEntries={[setup, review]} onSelectEntry={() => undefined} />)
  expect(screen.getByText('Blocking')).not.toBeNull()
  expect(screen.getByText('review-pr')).not.toBeNull()
})

test('DependencyGraph click selects dependency', async () => {
  let selected = 0
  render(<DependencyGraph entry={review} allEntries={[setup, review]} onSelectEntry={id => (selected = id)} />)
  await userEvent.click(screen.getByText('setup-project'))
  expect(selected).toBe(1)
})
