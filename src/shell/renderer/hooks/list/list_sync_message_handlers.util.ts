import type { RpcImportResult, RpcSyncProgressPayload } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { SyncModalModel } from '../../components/shared/sync_modal.component'

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
      setSyncing(false)
      const modalWasOpen = syncModalOpenRef.current
      setSyncUi(prev => {
        if (!prev.open) return prev
        return {
          ...prev,
          phase: 'done',
          processed: result.filesProcessed,
          totalFiles: Math.max(prev.totalFiles, result.filesProcessed),
          summary: result
        }
      })
      if (!modalWasOpen) {
        if (result.errors.length > 0) {
          pushToast(`Sync finished with ${result.errors.length} error(s).`, 'error')
        } else {
          pushToast('Sync finished.', 'success')
        }
      } else if (result.errors.length > 0) {
        pushToast(`Sync finished with ${result.errors.length} error(s).`, 'error')
      }
      fireAndForget(refreshStats())
      fireAndForget(refreshList(false))
    }
  }
}
