import { describe, expect, it } from 'bun:test'
import type { RpcImportResult } from '@shared/rpc'
import { notifyAfterSyncComplete, onAfterSyncComplete } from './client_sync_complete.util'

describe('client_sync_complete.util', () => {
  it('notifies registered after-sync listeners', () => {
    const results: RpcImportResult[] = []
    const unsub = onAfterSyncComplete(r => results.push(r))
    const result: RpcImportResult = {
      filesProcessed: 1,
      inserted: 1,
      updated: 0,
      errors: [],
      warnings: [],
      fileLog: []
    }
    notifyAfterSyncComplete(result)
    unsub()
    expect(results).toEqual([result])
  })
})
