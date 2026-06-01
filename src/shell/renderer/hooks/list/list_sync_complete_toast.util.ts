import type { RpcImportResult } from '@shared/rpc'

export type SyncCompleteToast = { message: string; type: 'success' | 'error' }

function syncIssueToast(result: RpcImportResult): SyncCompleteToast | null {
  if (result.errors.length > 0) {
    return { message: `Sync finished with ${result.errors.length} error(s).`, type: 'error' }
  }
  if (result.warnings.length > 0) {
    return { message: `Sync finished with ${result.warnings.length} collision warning(s).`, type: 'error' }
  }
  return null
}

export function syncCompleteToastForResult(result: RpcImportResult, modalWasOpen: boolean): SyncCompleteToast | null {
  const issueToast = syncIssueToast(result)
  if (!modalWasOpen) {
    return issueToast ?? { message: 'Sync finished.', type: 'success' }
  }
  return issueToast
}
