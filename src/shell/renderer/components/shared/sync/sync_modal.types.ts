import type { RpcImportResult, RpcSyncFileResult } from '@shared/rpc'

export type SyncModalPhase = 'preparing' | 'active' | 'done' | 'failed'

export type SyncModalModel = {
  open: boolean
  phase: SyncModalPhase
  sourcesDir: string
  totalFiles: number
  processed: number
  fileLog: RpcSyncFileResult[]
  summary: RpcImportResult | null
  failMessage: string | null
}

export type SyncModalProps = {
  model: SyncModalModel
  onDismiss: () => void
}
