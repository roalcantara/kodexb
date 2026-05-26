import fs from 'node:fs/promises'
import type { Entry, Knowledge, TaskEntry } from '@core'
import { toKnowledge } from '@core'
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
import glob from 'fast-glob'
import type { LoadedConfig } from './config/config.loader'
import { saveConfig } from './config/config.loader'
import { openDatabase } from './db/client'
import { deleteById, findAll, findById, getDbStats, upsert } from './db/entry.repository'
import { recordEntryVisit as persistEntryVisit } from './db/frecency.repository'
import { maxTaskOrder, updateTaskOrder } from './db/task.repository'
import { countKnowledgeForOpts, listKnowledgeForOpts } from './lib/app_list_query.util'
import { buildListStats } from './lib/app_list_stats.util'
import { buildListStatsForFilters } from './lib/app_list_stats_for_filters.util'
import { fetchPreviewImageFromUrl } from './lib/app_preview_fetch.util'
import type { AppShellHooks } from './lib/app_shell_hooks.types'
import {
  getWindowPositionFor,
  hideWindowFor,
  openExternalUrl,
  openInEditorFor,
  pasteInTerminalFor,
  quitFor,
  resizeWindowFor,
  setWindowPositionFor,
  showOpenDialogFor
} from './lib/app_shell_surface.util'
import { runSourceImportSync } from './lib/app_sync.util'
import { removeTaskFromSource, writeTaskToSource } from './lib/app_task_source.util'

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
  private readonly emit: SyncEmitter
  private readonly shellHooks: AppShellHooks

  constructor(
    loaded: LoadedConfig,
    emit: SyncEmitter = {},
    _verbosity: LogVerbosity = 'default',
    shellHooks: AppShellHooks = {}
  ) {
    this.loaded = loaded
    this.emit = emit
    this.shellHooks = shellHooks
    this.log = getLogger(['kb', 'app'])
  }

  private getDb() {
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

  invalidateListCache() {
    this.listCache.clear()
    this.listStatsCache = null
    this.dbStatsCache = null
  }

  list(opts: ListOpts = {}): Promise<RpcListEntry[]> {
    const { raw } = this.getDb()
    return Promise.resolve(listKnowledgeForOpts(raw, this.loaded, opts, this.listCache))
  }
  listMatchCount(opts: ListOpts = {}): Promise<number> {
    const { raw } = this.getDb()
    return Promise.resolve(countKnowledgeForOpts(raw, this.loaded, opts))
  }
  getEntry(id: number): Promise<Knowledge | null> {
    const { raw } = this.getDb()
    return Promise.resolve(findById(raw, id))
  }

  recordEntryVisit(id: number): Promise<{ ok: true }> {
    const { raw } = this.getDb()
    persistEntryVisit(raw, id)
    this.invalidateListCache()
    return Promise.resolve({ ok: true })
  }

  getListStats(filters: Partial<Pick<ListOpts, 'query' | 'tags' | 'types' | 'taskView'>> = {}): Promise<ListStats> {
    const hasContext =
      (filters.query !== undefined && filters.query.trim() !== '') ||
      (filters.types?.length ?? 0) > 0 ||
      (filters.tags?.length ?? 0) > 0 ||
      filters.taskView !== undefined

    const { raw } = this.getDb()

    if (!hasContext) {
      if (this.listStatsCache) return Promise.resolve(this.listStatsCache)
      this.listStatsCache = buildListStats(raw)
      return Promise.resolve(this.listStatsCache)
    }

    return Promise.resolve(buildListStatsForFilters(raw, this.loaded, filters))
  }

  sync(sourcesDir?: string): Promise<RpcImportResult> {
    const dir = sourcesDir ?? this.loaded.sources.path
    const dbPath = this.loaded.database.path
    return runSourceImportSync({
      sourcesDir: dir,
      dbPath,
      closeDb: () => this.closeDb(),
      invalidateListCache: () => this.invalidateListCache(),
      emit: this.emit,
      log: this.log
    })
  }

  async getStats(): Promise<RpcDbStats> {
    if (this.dbStatsCache) return this.dbStatsCache
    const { raw } = this.getDb()
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

  async getSyncInfo(): Promise<{ sourcesDir: string; fileCount: number }> {
    const sourcesDir = this.loaded.sources.path
    let fileCount = 0
    try {
      const files = await glob('**/*.{yaml,yml}', { cwd: sourcesDir, absolute: true })
      fileCount = files.length
    } catch {
      fileCount = 0
    }
    return { sourcesDir, fileCount }
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

  async createTask(input: TaskCreateInput): Promise<Knowledge> {
    const { raw } = this.getDb()
    const order = maxTaskOrder(raw)
    const now = Date.now()
    const entry: Entry = {
      type: 'task',
      key: input.key,
      source: this.loaded.writeTarget,
      desc: input.desc ?? '',
      tags: input.tags ?? [],
      priority: input.priority ?? 'mid',
      status: 'todo',
      dueDate: input.dueDate,
      taskOrder: order,
      dependsOn: input.dependsOn
    } as Entry
    const knowledge = toKnowledge(entry, now)
    upsert(raw, knowledge)
    await writeTaskToSource(this.log, this.loaded.writeTarget, knowledge)
    this.invalidateListCache()
    return knowledge
  }

  async updateTask(id: number, patch: TaskUpdateInput): Promise<Knowledge> {
    const existing = await this.getEntry(id)
    if (!existing || existing.type !== 'task') throw new Error(`Task ${id} not found`)
    const merged = { ...existing, ...patch, updatedAt: Date.now() }
    const { raw } = this.getDb()
    upsert(raw, merged)
    await writeTaskToSource(this.log, merged.source, merged)
    this.invalidateListCache()
    return merged
  }

  async deleteTask(id: number): Promise<void> {
    const existing = await this.getEntry(id)
    if (!existing || existing.type !== 'task') throw new Error(`Task ${id} not found`)
    const { raw } = this.getDb()
    deleteById(raw, id)
    await removeTaskFromSource(this.log, existing.key, existing.source)
    this.invalidateListCache()
  }

  async cycleStatus(id: number, dir: 'forward' | 'backward'): Promise<Knowledge> {
    const values: TaskEntry['status'][] = ['todo', 'doing', 'done']
    const existing = await this.getEntry(id)
    if (!existing || existing.type !== 'task') throw new Error(`Task ${id} not found`)
    const idx = values.indexOf(existing.status)
    const delta = dir === 'forward' ? 1 : -1
    const next = values[(idx + delta + values.length) % values.length]
    if (!next) throw new Error(`Invalid status cycle: ${values.join(',')} at index ${idx}`)
    return this.updateTask(id, { status: next })
  }

  async cyclePriority(id: number, dir: 'forward' | 'backward'): Promise<Knowledge> {
    const values: NonNullable<TaskEntry['priority']>[] = ['low', 'mid', 'high', 'urgent']
    const existing = await this.getEntry(id)
    if (!existing || existing.type !== 'task') throw new Error(`Task ${id} not found`)
    const current = existing.priority ?? 'mid'
    const idx = values.indexOf(current)
    const delta = dir === 'forward' ? 1 : -1
    const next = values[(idx + delta + values.length) % values.length]
    if (!next) throw new Error(`Invalid priority cycle: ${values.join(',')} at index ${idx}`)
    return this.updateTask(id, { priority: next })
  }

  async reorderTask(id: number, dir: 'up' | 'down'): Promise<Knowledge[]> {
    const { raw } = this.getDb()
    const affected = updateTaskOrder(raw, id, dir)
    if (affected.length === 0) return []
    const writes = affected.map(async ({ id: affectedId }) => {
      const entry = findById(raw, affectedId)
      if (entry) {
        await writeTaskToSource(this.log, entry.source, entry)
        return entry
      }
      return null
    })
    const settled = await Promise.all(writes)
    const results: Knowledge[] = settled.filter((e): e is Knowledge => e !== null)
    this.invalidateListCache()
    return results
  }

  openExternal(url: string): Promise<void> {
    return openExternalUrl(this.shellHooks, url)
  }

  pasteInTerminal(cmd: string): Promise<void> {
    return pasteInTerminalFor(this.shellHooks, cmd, this.loaded.display.terminalApp)
  }

  openInEditor(filePath: string): Promise<void> {
    return openInEditorFor(this.shellHooks, filePath, this.loaded.display.editorApp)
  }

  showOpenDialog(opts?: OpenDialogOpts): Promise<string | null> {
    return showOpenDialogFor(this.shellHooks, opts)
  }

  fetchPreviewImage(url: string): Promise<PreviewImageResult | null> {
    return fetchPreviewImageFromUrl(url)
  }

  async suggestTags(entryId: number): Promise<string[]> {
    const entry = await this.getEntry(entryId)
    if (!entry) return []
    const { raw } = this.getDb()
    const allEntries = findAll(raw, { limit: -1, offset: 0 })
    return rankSuggestedTags(entry, allEntries)
  }

  resizeWindow(width: number, height: number): Promise<void> {
    return resizeWindowFor(this.shellHooks, width, height)
  }

  hideWindow(): Promise<void> {
    return hideWindowFor(this.shellHooks)
  }

  getWindowPosition(): Promise<{ x: number; y: number } | null> {
    return getWindowPositionFor(this.shellHooks)
  }

  setWindowPosition(x: number, y: number): Promise<void> {
    return setWindowPositionFor(this.shellHooks, x, y)
  }

  quit(): Promise<void> {
    return quitFor(this.shellHooks)
  }
}
