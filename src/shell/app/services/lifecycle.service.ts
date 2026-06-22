import type { Database } from 'bun:sqlite'
import { getLogger } from '@shared/logging'
import type { RpcImportResult, RpcListEntry, RpcSyncProgressPayload } from '@shared/rpc'
import type { LoadedConfig } from '../config/config.loader'
import { type DbHandle, openDatabase } from '../db/client'
import { SyncDatabaseBusyError } from '../lib/sync/database_busy.error'

export type SyncEmitter = {
  syncProgress?: (payload: RpcSyncProgressPayload) => void
  syncComplete?: (result: RpcImportResult) => void
}

export class LifecycleService {
  readonly log: ReturnType<typeof getLogger>
  private _loaded: LoadedConfig
  private _db: DbHandle | null = null
  readonly listCache = new Map<string, RpcListEntry[]>()
  listStatsCache: import('@shared/rpc').ListStats | null = null
  dbStatsCache: import('@shared/rpc').RpcDbStats | null = null
  readonly syncGate = { inFlight: false }
  readonly emit: SyncEmitter

  constructor(loaded: LoadedConfig, emit: SyncEmitter = {}, log?: ReturnType<typeof getLogger>) {
    this._loaded = loaded
    this.emit = emit
    this.log = log ?? getLogger(['kb', 'app'])
  }

  get loaded(): LoadedConfig {
    return this._loaded
  }

  set loaded(v: LoadedConfig) {
    this._loaded = v
  }

  getDb() {
    return this.getDbForTaskMutation()
  }

  getDbForTaskMutation() {
    if (Reflect.get(this.syncGate, 'inFlight') === true) {
      throw new SyncDatabaseBusyError()
    }
    if (!this._db) {
      this._db = openDatabase(this._loaded.database.path)
    }
    return this._db
  }

  getRawDbForTesting(): Database {
    return this.getDbForTaskMutation().raw
  }

  closeDb() {
    if (this._db) {
      this._db.raw.close(true)
      this._db = null
    }
  }

  invalidateListCache() {
    this.listCache.clear()
    this.listStatsCache = null
    this.dbStatsCache = null
  }

  taskProjectionWriteError(
    operation: 'create' | 'update' | 'delete' | 'reorder',
    taskKey: string,
    cause: unknown
  ): Error {
    const error = new Error(`Projection ${operation} failed for task "${taskKey}"`, { cause })
    error.name = 'TaskProjectionWriteError'
    return error
  }
}
