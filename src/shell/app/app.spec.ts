import { afterEach, describe, expect, it, mock } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { factoryFor, testingPaths } from '@testing'
import { App } from './app'
import type { LoadedConfig } from './config/config.loader'
import { ImportService } from './db/import.service'

const NOT_IMPLEMENTED_RE = /Not implemented/

describe('App', () => {
  let workDir: string | undefined

  afterEach(async () => {
    if (workDir !== undefined) await rm(workDir, { recursive: true, force: true })
  })

  async function loadedFixture(): Promise<LoadedConfig> {
    workDir = await mkdtemp(join(tmpdir(), 'kb-appsvc-'))
    const dbPath = join(workDir, 'kb.sqlite')
    return factoryFor('loadedConfig', {
      overrides: {
        configPath: join(workDir, 'config.yaml'),
        database: { path: dbPath },
        sources: { path: testingPaths.minimal }
      }
    })
  }

  function insertManualBookmark(app: App, key: string) {
    const { raw } = (
      app as unknown as { getDb: () => { raw: { run: (sql: string, ...params: unknown[]) => unknown } } }
    ).getDb()
    raw.run(
      `INSERT INTO knowledges
        (type, key, source, desc, tags, links, notes, meta, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'bookmark',
      key,
      '/manual.yml',
      'Manual cache probe',
      '["manual"]',
      '[]',
      '[]',
      '{}',
      Date.now(),
      Date.now()
    )
  }

  async function importedAppFixture(): Promise<{ loaded: LoadedConfig; app: App }> {
    const loaded = await loadedFixture()
    const importer = new ImportService(loaded.database.path)
    await importer.run(loaded.sources.path)
    return { loaded, app: new App(loaded) }
  }

  it('lists entries after import into the same db file', async () => {
    const loaded = await loadedFixture()
    const importer = new ImportService(loaded.database.path)
    await importer.run(loaded.sources.path)

    const app = new App(loaded)
    const rows = await app.list({ limit: 20 })
    expect(rows.length).toBeGreaterThanOrEqual(4)

    const matchCount = await app.listMatchCount({})
    expect(matchCount).toBe((await app.getListStats()).total)

    const stats = await app.getListStats()
    expect(stats.total).toBeGreaterThanOrEqual(4)
    expect(stats.taskViews.all_pending).toBeGreaterThanOrEqual(1)
    expect(stats.tags.git).toBe(2)
    expect(stats.tags.example).toBe(1)
  })

  it('resizeWindow calls shell hook when set', async () => {
    const loaded = await loadedFixture()
    const sizes: Array<{ w: number; h: number }> = []
    const shell = {
      resizeWindow(w: number, h: number) {
        sizes.push({ w, h })
      }
    }
    const app = new App(loaded, {}, 'default', shell)
    await app.resizeWindow(1200, 700)
    expect(sizes).toEqual([{ w: 1200, h: 700 }])
  })

  it('openExternal calls shell hook for URL', async () => {
    const loaded = await loadedFixture()
    const opened: string[] = []
    const app = new App(loaded, {}, 'default', { openExternal: url => opened.push(url) })
    await app.openExternal('https://example.com/docs')
    expect(opened).toEqual(['https://example.com/docs'])
  })

  it('openExternal rejects bad URL', async () => {
    const loaded = await loadedFixture()
    const app = new App(loaded)
    await expect(app.openExternal('not a url')).rejects.toThrow()
  })

  it('showOpenDialog delegates to shell hook', async () => {
    const loaded = await loadedFixture()
    const showOpenDialog = mock(() => Promise.resolve('/picked'))
    const app = new App(loaded, {}, 'default', { showOpenDialog })
    await expect(app.showOpenDialog({ title: 'Pick' })).resolves.toBe('/picked')
    expect(showOpenDialog).toHaveBeenCalled()
  })

  it('showOpenDialog rejects when hook missing', async () => {
    const loaded = await loadedFixture()
    const app = new App(loaded)
    await expect(app.showOpenDialog({})).rejects.toThrow(NOT_IMPLEMENTED_RE)
  })

  it('fetchPreviewImage returns YouTube thumbnail', async () => {
    const loaded = await loadedFixture()
    const app = new App(loaded)
    const result = await app.fetchPreviewImage('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result?.url).toContain('dQw4w9WgXcQ')
  })

  it('fetchPreviewImage parses OG meta tags', async () => {
    const loaded = await loadedFixture()
    const app = new App(loaded)
    const html = '<meta property="og:image" content="https://example.com/image.png">'
    globalThis.fetch = mock(async () => new Response(html)) as unknown as typeof fetch
    const result = await app.fetchPreviewImage('https://example.com/page')
    expect(result).toEqual({ url: 'https://example.com/image.png' })
  })

  it('invalidates list cache after sync', async () => {
    const { loaded, app } = await importedAppFixture()
    await app.list({ limit: 1 })
    await app.list({ limit: 1 })

    await app.sync(loaded.sources.path)
    const third = await app.list({ limit: 2 })
    expect(third.length).toBeGreaterThan(0)
  })

  describe('stats caching', () => {
    it('returns cached listStats on second call without hitting DB', async () => {
      const { app } = await importedAppFixture()
      const first = await app.getListStats()
      insertManualBookmark(app, 'manual-cached-list-stats')
      const second = await app.getListStats()
      expect(second).toBe(first)
      expect(second.total).toBe(first.total)
    })

    it('clears listStats cache after sync', async () => {
      const { loaded, app } = await importedAppFixture()
      const first = await app.getListStats()
      insertManualBookmark(app, 'manual-list-stats-after-sync')
      await app.sync(loaded.sources.path)
      const second = await app.getListStats()
      expect(second).not.toBe(first)
      expect(second.total).toBeGreaterThan(0)
    })

    it('clears cache after config change', async () => {
      const { app } = await importedAppFixture()
      const first = await app.getStats()
      insertManualBookmark(app, 'manual-db-stats-after-config')
      await app.applyConfigPatch({ pageSize: 25 })
      const second = await app.getStats()
      expect(second.total).toBe(first.total + 1)
      expect(second.byType.bookmark).toBe((first.byType.bookmark ?? 0) + 1)
    })
  })

  it('pasteInTerminal calls shell hook with terminal app from config', async () => {
    const calls: Array<{ cmd: string; app?: string }> = []
    const cfg = factoryFor('loadedConfig', { overrides: { display: { terminalApp: 'Terminal.app', pageSize: '50' } } })
    Object.assign(cfg, { writeTarget: '/tmp/tasks.yml' })
    const app = new App(cfg, {}, 'default', {
      pasteInTerminal: (cmd, termApp) => calls.push({ cmd, app: termApp })
    })
    await app.pasteInTerminal('git log')
    expect(calls).toEqual([{ cmd: 'git log', app: 'Terminal.app' }])
  })

  it('openInEditor calls shell hook with editor app from config', async () => {
    const calls: Array<{ filePath: string; app?: string }> = []
    const cfg = factoryFor('loadedConfig', { overrides: { display: { editorApp: 'code', pageSize: '50' } } })
    Object.assign(cfg, { writeTarget: '/tmp/tasks.yml' })
    const app = new App(cfg, {}, 'default', {
      openInEditor: (filePath, editorApp) => calls.push({ filePath, app: editorApp })
    })
    await app.openInEditor('/tmp/test.yaml')
    expect(calls).toEqual([{ filePath: '/tmp/test.yaml', app: 'code' }])
  })

  describe('suggestTags', () => {
    async function seededFixture(): Promise<App> {
      const loaded = await loadedFixture()
      const importer = new ImportService(loaded.database.path)
      await importer.run(testingPaths.minimal)
      return new App(loaded)
    }

    it('returns empty array for non-existent entry', async () => {
      const app = await seededFixture()
      const result = await app.suggestTags(999999)
      expect(result).toEqual([])
    })

    it('returns co-occurring tags for entries with existing tags', async () => {
      const app = await seededFixture()
      const result = await app.suggestTags(1)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeLessThanOrEqual(8)
      const entry = await app.getEntry(1)
      if (entry) {
        for (const tag of entry.tags ?? []) {
          expect(result).not.toContain(tag)
        }
      }
    })

    it('returns keywords when entry has no tags', async () => {
      const app = await seededFixture()
      const entries = await app.list()
      const untagged = entries.find(e => (e.tags ?? []).length === 0)
      if (untagged) {
        const result = await app.suggestTags(untagged.id)
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeLessThanOrEqual(8)
      }
    })
  })
})
