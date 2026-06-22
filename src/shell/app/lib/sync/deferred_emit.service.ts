import type { RpcSyncProgressPayload } from '@shared/rpc'
import type { SyncEmitter } from '../../app'

export function createDeferredSyncEmit<Rpc>(
  getWebviewRpc: () => Rpc | null,
  mkSyncEmitter: (rpc: Rpc) => Required<SyncEmitter>
): Required<SyncEmitter> {
  return {
    syncProgress: (payload: RpcSyncProgressPayload) => {
      const rpc = getWebviewRpc()
      if (rpc) mkSyncEmitter(rpc).syncProgress(payload)
    },
    syncComplete: result => {
      const rpc = getWebviewRpc()
      if (rpc) mkSyncEmitter(rpc).syncComplete(result)
    }
  }
}
