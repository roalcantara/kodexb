import fs from 'node:fs/promises'
import type { Knowledge } from '@core'
import { rankSuggestedTags } from '@core/domain/models/knowledges/tags/rank_suggested_tags.util'
import { getLogger, type LogVerbosity } from '@shared/logging'
import type {
  ConfigPatch,
  ListOpts,
  ListStats,
  OpenDialogOpts,
  PreviewImageResult,
  RpcDbStats,
  RpcGetConfigPayload,
  RpcImportResult,
  RpcListEntry,
  RpcSyncProgressPayload,
  TaskCreateInput,
  TaskUpdateInput
} from '@shared/rpc'
import type { LoadedConfig } from './config/config.loader'
import { saveConfig } from './config/config.loader'
import { type BindingRef, listAllBindings, listBindingsByChord } from './db/binding.repository'
import { recordBindingVisit as persistBindingVisit } from './db/binding_frecency.repository'
import { openDatabase } from './db/client'
import { findAll, findById, getDbStats } from './db/entry.repository'
import { recordEntryVisit as persistEntryVisit } from './db/frecency.repository'
import { countKnowledgeForOpts, listKnowledgeForOpts } from './lib/app_list_query.util'
import { buildListStats } from './lib/app_list_stats.util'
import { buildListStatsForFilters } from './lib/app_list_stats_for_filters.util'
import { fetchPreviewImageFromUrl } from './lib/app_preview_fetch.client'
import type { AppShellHooks } from './lib/shell/shell_hooks.types'
import { createAppShellDelegates } from './lib/app_shell_surface.util'
import { type RunSourceImportSyncTestHooks, runSourceImportSync } from './lib/app_sync.service'
import { getSyncInfoForSourcesDir } from './lib/app_sync_info.util'
import {
  createTask as createTaskMutation,
  cyclePriority as cyclePriorityMutation,
  cycleStatus as cycleStatusMutation,
  deleteTask as deleteTaskMutation,
  reorderTask as reorderTaskMutation,
  updateTask as updateTaskMutation
} from './lib/app_task_mutation.service'
import type { TaskMutationLogContext } from './lib/app_task_source.service'
import { SyncDatabaseBusyError } from './lib/sync_database_busy.error'

export type SyncEmitter = {
  syncProgress?: (payload: RpcSyncProgressPayload) => void
  syncComplete?: (result: RpcImportResult) => void
}

/** Single orchestrator for DB, import, and config. RPC handlers delegate here only. */
export class App {
  private readonly log: ReturnType<typeof getLogger>
  private loaded: LoadedConfig
  private db: ReturnType<typeof openDatabase> | null = null
  private readonly listCache = new Map<string, RpcListEntry[]>()
  private listStatsCache: ListStats | null = null
  private dbStatsCache: RpcDbStats | null = null
  private readonly syncGate = { inFlight: false }
  private readonly emit: SyncEmitter
  private readonly shellDelegates: ReturnType<typeof createAppShellDelegates>

  constructor(
    loaded: LoadedConfig,
    emit: SyncEmitter = {},
    _verbosity: LogVerbosity = 'default',
    shellHooks: AppShellHooks = {}
  ) {
    this.loaded = loaded
    this.emit = emit
    this.shellDelegates = createAppShellDelegates(shellHooks, () => this.loaded)
    this.log = getLogger(['kb', 'app'])
  }

  getLog(): ReturnType<typeof getLogger> {
    return this.log
  }

  getLoadedConfig(): LoadedConfig {
    return this.loaded
  }

  private getDb() {
    return this.getDbForTaskMutation()
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

  getDbForTaskMutation() {
    if (Reflect.get(this.syncGate, 'inFlight') === true) {
      throw new SyncDatabaseBusyError()
    }
    if (!this.db) {
      this.db = openDatabase(this.loaded.database.path)
    }
    return this.db
  }

  private closeDb() {
    if (this.db) {
      this.db.raw.close(true)
      this.db = null
    }
  }

  /** Test-only: exposes the raw SQLite handle for direct queries. */
  getRawDbForTesting(): import('bun:sqlite').Database {
    return this.getDbForTaskMutation().raw
  }

  /** The raw SQLite handle, guarded by the sync gate. Single funnel for reads. */
  private raw(): import('bun:sqlite').Database {
    return this.getDbForTaskMutation().raw
  }

  invalidateListCache() {
    this.listCache.clear()
    this.listStatsCache = null
    this.dbStatsCache = null
  }

  list(opts: ListOpts = {}): Promise<RpcListEntry[]> {
    const raw = this.raw()
    return Promise.resolve(listKnowledgeForOpts(raw, this.loaded, opts, this.listCache))
  }
  listMatchCount(opts: ListOpts = {}): Promise<number> {
    const raw = this.raw()
    return Promise.resolve(countKnowledgeForOpts(raw, this.loaded, opts))
  }
  getEntry(id: number): Promise<Knowledge | null> {
    const raw = this.raw()
    return Promise.resolve(findById(raw, id))
  }

  recordEntryVisit(id: number): Promise<{ ok: true }> {
    const raw = this.raw()
    persistEntryVisit(raw, id)
    this.invalidateListCache()
    return Promise.resolve({ ok: true })
  }

  listBindings(): Promise<BindingRef[]> {
    const raw = this.raw()
    return Promise.resolve(listAllBindings(raw))
  }

  listBindingsByChord(hash: string): Promise<BindingRef[]> {
    const raw = this.raw()
    return Promise.resolve(listBindingsByChord(raw, hash))
  }

  recordBindingVisit(id: string, weight: number): Promise<{ ok: true }> {
    const raw = this.raw()
    persistBindingVisit(raw, id, weight)
    return Promise.resolve({ ok: true })
  }

  getListStats(filters: Partial<Pick<ListOpts, 'query' | 'tags' | 'types' | 'taskView'>> = {}): Promise<ListStats> {
    const hasContext =
      (filters.query !== undefined && filters.query.trim() !== '') ||
      (filters.types?.length ?? 0) > 0 ||
      (filters.tags?.length ?? 0) > 0 ||
      filters.taskView !== undefined

    const raw = this.raw()

    if (!hasContext) {
      if (this.listStatsCache) return Promise.resolve(this.listStatsCache)
      this.listStatsCache = buildListStats(raw)
      return Promise.resolve(this.listStatsCache)
    }

    return Promise.resolve(buildListStatsForFilters(raw, this.loaded, filters))
  }

  async sync(sourcesDir?: string, testHooks?: RunSourceImportSyncTestHooks): Promise<RpcImportResult> {
    const dir = sourcesDir ?? this.loaded.sources.path
    const dbPath = this.loaded.database.path
    const { raw: dbForSnapshot } = this.getDb()
    this.syncGate.inFlight = true
    try {
      return await runSourceImportSync({
        sourcesDir: dir,
        dbPath,
        dbForSnapshot,
        closeDb: () => this.closeDb(),
        invalidateListCache: () => this.invalidateListCache(),
        emit: this.emit,
        log: this.log,
        testHooks
      })
    } finally {
      this.syncGate.inFlight = false
      this.closeDb()
    }
  }

  async getStats(): Promise<RpcDbStats> {
    if (this.dbStatsCache) return this.dbStatsCache
    const raw = this.raw()
    const stats = getDbStats(raw)
    let dbSize = 0
    try {
      const stat = await fs.stat(this.loaded.database.path)
      dbSize = stat.size
    } catch {
      dbSize = 0
    }
    this.dbStatsCache = {
      total: stats.total,
      byType: stats.byType,
      dbPath: this.loaded.database.path,
      dbSize
    }
    return this.dbStatsCache
  }

  getConfig(): Promise<RpcGetConfigPayload> {
    return Promise.resolve({
      configPath: this.loaded.configPath,
      database: { path: this.loaded.database.path },
      sources: { path: this.loaded.sources.path },
      display: { ...this.loaded.display }
    })
  }

  getSyncInfo(): Promise<{ sourcesDir: string; fileCount: number }> {
    return getSyncInfoForSourcesDir(this.loaded.sources.path)
  }

  async applyConfigPatch(patch: ConfigPatch): Promise<RpcGetConfigPayload> {
    const pageSizeStr = patch.pageSize === undefined ? undefined : String(patch.pageSize)
    this.loaded = await saveConfig(this.loaded, {
      sourcesDir: patch.sourcesDir,
      dbPath: patch.dbPath,
      terminalApp: patch.terminalApp,
      editorApp: patch.editorApp,
      pageSize: pageSizeStr
    })
    if (patch.dbPath !== undefined) {
      this.closeDb()
    }
    this.invalidateListCache()
    return this.getConfig()
  }

  async createTask(input: TaskCreateInput, context?: TaskMutationLogContext): Promise<Knowledge> {
    return await createTaskMutation(this, input, context)
  }

  async updateTask(id: number, patch: TaskUpdateInput, context?: TaskMutationLogContext): Promise<Knowledge> {
    return await updateTaskMutation(this, id, patch, context)
  }

  async deleteTask(id: number, context?: TaskMutationLogContext): Promise<void> {
    return await deleteTaskMutation(this, id, context)
  }

  async cycleStatus(id: number, dir: 'forward' | 'backward', context?: TaskMutationLogContext): Promise<Knowledge> {
    return await cycleStatusMutation(this, id, dir, context)
  }

  async cyclePriority(id: number, dir: 'forward' | 'backward', context?: TaskMutationLogContext): Promise<Knowledge> {
    return await cyclePriorityMutation(this, id, dir, context)
  }

  async reorderTask(id: number, dir: 'up' | 'down', context?: TaskMutationLogContext): Promise<Knowledge[]> {
    return await reorderTaskMutation(this, id, dir, context)
  }

  openExternal(url: string): Promise<void> {
    return this.shellDelegates.openExternal(url)
  }
  pasteInTerminal(cmd: string): Promise<void> {
    return this.shellDelegates.pasteInTerminal(cmd)
  }
  runInTerminal(cmd: string): Promise<void> {
    return this.shellDelegates.runInTerminal(cmd)
  }
  pasteDoc(doc: string): Promise<void> {
    return this.shellDelegates.pasteDoc(doc)
  }
  openInEditor(filePath: string): Promise<void> {
    return this.shellDelegates.openInEditor(filePath)
  }
  showOpenDialog(opts?: OpenDialogOpts): Promise<string | null> {
    return this.shellDelegates.showOpenDialog(opts)
  }
  fetchPreviewImage(url: string): Promise<PreviewImageResult | null> {
    return fetchPreviewImageFromUrl(url)
  }
  async suggestTags(entryId: number): Promise<string[]> {
    const entry = await this.getEntry(entryId)
    if (!entry) return []
    const raw = this.raw()
    const allEntries = findAll(raw, { limit: -1, offset: 0 })
    return rankSuggestedTags(entry, allEntries)
  }

  resizeWindow(width: number, height: number): Promise<void> {
    return this.shellDelegates.resizeWindow(width, height)
  }
  hideWindow(): Promise<void> {
    return this.shellDelegates.hideWindow()
  }
  getWindowPosition(): Promise<{ x: number; y: number } | null> {
    return this.shellDelegates.getWindowPosition()
  }
  setWindowPosition(x: number, y: number): Promise<void> {
    return this.shellDelegates.setWindowPosition(x, y)
  }
  quit(): Promise<void> {
    return this.shellDelegates.quit()
  }
}
