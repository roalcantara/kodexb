import { describe, expect, it, mock } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DetailPageView } from '../../components/detail/detail_view.component'
import { DetailPage } from './detail.page'

const onOpenExternal = mock(() => Promise.resolve())
const pendingOg = () => new Promise<null>(() => undefined)

const bookmark = factoryFor('bookmark', {
  overrides: {
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
}) as RpcKnowledge

const task = factoryFor('task', {
  overrides: {
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
}) as RpcKnowledge

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

describe('DetailPage', () => {
  describe('with a bookmark entry', () => {
    it('renders entry key as heading', () => {
      renderDetail()
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('https://bun.sh')
    })

    it('renders entry type label', () => {
      renderDetail()
      expect(document.querySelector('.cmp-detail-page-type')?.textContent).toBe('bookmark')
    })

    it('renders tag chips', () => {
      renderDetail()
      const tags = document.querySelectorAll('.cmp-detail-page-tags .cmp-pill')
      expect(tags.length).toBe(2)
      expect(tags[0]?.textContent).toBe('#bun')
    })

    it('renders links section', () => {
      renderDetail()
      const link = document.querySelector('.cmp-detail-page-link')
      expect(link).not.toBeNull()
      expect(link?.getAttribute('title')).toBe('https://bun.sh/docs')
    })

    it('calls onOpenExternal on link click', async () => {
      onOpenExternal.mockClear()
      renderDetail()
      const link = document.querySelector('button.cmp-detail-page-link') as HTMLButtonElement
      expect(link).not.toBeNull()
      await userEvent.click(link)
      expect(onOpenExternal).toHaveBeenCalledTimes(1)
      expect(onOpenExternal).toHaveBeenCalledWith('https://bun.sh/docs')
    })

    it('renders markdown notes', () => {
      renderDetail()
      const body = document.querySelector('.cmp-detail-page-body')
      expect(body).not.toBeNull()
      expect(body?.textContent).toContain('Fast JS runtime')
    })

    it('does not show badges section', () => {
      renderDetail()
      expect(document.querySelector('.cmp-detail-page-badges')).toBeNull()
    })
  })

  describe('when entry is null', () => {
    it('renders not found state', () => {
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
  })

  describe('with a task entry', () => {
    it('shows task badges', () => {
      renderDetail(task)
      const badges = document.querySelector('.cmp-detail-page-badges')
      expect(badges).not.toBeNull()
      expect(badges?.textContent).toContain('high')
      expect(badges?.textContent).toContain('doing')
    })
  })

  describe('DetailPage loader', () => {
    it('renders markdown body for a loaded bookmark', async () => {
      const loadEntry = mock(() => Promise.resolve(bookmark))
      render(
        <DetailPage
          entryId={1}
          allEntries={[bookmark]}
          onClose={() => undefined}
          onSelectEntry={() => undefined}
          loadEntry={loadEntry}
        />
      )
      await screen.findByText('Fast JS runtime.')
      const body = document.querySelector('.cmp-detail-page-body')
      expect(body).not.toBeNull()
      expect(body?.textContent).toContain('Fast JS runtime')
    })
  })
})
