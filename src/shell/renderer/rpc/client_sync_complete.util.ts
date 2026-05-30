import type { RpcImportResult } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'

const afterSyncCompleteListeners: Array<(result: RpcImportResult) => void> = []

export function onAfterSyncComplete(cb: (result: RpcImportResult) => void): () => void {
  afterSyncCompleteListeners.push(cb)
  return () => {
    const idx = afterSyncCompleteListeners.indexOf(cb)
    if (idx !== -1) afterSyncCompleteListeners.splice(idx, 1)
  }
}

export function notifyAfterSyncComplete(result: RpcImportResult): void {
  for (const cb of afterSyncCompleteListeners) {
    fireAndForget(Promise.resolve(cb(result)))
  }
}
