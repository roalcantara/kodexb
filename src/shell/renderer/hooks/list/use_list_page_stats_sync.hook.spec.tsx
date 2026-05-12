/// <reference lib="dom" />

import { beforeEach, expect, mock, test } from 'bun:test'
import type { ListStats, RpcDbStats } from '@shared/rpc'
import { render, screen, waitFor } from '@testing-library/react'

const getListStatsMock = mock<() => Promise<ListStats>>()
const getStatsMock = mock<() => Promise<RpcDbStats>>()
const setSyncMessageHandlersMock = mock(() => undefined)
const syncRpcMock = mock(() => Promise.resolve({ filesProcessed: 0, inserted: 0, updated: 0, errors: [] }))
const getSyncInfoMock = mock(() => Promise.resolve({ sourcesDir: '/tmp', fileCount: 0 }))

mock.module('../../rpc/client', () => ({
  getListStats: getListStatsMock,
  getStats: getStatsMock,
  setSyncMessageHandlers: setSyncMessageHandlersMock,
  syncRpc: syncRpcMock,
  getSyncInfo: getSyncInfoMock
}))

const { useListPageStatsSync } = await import('./use_list_page_stats_sync.hook')

const listStats: ListStats = {
  total: 4,
  bookmark: 1,
  command: 1,
  cheat: 1,
  task: 1,
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
  const { stats, dbStats } = useListPageStatsSync(mock(() => Promise.resolve()))
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
  getListStatsMock.mockResolvedValue(listStats)
  getStatsMock.mockResolvedValue({
    total: 4,
    byType: { bookmark: 1, command: 1, cheat: 1, task: 1 },
    dbPath: '/tmp/kb.sqlite',
    dbSize: 4096
  })
  setSyncMessageHandlersMock.mockImplementation(() => undefined)
  syncRpcMock.mockResolvedValue({ filesProcessed: 0, inserted: 0, updated: 0, errors: [] })
})

test('loads stats with a single list stats RPC call', async () => {
  render(<Harness />)

  await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('4'))

  expect(getListStatsMock).toHaveBeenCalledTimes(1)
})

test('derives db byType data from the list stats response', async () => {
  render(<Harness />)

  await waitFor(() => expect(screen.getByTestId('bookmark-count').textContent).toBe('1'))

  expect(getListStatsMock).toHaveBeenCalledTimes(1)
})
