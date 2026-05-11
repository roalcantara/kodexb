/// <reference lib="dom" />

import { expect, mock, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DetailPageView } from '../../components/detail/detail_view.component'

const onOpenExternal = mock(() => Promise.resolve())
const pendingOg = () => new Promise<null>(() => undefined)

const bookmark: RpcKnowledge = {
  type: 'bookmark',
  id: 1,
  key: 'https://bun.sh',
  source: 'fixtures/test.yaml',
  desc: 'Bun JavaScript runtime',
  tags: ['bun', 'js'],
  links: ['https://bun.sh/docs'],
  notes: [{ md: 'Fast JS runtime.' }],
  doc: '> Bun JavaScript runtime\n\nFast JS runtime.',
  createdAt: 0,
  updatedAt: 0
}

const task: RpcKnowledge = {
  type: 'task',
  id: 2,
  key: 'fix-login-bug',
  source: 'fixtures/tasks.yaml',
  desc: 'Fix the login redirect',
  tags: [],
  priority: 'high',
  status: 'doing',
  doc: '> Fix the login redirect',
  createdAt: 0,
  updatedAt: 0
}

function renderDetail(entry: RpcKnowledge = bookmark) {
  return render(
    <DetailPageView
      entry={entry}
      allEntries={[entry]}
      onClose={() => undefined}
      onSelectEntry={() => undefined}
      onOpenExternal={onOpenExternal}
      onFetchPreviewImage={pendingOg}
    />
  )
}

test('DetailPageView renders entry key', () => {
  renderDetail()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('https://bun.sh')
})

test('DetailPageView renders entry type label', () => {
  renderDetail()
  expect(document.querySelector('.kb-detailPage-type')?.textContent).toBe('bookmark')
})

test('DetailPageView renders tag chips', () => {
  renderDetail()
  const tags = document.querySelectorAll('.kb-detailPage-tags .kb-pill')
  expect(tags.length).toBe(2)
  expect(tags[0]?.textContent).toBe('#bun')
})

test('DetailPageView renders links section', () => {
  renderDetail()
  const link = document.querySelector('.kb-detailPage-link')
  expect(link).not.toBeNull()
  expect(link?.getAttribute('title')).toBe('https://bun.sh/docs')
})

test('DetailPageView link click calls onOpenExternal with URL', async () => {
  onOpenExternal.mockClear()
  renderDetail()
  const link = document.querySelector('button.kb-detailPage-link') as HTMLButtonElement
  expect(link).not.toBeNull()
  await userEvent.click(link)
  expect(onOpenExternal).toHaveBeenCalledTimes(1)
  expect(onOpenExternal).toHaveBeenCalledWith('https://bun.sh/docs')
})

test('DetailPageView renders markdown notes', () => {
  renderDetail()
  const body = document.querySelector('.kb-detailPage-body')
  expect(body).not.toBeNull()
  expect(body?.textContent).toContain('Fast JS runtime')
})

test('DetailPageView renders not found state', () => {
  render(
    <DetailPageView
      entry={null}
      allEntries={[]}
      onClose={() => undefined}
      onSelectEntry={() => undefined}
      onOpenExternal={onOpenExternal}
      onFetchPreviewImage={pendingOg}
    />
  )
  expect(screen.getByText('Entry not found.')).not.toBeNull()
})

test('DetailPageView shows task badges for task entries', () => {
  renderDetail(task)
  const badges = document.querySelector('.kb-detailPage-badges')
  expect(badges).not.toBeNull()
  expect(badges?.textContent).toContain('high')
  expect(badges?.textContent).toContain('doing')
})

test('DetailPageView does not show badges section for non-task entries', () => {
  renderDetail()
  expect(document.querySelector('.kb-detailPage-badges')).toBeNull()
})
