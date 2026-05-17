/// <reference lib="dom" />

import { afterEach, describe, expect, it } from 'bun:test'
import type { RpcKnowledge, RpcListEntry } from '@shared/rpc'
import { factoryFor } from '@testing'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { ListResultsBody } from './list_results_body.component'

const SYNC_BUTTON_RE = /sync/i
const EXAMPLE_URL_RE = /https:\/\/example.com/

afterEach(() => {
  cleanup()
})

const bookmark = {
  ...(factoryFor('bookmark', {
    overrides: {
      id: 1,
      key: 'https://example.com',
      source: 'fixtures/example.yaml',
      desc: 'Example bookmark',
      tags: ['docs'],
      doc: '',
      createdAt: 0,
      updatedAt: 0
    }
  }) as RpcKnowledge),
  frecencyScore: 2,
  visitCount: 1
} satisfies RpcListEntry

function renderBody(overrides: Partial<Parameters<typeof ListResultsBody>[0]> = {}) {
  const props: Parameters<typeof ListResultsBody>[0] = {
    listSurfaceRef: createRef<HTMLDivElement>(),
    listSentinelRef: createRef<HTMLDivElement>(),
    selectedId: null,
    onKeyDown: () => undefined,
    emptyDb: false,
    noResults: false,
    emptyList: false,
    syncInfo: null,
    onSync: () => undefined,
    emptySyncButtonRef: createRef<HTMLButtonElement>(),
    rows: [],
    visibleRows: [],
    virtualWindow: { startIndex: 0, endIndex: 0, paddingTop: 0, paddingBottom: 0 },
    hasMore: false,
    maxFrecencyScore: 0,
    onSelectEntry: () => undefined,
    dragDrop: undefined,
    onCycleStatus: () => undefined,
    onCyclePriority: () => undefined,
    ...overrides
  }

  return render(<ListResultsBody {...props} />)
}
describe('ListResultsBody', () => {
  describe('when database is empty', () => {
    it('renders sync action', async () => {
      let synced = false
      renderBody({
        emptyDb: true,
        syncInfo: { sourcesDir: '/tmp/kb', fileCount: 2 },
        onSync: () => {
          synced = true
        }
      })

      await userEvent.click(screen.getByRole('button', { name: SYNC_BUTTON_RE }))
      expect(synced).toBe(true)
    })
  })

  describe('with no results', () => {
    it('renders search empty state', () => {
      renderBody({ noResults: true })
      expect(screen.getByText('No results for this search.')).toBeTruthy()
    })
  })

  describe('with rows', () => {
    it('renders rows and sentinel', () => {
      const { container } = renderBody({
        rows: [bookmark],
        visibleRows: [bookmark],
        hasMore: true,
        maxFrecencyScore: 2
      })

      expect(screen.getByText(EXAMPLE_URL_RE)).toBeTruthy()
      expect(container.querySelector('.kb-listSentinel')).toBeTruthy()
    })
  })
})
