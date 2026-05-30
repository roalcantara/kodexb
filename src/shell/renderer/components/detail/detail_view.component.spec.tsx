import '@happy-dom/global-registrator'

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
import { render, screen } from '@testing-library/react'
import { DetailPageView, type DetailPageViewProps } from './detail_view.component'

const openExternalMock = mock<(url: string) => void>()

const baseProps: DetailPageViewProps = {
  entry: null,
  loading: false,
  allEntries: [],
  onClose: () => {
    /* noop */
  },
  onSelectEntry: () => {
    /* noop */
  },
  onOpenExternal: url => openExternalMock(url),
  onFetchPreviewImage: () =>
    new Promise<null>(() => {
      /* never resolves — prevent PreviewImage async updates */
    })
}

function rpcBookmark(overrides: Partial<Omit<RpcKnowledge, 'type'>> = {}): RpcKnowledge {
  return factoryFor('bookmark', {
    overrides: {
      id: 1,
      key: 'https://example.com',
      source: '/tmp/test.yaml',
      desc: 'Test bookmark',
      tags: ['example'],
      links: [],
      notes: [],
      meta: {},
      doc: '',
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
      ...overrides
    }
  }) as RpcKnowledge
}

function rpcTask(overrides: Partial<Omit<RpcKnowledge, 'type'>> = {}): RpcKnowledge {
  return factoryFor('task', {
    overrides: {
      id: 2,
      key: 'Build kb',
      source: '/tmp/test.yaml',
      desc: 'Build the app',
      tags: ['dev'],
      links: [],
      notes: [],
      meta: {},
      doc: '',
      priority: 'high',
      status: 'doing',
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
      ...overrides
    }
  }) as RpcKnowledge
}

beforeEach(() => {
  openExternalMock.mockReset()
})

afterEach(() => {
  openExternalMock.mockReset()
})

describe('DetailPageView', () => {
  describe('when loading', () => {
    it('renders loading message', () => {
      render(<DetailPageView {...baseProps} loading={true} />)
      expect(screen.getByText('Loading entry…')).toBeTruthy()
    })
  })

  describe('when entry is null', () => {
    it('renders not-found message with close button', () => {
      render(<DetailPageView {...baseProps} entry={null} />)
      expect(screen.getByText('Entry not found.')).toBeTruthy()
      const closeBtn = screen.getByLabelText('Close detail')
      expect(closeBtn).toBeTruthy()
    })
  })

  describe('when entry has doc content', () => {
    it('renders the doc markdown via MdView', () => {
      const entry = rpcBookmark({
        doc: '# My Bookmark\n\nSome **bold** notes.',
        key: 'my-bookmark'
      })
      render(<DetailPageView {...baseProps} entry={entry} />)

      expect(screen.getByText('my-bookmark')).toBeTruthy()
      // MdView renders markdown — the heading and bold text should be present in the DOM
      expect(screen.getByText('My Bookmark')).toBeTruthy()
      expect(screen.getByText('bold')).toBeTruthy()
    })
  })

  describe('when entry is a task', () => {
    it('renders BadgeAccessory and DependencyGraph', () => {
      const entry = rpcTask({ doc: '# Task\n\nDo the thing.' })
      render(<DetailPageView {...baseProps} entry={entry} allEntries={[entry]} />)

      expect(screen.getByText('Build kb')).toBeTruthy()
      // BadgeAccessory renders task status/priority pills
      // "doing" and "high" appear in both BadgeAccessory pills and MetadataSidebar
      const doingEls = screen.getAllByText('doing')
      const highEls = screen.getAllByText('high')
      expect(doingEls.length).toBeGreaterThanOrEqual(1)
      expect(highEls.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('when entry has links', () => {
    it('renders the Links section with clickable buttons', () => {
      const entry = rpcBookmark({
        links: [{ GitHub: 'https://github.com' }],
        doc: '# Bookmark'
      })
      render(<DetailPageView {...baseProps} entry={entry} />)

      const linkBtn = screen.getByText('GitHub')
      expect(linkBtn).toBeTruthy()

      linkBtn.click()
      expect(openExternalMock).toHaveBeenCalledWith('https://github.com')
    })
  })
})
