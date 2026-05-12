// biome-ignore lint/nursery/noExcessiveLinesPerFile: pre-existing pattern outside Phase 9 scope
import fs from 'node:fs/promises'
import type { Entry, Knowledge, TaskEntry } from '../../core'
import { toKnowledge } from '../../core'
import { createLogger } from '../../shared/logging'
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
} from '../../shared/rpc'
import type { LoadedConfig } from './config/config.loader'
import { saveConfig } from './config/config.loader'
import { openDatabase } from './db/client'
import {
  deleteById,
  type FindAllOpts,
  findAll,
  findById,
  getDbStats,
  getTagCounts,
  upsert
} from './db/entry.repository'
import { ImportService } from './db/import.service'
import { maxTaskOrder, updateTaskOrder } from './db/task.repository'
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
  pasteInTerminal?: (cmd: string, terminalApp?: string) => void
  openInEditor?: (filePath: string, editorApp?: string) => void
}

const OG_IMAGE_RE = /<meta\s+[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i
const OG_IMAGE_REVERSE_RE = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["'][^>]*>/i
const YOUTUBE_ID_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/
const OG_FETCH_TIMEOUT_MS = 5_000

const STOP_WORDS = new Set([
  'the',
  'is',
  'at',
  'which',
  'on',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'with',
  'to',
  'for',
  'of',
  'that',
  'this',
  'it',
  'as',
  'from',
  'by',
  'how',
  'what',
  'when',
  'where',
  'who',
  'will',
  'can',
  'not',
  'be',
  'do',
  'use',
  'get',
  'set',
  'add',
  'new',
  'one',
  'all',
  'are',
  'was',
  'has'
])

const WORD_SPLIT_RE = /[\s,.;:!?()[\]{}'"<>/\\|`~@#$%^&*+=_-]+/
const SUGGEST_COOCCURRENCE_LIMIT = 5
const SUGGEST_MAX_RESULTS = 8

function extractKeywords(text: string): string[] {
  return text.split(WORD_SPLIT_RE).filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

function countCooccurrence(cooccurrence: Map<string, number>, otherTags: string[], existingTags: Set<string>): void {
  for (const tag of otherTags) {
    if (existingTags.has(tag)) continue
    for (const myTag of existingTags) {
      if (otherTags.includes(myTag)) {
        cooccurrence.set(tag, (cooccurrence.get(tag) ?? 0) + 1)
      }
    }
  }
}

function computeCooccurrence(entry: Knowledge, allEntries: Knowledge[], existingTags: Set<string>): string[] {
  const cooccurrence = new Map<string, number>()
  for (const other of allEntries) {
    if (other.id === entry.id) continue
    countCooccurrence(cooccurrence, other.tags ?? [], existingTags)
  }
  return Array.from(cooccurrence.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, SUGGEST_COOCCURRENCE_LIMIT)
    .map(([tag]) => tag)
}

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

  private async writeTaskToYaml(task: Knowledge, filePath: string): Promise<void> {
    try {
      let doc: Record<string, unknown> = {}
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        doc = Bun.YAML.parse(content) as Record<string, unknown>
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
      }
      const tasks = (doc.tasks ?? {}) as Record<string, unknown>
      tasks[task.key] = this.taskToYamlShape(task)
      doc.tasks = tasks
      const tmpPath = filePath + '.tmp'
      await fs.writeFile(tmpPath, Bun.YAML.stringify(doc), 'utf-8')
      await fs.rename(tmpPath, filePath)
    } catch (err) {
      this.log.error(['YAML write-back failed', task.key, filePath, err])
    }
  }

  private async removeTaskFromYaml(key: string, filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const doc = Bun.YAML.parse(content) as Record<string, unknown>
      const tasks = (doc.tasks ?? {}) as Record<string, unknown>
      delete tasks[key]
      if (Object.keys(tasks).length === 0) {
        await fs.unlink(filePath)
      } else {
        doc.tasks = tasks
        const tmpPath = filePath + '.tmp'
        await fs.writeFile(tmpPath, Bun.YAML.stringify(doc), 'utf-8')
        await fs.rename(tmpPath, filePath)
      }
    } catch (err) {
      this.log.error(['YAML remove failed', key, filePath, err])
    }
  }

  private taskToYamlShape(task: Knowledge): Record<string, unknown> {
    const shape: Record<string, unknown> = {}
    if (task.desc) shape.desc = task.desc
    if (task.tags && task.tags.length > 0) shape.tags = task.tags
    if (task.type === 'task') {
      shape.status = task.status
      if (task.priority) shape.priority = task.priority
      if (task.dueDate) shape.due = new Date(task.dueDate).toISOString().split('T')[0]
      if (task.taskOrder != null) shape.task_order = task.taskOrder
      if (task.dependsOn && task.dependsOn.length > 0) shape.depends_on = task.dependsOn.map(String)
    }
    return shape
  }

  private static rejectNotImplemented(method: string): Promise<never> {
    return Promise.reject(new Error(`Not implemented: ${method}`))
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
    await this.writeTaskToYaml(knowledge, this.loaded.writeTarget)
    this.invalidateListCache()
    return knowledge
  }

  async updateTask(id: number, patch: TaskUpdateInput): Promise<Knowledge> {
    const existing = await this.getEntry(id)
    if (!existing || existing.type !== 'task') throw new Error(`Task ${id} not found`)
    const merged = { ...existing, ...patch, updatedAt: Date.now() }
    const { raw } = this.getDb()
    upsert(raw, merged)
    await this.writeTaskToYaml(merged, merged.source)
    this.invalidateListCache()
    return merged
  }

  async deleteTask(id: number): Promise<void> {
    const existing = await this.getEntry(id)
    if (!existing || existing.type !== 'task') throw new Error(`Task ${id} not found`)
    const { raw } = this.getDb()
    deleteById(raw, id)
    await this.removeTaskFromYaml(existing.key, existing.source)
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
        await this.writeTaskToYaml(entry, entry.source)
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

  pasteInTerminal(cmd: string): Promise<void> {
    const app = this.loaded.display.terminalApp
    this.shellHooks.pasteInTerminal?.(cmd, app)
    return Promise.resolve()
  }

  openInEditor(filePath: string): Promise<void> {
    const app = this.loaded.display.editorApp
    this.shellHooks.openInEditor?.(filePath, app)
    return Promise.resolve()
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

  async suggestTags(entryId: number): Promise<string[]> {
    const entry = await this.getEntry(entryId)
    if (!entry) return []

    const { raw } = this.getDb()
    const allEntries = findAll(raw, { limit: -1, offset: 0 })
    const existingTags = new Set(entry.tags ?? [])

    const topCooccurrence = computeCooccurrence(entry, allEntries, existingTags)

    // Keyword extraction from entry text
    const text = `${entry.key} ${entry.desc ?? ''}`.toLowerCase()
    const words = extractKeywords(text)
    const allTags = Array.from(new Set(allEntries.flatMap(e => e.tags ?? [])))
    const keywordMatches = words
      .filter(w => w.length > 2)
      .map(word =>
        allTags.find(
          tag => tag.toLowerCase() === word || tag.toLowerCase().startsWith(word) || tag.toLowerCase().includes(word)
        )
      )
      .filter((tag): tag is string => tag !== undefined && !existingTags.has(tag))

    const combined = [...new Set([...topCooccurrence, ...keywordMatches])]
    return combined.slice(0, SUGGEST_MAX_RESULTS)
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
