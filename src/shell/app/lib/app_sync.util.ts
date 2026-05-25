import fs from 'node:fs/promises'
import type { LogVerbosity } from '@shared/logging'
import type { RpcImportResult, RpcSyncProgressPayload } from '@shared/rpc'
import { ImportService } from '../db/import.service'

type AppLog = ReturnType<typeof import('../../../shared/logging').createLogger>

export type SyncEmitHandlers = {
  syncProgress?: (payload: RpcSyncProgressPayload) => void
  syncComplete?: (result: RpcImportResult) => void
}

export async function runSourceImportSync(args: {
  sourcesDir: string
  dbPath: string
  closeDb: () => void
  invalidateListCache: () => void
  emit: SyncEmitHandlers
  log: AppLog
  verbosity: LogVerbosity
}): Promise<RpcImportResult> {
  const { sourcesDir, dbPath, closeDb, invalidateListCache, emit, log, verbosity } = args
  closeDb()
  if (dbPath !== ':memory:') {
    try {
      await fs.unlink(dbPath)
    } catch {
      /* not found */
    }
    try {
      await fs.unlink(`${dbPath}-wal`)
    } catch {
      /* not found */
    }
    try {
      await fs.unlink(`${dbPath}-shm`)
    } catch {
      /* not found */
    }
  }
  const importer = new ImportService(dbPath, verbosity)
  invalidateListCache()
  const result = await importer.run(sourcesDir, {
    onProgress: (payload: RpcSyncProgressPayload) => {
      emit.syncProgress?.(payload)
    }
  })
  emit.syncComplete?.(result)
  log.phase('import', `sync_complete files=${result.filesProcessed}`, 0)
  return result
}
