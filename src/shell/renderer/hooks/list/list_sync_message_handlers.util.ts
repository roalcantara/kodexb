import type { RpcImportResult, RpcSyncProgressPayload } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { SyncModalModel } from '../../components/shared/sync_modal.component'
import { syncCompleteToastForResult } from './list_sync_complete_toast.util'

export type ListSyncMessageHandlerDeps = {
  setSyncUi: Dispatch<SetStateAction<SyncModalModel>>
  setSyncing: (v: boolean) => void
  syncModalOpenRef: RefObject<boolean>
  pushToast: (message: string, type?: 'success' | 'error') => void
  refreshStats: () => Promise<void>
  refreshList: (append: boolean) => Promise<void>
}

/** Handlers passed to `setSyncMessageHandlers` (main → renderer sync push). */
export function listSyncMessageHandlers(deps: ListSyncMessageHandlerDeps) {
  const { setSyncUi, setSyncing, syncModalOpenRef, pushToast, refreshStats, refreshList } = deps
  let completed = false

  return {
    onProgress: (p: RpcSyncProgressPayload) => {
      setSyncUi(prev => {
        if (!prev.open) return prev
        const nextLog = p.recentFile ? [...prev.fileLog, p.recentFile] : prev.fileLog
        return {
          ...prev,
          phase: 'active',
          totalFiles: p.total > 0 ? p.total : prev.totalFiles,
          processed: p.processed,
          fileLog: nextLog
        }
      })
    },
    onComplete: (result: RpcImportResult) => {
      if (completed) return
      completed = true
      setSyncing(false)
      const modalWasOpen = syncModalOpenRef.current
      setSyncUi(prev => {
        if (!prev.open) return prev
        return {
          ...prev,
          phase: 'done',
          processed: result.filesProcessed,
          totalFiles: Math.max(prev.totalFiles, result.filesProcessed),
          fileLog: prev.fileLog.length > 0 ? prev.fileLog : (result.fileLog ?? []),
          summary: result
        }
      })
      const toast = syncCompleteToastForResult(result, modalWasOpen)
      if (toast) pushToast(toast.message, toast.type)
      fireAndForget(refreshStats())
      fireAndForget(refreshList(false))
    }
  }
}
