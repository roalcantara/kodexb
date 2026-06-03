import type { Database } from 'bun:sqlite'
import fs from 'node:fs/promises'
import type { RpcImportResult, RpcSyncProgressPayload } from '@shared/rpc'
import { openDatabase } from '../db/client'
import { ImportService } from '../db/import.service'
import { exportLearnedSnapshot, restoreLearnedSnapshot } from './frecency_snapshot.util'

type AppLog = ReturnType<typeof import('../../../shared/logging').getLogger>

export type SyncEmitHandlers = {
  syncProgress?: (payload: RpcSyncProgressPayload) => void
  syncComplete?: (result: RpcImportResult) => void
}

/** Test-only hooks for partial-import and failure semantics (SF-3 AC4). */
export type RunSourceImportSyncTestHooks = {
  maxBundlesToProcess?: number
  throwAfterImport?: boolean
}

export async function runSourceImportSync(args: {
  sourcesDir: string
  dbPath: string
  dbForSnapshot: Database
  closeDb: () => void
  invalidateListCache: () => void
  emit: SyncEmitHandlers
  log: AppLog
  testHooks?: RunSourceImportSyncTestHooks
}): Promise<RpcImportResult> {
  const { sourcesDir, dbPath, dbForSnapshot, closeDb, invalidateListCache, emit, log, testHooks } = args

  const snapshot = exportLearnedSnapshot(dbForSnapshot)
  log.info('frecency_snapshot_export entry_count={entry_count} binding_count={binding_count}', {
    entry_count: snapshot.entries.length,
    binding_count: snapshot.bindings.length
  })

  let result!: RpcImportResult

  try {
    closeDb()
    if (dbPath !== ':memory:') {
      await Promise.all(['', '-wal', '-shm'].map(suffix => fs.unlink(`${dbPath}${suffix}`).catch(() => undefined)))
    }

    invalidateListCache()
    const importer = new ImportService(dbPath)
    result = await importer.run(sourcesDir, {
      onProgress: (payload: RpcSyncProgressPayload) => {
        emit.syncProgress?.(payload)
      },
      maxBundles: testHooks?.maxBundlesToProcess
    })

    if (testHooks?.throwAfterImport) {
      throw new Error('runSourceImportSync test hook: throwAfterImport')
    }
  } finally {
    const { raw } = openDatabase(dbPath)
    try {
      const restoreCounts = restoreLearnedSnapshot(raw, snapshot)
      log.info(
        'frecency_snapshot_restore entry_restored={entry_restored} entry_skipped={entry_skipped} binding_restored={binding_restored} binding_skipped={binding_skipped}',
        {
          entry_restored: restoreCounts.entryRestored,
          entry_skipped: restoreCounts.entrySkipped,
          binding_restored: restoreCounts.bindingRestored,
          binding_skipped: restoreCounts.bindingSkipped
        }
      )
    } finally {
      raw.close(true)
    }
  }

  emit.syncComplete?.(result)
  log.info('{phase} label={label} dur_ms={dur_ms}', {
    phase: 'import',
    label: `sync_complete files=${result.filesProcessed}`,
    dur_ms: '0.00'
  })
  return result
}
