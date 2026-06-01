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

function buildHandlersWithCapturedSetter(capture: (fn: SetStateAction<SyncModalModel>) => void) {
  const setSyncUiMock = mock(capture)
  const setSyncUi = setSyncUiMock as unknown as Dispatch<SetStateAction<SyncModalModel>>
  const handlers = listSyncMessageHandlers({
    setSyncUi,
    setSyncing: mock(),
    syncModalOpenRef: { current: true },
    pushToast: mock(),
    refreshStats: mock(() => Promise.resolve()),
    refreshList: mock(() => Promise.resolve())
  })
  return { setSyncUiMock, handlers }
}

describe('listSyncMessageHandlers', () => {
  describe('when sync completes', () => {
    it('refreshes stats and list', () => {
      const refreshStats = mock(() => Promise.resolve())
      const refreshList = mock(() => Promise.resolve())
      const handlers = buildHandlers(openModal, { refreshStats, refreshList })
      const result: RpcImportResult = {
        filesProcessed: 1,
        inserted: 1,
        updated: 0,
        errors: [],
        warnings: [],
        fileLog: []
      }
      handlers.onComplete(result)
      expect(refreshStats).toHaveBeenCalled()
      expect(refreshList).toHaveBeenCalledWith(false)
    })

    it('hydrates fileLog from result when progress never pushed', () => {
      const { setSyncUiMock, handlers } = buildHandlersWithCapturedSetter((fn: SetStateAction<SyncModalModel>) => {
        if (typeof fn === 'function') fn(openModal)
      })
      const fileLogEntry: RpcImportResult['fileLog'][number] = {
        path: '/src/test.yml',
        label: 'test.yml',
        ok: true,
        inserted: 2,
        updated: 0
      }
      const result: RpcImportResult = {
        filesProcessed: 1,
        inserted: 2,
        updated: 0,
        errors: [],
        warnings: [],
        fileLog: [fileLogEntry]
      }
      handlers.onComplete(result)
      expect(setSyncUiMock).toHaveBeenCalled()
      const calls = setSyncUiMock.mock.calls
      const callArg = calls[calls.length - 1]
      if (!callArg) throw new Error('setSyncUi not called')
      const stateFn = callArg[0] as unknown as (prev: SyncModalModel) => SyncModalModel
      const next = stateFn(openModal)
      expect(next.fileLog).toEqual([fileLogEntry])
    })

    it('preserves progress fileLog when result has duplicates', () => {
      let modalState = { ...openModal }
      const { setSyncUiMock, handlers } = buildHandlersWithCapturedSetter((fn: SetStateAction<SyncModalModel>) => {
        if (typeof fn === 'function') modalState = fn(modalState)
      })
      const progressFile: RpcImportResult['fileLog'][number] = {
        path: '/src/a.yml',
        label: 'a.yml',
        ok: true,
        inserted: 1,
        updated: 0
      }
      handlers.onProgress({ processed: 1, total: 2, recentFile: progressFile })
      const result: RpcImportResult = {
        filesProcessed: 2,
        inserted: 3,
        updated: 0,
        errors: [],
        warnings: [],
        fileLog: [progressFile, { path: '/src/b.yml', label: 'b.yml', ok: true, inserted: 2, updated: 0 }]
      }
      handlers.onComplete(result)
      expect(setSyncUiMock).toHaveBeenCalled()
      const calls2 = setSyncUiMock.mock.calls
      const callArg2 = calls2[calls2.length - 1]
      if (!callArg2) throw new Error('setSyncUi not called')
      const stateFn2 = callArg2[0] as unknown as (prev: SyncModalModel) => SyncModalModel
      const next2 = stateFn2(modalState)
      expect(next2.fileLog).toEqual([progressFile])
    })

    it('shows a toast when warnings are present', () => {
      const pushToast = mock()
      const handlers = buildHandlers(closedModal, { pushToast })
      const result: RpcImportResult = {
        filesProcessed: 1,
        inserted: 1,
        updated: 0,
        errors: [],
        warnings: ['hard collision: cmd+space between app-a and app-b (A / B)'],
        fileLog: []
      }
      handlers.onComplete(result)
      expect(pushToast).toHaveBeenCalledWith('Sync finished with 1 collision warning(s).', 'error')
    })
  })
})
