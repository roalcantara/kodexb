import { describe, expect, it, mock } from 'bun:test'
import type { RpcImportResult } from '@shared/rpc'
import type { Dispatch, SetStateAction } from 'react'
import type { SyncModalModel } from '../../components/shared/sync_modal.component'
import { listSyncMessageHandlers } from './list_sync_message_handlers.util'

describe('listSyncMessageHandlers', () => {
  describe('when sync completes', () => {
    it('refreshes stats and list', () => {
      const refreshStats = mock(() => Promise.resolve())
      const refreshList = mock(() => Promise.resolve())
      const openModel: SyncModalModel = {
        open: true,
        phase: 'active',
        sourcesDir: '/s',
        totalFiles: 1,
        processed: 1,
        fileLog: [],
        summary: null,
        failMessage: null
      }
      const setSyncUi = mock((fn: SetStateAction<SyncModalModel>) => {
        if (typeof fn === 'function') fn(openModel)
      }) as unknown as Dispatch<SetStateAction<SyncModalModel>>

      const handlers = listSyncMessageHandlers({
        setSyncUi,
        setSyncing: mock(),
        syncModalOpenRef: { current: true },
        pushToast: mock(),
        refreshStats,
        refreshList
      })
      const result: RpcImportResult = { filesProcessed: 1, inserted: 1, updated: 0, errors: [] }
      handlers.onComplete(result)
      expect(refreshStats).toHaveBeenCalled()
      expect(refreshList).toHaveBeenCalledWith(false)
    })
  })
})
