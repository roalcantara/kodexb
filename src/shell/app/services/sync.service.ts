import type { RpcImportResult } from '@shared/rpc'
import { getSyncInfoForSourcesDir } from '../lib/sync/info.util'
import { type RunSourceImportSyncTestHooks, runSourceImportSync } from '../lib/sync/sync.service'
import type { LifecycleService } from './lifecycle.service'

export class SyncService {
  constructor(private readonly lifecycle: LifecycleService) {}

  async sync(sourcesDir?: string, testHooks?: RunSourceImportSyncTestHooks): Promise<RpcImportResult> {
    const dir = sourcesDir ?? this.lifecycle.loaded.sources.path
    const dbPath = this.lifecycle.loaded.database.path
    const { raw: dbForSnapshot } = this.lifecycle.getDb()
    this.lifecycle.syncGate.inFlight = true
    try {
      return await runSourceImportSync({
        sourcesDir: dir,
        dbPath,
        dbForSnapshot,
        closeDb: () => this.lifecycle.closeDb(),
        invalidateListCache: () => this.lifecycle.invalidateListCache(),
        emit: this.lifecycle.emit,
        log: this.lifecycle.log,
        testHooks
      })
    } finally {
      this.lifecycle.syncGate.inFlight = false
      this.lifecycle.closeDb()
    }
  }

  async getSyncInfo(): Promise<{ sourcesDir: string; fileCount: number }> {
    return getSyncInfoForSourcesDir(this.lifecycle.loaded.sources.path)
  }
}
