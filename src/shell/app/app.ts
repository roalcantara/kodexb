import type { Knowledge } from '@core'
import { createLogger } from '@shared/logging'
import type {
  ConfigPatch,
  ListOpts,
  ListStats,
  OpenDialogOpts,
  PreviewImageResult,
  RpcDbStats,
  RpcGetConfigPayload,
  RpcImportResult,
  TaskCreateInput,
  TaskUpdateInput
} from '@shared/rpc'
import type { LoadedConfig } from './config/config.loader'
import { saveConfig } from './config/config.loader'
import { openDatabase } from './db/client'
import { type FindAllOpts, findAll, findById, getDbStats, getTagCounts } from './db/entry.repository'
import { ImportService } from './db/import.service'
import { countTasksByView, filterKnowledgeByTaskView } from './lib/task_views.util'

type TaskKnowledge = Extract<Knowledge, { type: 'task' }>

/** Fallback when `display.pageSize` is missing or invalid (matches common YAML default). */
const DEFAULT_LIST_PAGE_SIZE = 50

function isTask(k: Knowledge): k is TaskKnowledge {
  return k.type === 'task'
}

function stableListCacheKey(opts: ListOpts): string {
  return JSON.stringify(opts)
}

function toFindAllOpts(opts: ListOpts): FindAllOpts {
  return {
    query: opts.query,
    tags: opts.tags,
    types: opts.types,
    limit: opts.limit,
    offset: opts.offset
  }
}

export type SyncEmitter = {
  syncProgress?: (processed: number, total: number) => void
  syncComplete?: (result: RpcImportResult) => void
}

/** Optional native hooks (mutate after `BrowserWindow` construction). */
export type AppShellHooks = {
  resizeWindow?: (width: number, height: number) => void
  openExternal?: (url: string) => void
  showOpenDialog?: (opts?: OpenDialogOpts) => Promise<string | null>
}

const OG_IMAGE_RE = /<meta\s+[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i
const OG_IMAGE_REVERSE_RE = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["'][^>]*>/i
const YOUTUBE_ID_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/
const OG_FETCH_TIMEOUT_MS = 5_000

function youtubePreviewImage(url: string): PreviewImageResult | null {
  const id = YOUTUBE_ID_RE.exec(url)?.[1]
  return id ? { url: `https://img.youtube.com/vi/${id}/mqdefault.jpg` } : null
}

function previewImageFromHtml(html: string, baseUrl: string): PreviewImageResult | null {
  const image = OG_IMAGE_RE.exec(html)?.[1] ?? OG_IMAGE_REVERSE_RE.exec(html)?.[1]
  if (!image) return null
  try {
    return { url: new URL(image, baseUrl).toString() }
  } catch {
    return null
  }
}

/**
 * Single orchestrator for DB, import, and config. RPC handlers delegate here only.
 */
export class App {
  private readonly log: ReturnType<typeof createLogger>
  private loaded: LoadedConfig
  private db: ReturnType<typeof openDatabase> | null = null
  private readonly listCache = new Map<string, Knowledge[]>()
  private listStatsCache: ListStats | null = null
  private dbStatsCache: RpcDbStats | null = null
  private readonly emit: SyncEmitter
  private readonly shellHooks: AppShellHooks

  constructor(loaded: LoadedConfig, emit: SyncEmitter = {}, debug = false, shellHooks: AppShellHooks = {}) {
    this.loaded = loaded
    this.emit = emit
    this.shellHooks = shellHooks
    this.log = createLogger({ debug })
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

  list(opts: ListOpts = {}): Promise<Knowledge[]> {
    const { raw } = this.getDb()
    const pageSize = Number.parseInt(this.loaded.display.pageSize, 10)
    const safePage = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : DEFAULT_LIST_PAGE_SIZE
    const limit = opts.limit ?? safePage
    const offset = opts.offset ?? 0

    if (opts.taskView) {
      if (opts.types?.length && !opts.types.includes('task')) {
        return Promise.resolve([])
      }
      const base = findAll(raw, {
        query: opts.query,
        tags: opts.tags,
        types: opts.types?.length ? opts.types : ['task'],
        limit: -1,
        offset: 0
      })
      const filtered = filterKnowledgeByTaskView(base, opts.taskView)
      return Promise.resolve(filtered.slice(offset, offset + limit))
    }

    const cacheKey = stableListCacheKey({ ...opts, limit, offset })
    const hit = this.listCache.get(cacheKey)
    if (hit) return Promise.resolve(hit)

    const rows = findAll(raw, { ...toFindAllOpts(opts), limit, offset })
    this.listCache.set(cacheKey, rows)
    return Promise.resolve(rows)
  }

  getEntry(id: number): Promise<Knowledge | null> {
    const { raw } = this.getDb()
    return Promise.resolve(findById(raw, id))
  }

  getListStats(): Promise<ListStats> {
    if (this.listStatsCache) return Promise.resolve(this.listStatsCache)
    const { raw } = this.getDb()
    const stats = getDbStats(raw)
    const tags = getTagCounts(raw)
    const tasks = findAll(raw, { types: ['task'], limit: -1, offset: 0 }).filter(isTask)
    const taskViews = countTasksByView(tasks)
    this.listStatsCache = {
      total: stats.total,
      bookmark: stats.byType.bookmark ?? 0,
      command: stats.byType.command ?? 0,
      cheat: stats.byType.cheat ?? 0,
      task: stats.byType.task ?? 0,
      taskViews,
      tags,
      byType: stats.byType
    }
    return Promise.resolve(this.listStatsCache)
  }

  async sync(sourcesDir?: string): Promise<RpcImportResult> {
    const dir = sourcesDir ?? this.loaded.sources.path
    const importer = new ImportService(this.loaded.database.path)
    this.invalidateListCache()
    const result = await importer.run(dir, {
      onProgress: (processed, total) => {
        this.emit.syncProgress?.(processed, total)
      }
    })
    this.emit.syncComplete?.(result)
    this.log.phase('import', `sync_complete files=${result.filesProcessed}`, 0)
    return result
  }

  getStats(): Promise<RpcDbStats> {
    if (this.dbStatsCache) return Promise.resolve(this.dbStatsCache)
    const { raw } = this.getDb()
    this.dbStatsCache = getDbStats(raw)
    return Promise.resolve(this.dbStatsCache)
  }

  getConfig(): Promise<RpcGetConfigPayload> {
    return Promise.resolve({
      configPath: this.loaded.configPath,
      database: { path: this.loaded.database.path },
      sources: { path: this.loaded.sources.path },
      display: { ...this.loaded.display }
    })
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

  private static rejectNotImplemented(method: string): Promise<never> {
    return Promise.reject(new Error(`Not implemented: ${method}`))
  }

  createTask(_input: TaskCreateInput): Promise<Knowledge> {
    return App.rejectNotImplemented('createTask')
  }

  updateTask(_id: number, _patch: TaskUpdateInput): Promise<Knowledge> {
    return App.rejectNotImplemented('updateTask')
  }

  deleteTask(_id: number): Promise<void> {
    return App.rejectNotImplemented('deleteTask')
  }

  cycleStatus(_id: number, _dir: 'forward' | 'backward'): Promise<Knowledge> {
    return App.rejectNotImplemented('cycleStatus')
  }

  cyclePriority(_id: number, _dir: 'forward' | 'backward'): Promise<Knowledge> {
    return App.rejectNotImplemented('cyclePriority')
  }

  reorderTask(_id: number, _dir: 'up' | 'down'): Promise<void> {
    return App.rejectNotImplemented('reorderTask')
  }

  openExternal(url: string): Promise<void> {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch (err) {
      return Promise.reject(err)
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return Promise.reject(new Error(`Unsupported URL protocol: ${parsed.protocol}`))
    }
    this.shellHooks.openExternal?.(parsed.toString())
    return Promise.resolve()
  }

  pasteInTerminal(_cmd: string): Promise<void> {
    return App.rejectNotImplemented('pasteInTerminal')
  }

  openInEditor(_filePath: string): Promise<void> {
    return App.rejectNotImplemented('openInEditor')
  }

  showOpenDialog(opts?: OpenDialogOpts): Promise<string | null> {
    const fn = this.shellHooks.showOpenDialog
    if (!fn) {
      return App.rejectNotImplemented('showOpenDialog')
    }
    return fn(opts)
  }

  async fetchPreviewImage(url: string): Promise<PreviewImageResult | null> {
    const parsed = new URL(url)
    const youtube = youtubePreviewImage(parsed.toString())
    if (youtube) return youtube

    const res = await fetch(parsed, { signal: AbortSignal.timeout(OG_FETCH_TIMEOUT_MS) }).catch(() => null)
    if (!res?.ok) return null
    const html = await res.text().catch(() => '')
    return previewImageFromHtml(html, parsed.toString())
  }

  suggestTags(_entryId: number): Promise<string[]> {
    return App.rejectNotImplemented('suggestTags')
  }

  resizeWindow(width: number, height: number): Promise<void> {
    const fn = this.shellHooks.resizeWindow
    if (!fn) {
      return App.rejectNotImplemented('resizeWindow')
    }
    fn(width, height)
    return Promise.resolve()
  }
}
