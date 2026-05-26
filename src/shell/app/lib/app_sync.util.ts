import fs from 'node:fs/promises'
import type { RpcImportResult, RpcSyncProgressPayload } from '@shared/rpc'
import { ImportService } from '../db/import.service'

type AppLog = ReturnType<typeof import('../../../shared/logging').getLogger>

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
}): Promise<RpcImportResult> {
  const { sourcesDir, dbPath, closeDb, invalidateListCache, emit, log } = args
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
  const importer = new ImportService(dbPath)
  invalidateListCache()
  const result = await importer.run(sourcesDir, {
    onProgress: (payload: RpcSyncProgressPayload) => {
      emit.syncProgress?.(payload)
    }
  })
  emit.syncComplete?.(result)
  log.info('{phase} label={label} dur_ms={dur_ms}', {
    phase: 'import',
    label: `sync_complete files=${result.filesProcessed}`,
    dur_ms: '0.00'
  })
  return result
}
