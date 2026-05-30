import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { ListStats, RpcDbStats, RpcImportResult } from '@shared/rpc'
import { act, render, screen, waitFor } from '@testing-library/react'

const getListStatsMock = mock<() => Promise<ListStats>>()
const getStatsMock = mock<() => Promise<RpcDbStats>>()
const setSyncMessageHandlersMock = mock<(handlers: { onProgress?: unknown; onComplete?: unknown }) => void>(
  () => undefined
)
const syncRpcMock = mock(() =>
  Promise.resolve({ filesProcessed: 0, inserted: 0, updated: 0, errors: [], warnings: [] })
)
const getSyncInfoMock = mock(() => Promise.resolve({ sourcesDir: '/tmp', fileCount: 0 }))
const pushToastMock = mock(() => undefined)

mock.module('../../rpc/client', () => ({
  getListStats: getListStatsMock,
  getStats: getStatsMock,
  setSyncMessageHandlers: setSyncMessageHandlersMock,
  syncRpc: syncRpcMock,
  getSyncInfo: getSyncInfoMock
}))

const { useListPageStatsSync } = await import('./use_list_page_stats_sync.hook')

describe('useListPageStatsSync', () => {
  const listStats: ListStats = {
    total: 4,
    bookmark: 1,
    command: 1,
    cheat: 1,
    task: 1,
    shortcut: 0,
    taskViews: {
      actionable: 1,
      today: 0,
      overdue: 0,
      this_week: 0,
      all_pending: 1,
      all_doing: 0
    },
    tags: { git: 2 },
    byType: { bookmark: 1, command: 1, cheat: 1, task: 1 }
  }

  function Harness() {
    const { stats, dbStats } = useListPageStatsSync({
      refreshList: mock(() => Promise.resolve()),
      pushToast: pushToastMock
    })
    return (
      <div>
        <span data-testid="total">{stats?.total ?? 'pending'}</span>
        <span data-testid="bookmark-count">{dbStats?.byType.bookmark ?? 'pending'}</span>
      </div>
    )
  }

  beforeEach(() => {
    getListStatsMock.mockReset()
    getStatsMock.mockReset()
    setSyncMessageHandlersMock.mockReset()
    syncRpcMock.mockReset()
    getSyncInfoMock.mockReset()
    pushToastMock.mockReset()
    getListStatsMock.mockResolvedValue(listStats)
    getStatsMock.mockResolvedValue({
      total: 4,
      byType: { bookmark: 1, command: 1, cheat: 1, task: 1 },
      dbPath: '/tmp/kb.sqlite',
      dbSize: 4096
    })
    setSyncMessageHandlersMock.mockImplementation(() => undefined)
    syncRpcMock.mockResolvedValue({ filesProcessed: 0, inserted: 0, updated: 0, errors: [], warnings: [] })
  })

  describe('when mount completes', () => {
    it('loads stats with a single RPC call', async () => {
      render(<Harness />)
      await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('4'))
      expect(getListStatsMock).toHaveBeenCalledTimes(1)
    })

    it('registers sync message handlers', async () => {
      render(<Harness />)
      await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('4'))
      expect(setSyncMessageHandlersMock).toHaveBeenCalled()
      const first = setSyncMessageHandlersMock.mock.calls[0]?.[0]
      expect(typeof first?.onProgress).toBe('function')
      expect(typeof first?.onComplete).toBe('function')
    })

    it('derives db byType from stats', async () => {
      render(<Harness />)
      await waitFor(() => expect(screen.getByTestId('bookmark-count').textContent).toBe('1'))
      expect(getListStatsMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('when sync completes', () => {
    it('refreshes stats', async () => {
      let onComplete: ((result: RpcImportResult) => void) | undefined
      setSyncMessageHandlersMock.mockImplementation((handlers: { onProgress?: unknown; onComplete?: unknown }) => {
        onComplete = handlers.onComplete as typeof onComplete
      })
      render(<Harness />)
      await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('4'))
      const complete = onComplete
      if (complete === undefined) {
        throw new Error('onComplete was not registered')
      }
      getListStatsMock.mockReset()
      getListStatsMock.mockResolvedValueOnce(listStats)
      act(() => {
        complete({ filesProcessed: 1, inserted: 1, updated: 0, errors: [], warnings: [] })
      })
      await waitFor(() => expect(getListStatsMock).toHaveBeenCalledTimes(1))
    })

    it('calls onComplete only once even if triggered by both push and RPC', async () => {
      let onComplete: ((result: RpcImportResult) => void) | undefined
      setSyncMessageHandlersMock.mockImplementation((handlers: { onProgress?: unknown; onComplete?: unknown }) => {
        onComplete = handlers.onComplete as typeof onComplete
      })
      const refreshListMock = mock(() => Promise.resolve())
      function HarnessWithMock() {
        const { stats } = useListPageStatsSync({
          refreshList: refreshListMock,
          pushToast: pushToastMock
        })
        return (
          <div>
            <span data-testid="total">{stats?.total ?? 'pending'}</span>
          </div>
        )
      }
      render(<HarnessWithMock />)
      await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('4'))
      if (onComplete === undefined) throw new Error('onComplete not registered')
      const result = { filesProcessed: 1, inserted: 1, updated: 0, errors: [], warnings: [] }
      const doComplete = onComplete
      act(() => {
        doComplete(result)
        doComplete(result)
      })
      await waitFor(() => expect(refreshListMock).toHaveBeenCalledTimes(1))
    })
  })
})
