import { describe, expect, it, mock } from 'bun:test'
import type { RpcImportResult } from '@shared/rpc'
import type { Dispatch, SetStateAction } from 'react'
import type { SyncModalModel } from '../../components/shared/sync_modal.component'
import { type ListSyncMessageHandlerDeps, listSyncMessageHandlers } from './list_sync_message_handlers.util'

const closedModal: SyncModalModel = {
  open: false,
  phase: 'active',
  sourcesDir: '/s',
  totalFiles: 1,
  processed: 1,
  fileLog: [],
  summary: null,
  failMessage: null
}

const openModal: SyncModalModel = { ...closedModal, open: true }

function buildHandlers(
  modal: SyncModalModel,
  overrides: Partial<ListSyncMessageHandlerDeps> = {}
): ReturnType<typeof listSyncMessageHandlers> {
  const setSyncUi = mock((fn: SetStateAction<SyncModalModel>) => {
    if (typeof fn === 'function') fn(modal)
  }) as unknown as Dispatch<SetStateAction<SyncModalModel>>

  return listSyncMessageHandlers({
    setSyncUi,
    setSyncing: mock(),
    syncModalOpenRef: { current: modal.open },
    pushToast: mock(),
    refreshStats: mock(() => Promise.resolve()),
    refreshList: mock(() => Promise.resolve()),
    ...overrides
  })
}

describe('listSyncMessageHandlers', () => {
  describe('when sync completes', () => {
    it('refreshes stats and list', () => {
      const refreshStats = mock(() => Promise.resolve())
      const refreshList = mock(() => Promise.resolve())
      const handlers = buildHandlers(openModal, { refreshStats, refreshList })
      const result: RpcImportResult = { filesProcessed: 1, inserted: 1, updated: 0, errors: [], warnings: [] }
      handlers.onComplete(result)
      expect(refreshStats).toHaveBeenCalled()
      expect(refreshList).toHaveBeenCalledWith(false)
    })

    it('shows a toast when warnings are present', () => {
      const pushToast = mock()
      const handlers = buildHandlers(closedModal, { pushToast })
      const result: RpcImportResult = {
        filesProcessed: 1,
        inserted: 1,
        updated: 0,
        errors: [],
        warnings: ['hard collision: cmd+space between app-a and app-b (A / B)']
      }
      handlers.onComplete(result)
      expect(pushToast).toHaveBeenCalledWith('Sync finished with 1 collision warning(s).', 'error')
    })
  })
})
