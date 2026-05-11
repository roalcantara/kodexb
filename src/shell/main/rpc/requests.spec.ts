import { describe, expect, mock, test } from 'bun:test'
import type { Knowledge } from '@core'
import type { ListStats, RpcDbStats, RpcGetConfigPayload } from '@shared/rpc'

import type { App } from '../../app/app'
import { kbRpcDataHandlers, kbRpcDialogHandlers, kbRpcOpenHandlers, kbRpcTaskHandlers } from './requests'

const LIST_ERR = /list:/
const GET_ENTRY_ERR = /getEntry:/
const SAVE_CONFIG_ERR = /saveConfig:/

function baseMockApp(overrides: Partial<App> = {}): App {
  const listStats: ListStats = {
    total: 0,
    bookmark: 0,
    command: 0,
    cheat: 0,
    task: 0,
    taskViews: {
      actionable: 0,
      today: 0,
      overdue: 0,
      this_week: 0,
      all_pending: 0,
      all_doing: 0
    },
    tags: {},
    byType: {}
  }
  const dbStats: RpcDbStats = { total: 0, byType: {} }
  const cfg: RpcGetConfigPayload = {
    configPath: '/tmp/cfg.yaml',
    database: { path: '/tmp/db.sqlite' },
    sources: { path: '/tmp/src' },
    display: { pageSize: '50' }
  }
  const base = {
    invalidateListCache: () => undefined,
    list: () => Promise.resolve([] as Knowledge[]),
    getEntry: () => Promise.resolve(null),
    getListStats: () => Promise.resolve(listStats),
    sync: () => Promise.resolve({ filesProcessed: 0, inserted: 0, updated: 0, errors: [] }),
    getStats: () => Promise.resolve(dbStats),
    getConfig: () => Promise.resolve(cfg),
    applyConfigPatch: () => Promise.resolve(cfg),
    createTask: () => Promise.reject(new Error('stub')),
    updateTask: () => Promise.reject(new Error('stub')),
    deleteTask: () => Promise.reject(new Error('stub')),
    cycleStatus: () => Promise.reject(new Error('stub')),
    cyclePriority: () => Promise.reject(new Error('stub')),
    reorderTask: () => Promise.reject(new Error('stub')),
    openExternal: () => Promise.resolve(),
    pasteInTerminal: () => Promise.resolve(),
    openInEditor: () => Promise.resolve(),
    showOpenDialog: () => Promise.resolve(null),
    fetchPreviewImage: () => Promise.resolve(null),
    suggestTags: () => Promise.resolve([]),
    resizeWindow: () => Promise.resolve()
  }
  return { ...base, ...overrides } as unknown as App
}

describe('kbRpcDataHandlers', () => {
  test('list: rejects invalid payload before App', () => {
    const app = baseMockApp({
      list: () => Promise.reject(new Error('should not run'))
    })
    const h = kbRpcDataHandlers(app)
    expect(() => h.list({ limit: -1 })).toThrow(LIST_ERR)
  })

  test('list: forwards parsed opts to App', async () => {
    let seen: unknown
    const app = baseMockApp({
      list: opts => {
        seen = opts
        return Promise.resolve([])
      }
    })
    const h = kbRpcDataHandlers(app)
    await h.list({ limit: 5, offset: 10, query: 'q' })
    expect(seen).toEqual({ limit: 5, offset: 10, query: 'q' })
  })

  test('getEntry: rejects invalid id', () => {
    const app = baseMockApp({
      getEntry: () => Promise.reject(new Error('should not run'))
    })
    const h = kbRpcDataHandlers(app)
    expect(() => h.getEntry({ id: 'nope' })).toThrow(GET_ENTRY_ERR)
  })

  test('saveConfig: rejects invalid pageSize', () => {
    const app = baseMockApp({
      applyConfigPatch: () => Promise.reject(new Error('should not run'))
    })
    const h = kbRpcDataHandlers(app)
    expect(() => h.saveConfig({ pageSize: 12 as never })).toThrow(SAVE_CONFIG_ERR)
  })
})

describe('kbRpcTaskHandlers', () => {
  test('cycleStatus: rejects invalid dir', () => {
    const app = baseMockApp()
    const h = kbRpcTaskHandlers(app)
    expect(() => h.cycleStatus({ id: 1, dir: 'sideways' as 'forward' })).toThrow()
  })
})

describe('kbRpcOpenHandlers', () => {
  test('openExternal: rejects empty url', () => {
    const app = baseMockApp()
    const h = kbRpcOpenHandlers(app)
    expect(() => h.openExternal({ url: '' })).toThrow()
  })
})

describe('kbRpcDialogHandlers', () => {
  test('resizeWindow: forwards valid size', async () => {
    let seen: unknown
    const app = baseMockApp({
      resizeWindow: (width, height) => {
        seen = { width, height }
        return Promise.resolve()
      }
    })
    const h = kbRpcDialogHandlers(app)
    await h.resizeWindow({ width: 1200, height: 600 })
    expect(seen).toEqual({ width: 1200, height: 600 })
  })

  test('fetchPreviewImage: forwards url', async () => {
    let seen = ''
    const app = baseMockApp({
      fetchPreviewImage: url => {
        seen = url
        return Promise.resolve({ url: 'https://example.com/og.png' })
      }
    })
    const h = kbRpcDialogHandlers(app)
    await h.fetchPreviewImage({ url: 'https://example.com' })
    expect(seen).toBe('https://example.com')
  })

  test('showOpenDialog: forwards opts to App', async () => {
    const showOpenDialog = mock(() => Promise.resolve('/tmp'))
    const app = baseMockApp({ showOpenDialog })
    const h = kbRpcDialogHandlers(app)
    const result = await h.showOpenDialog({ opts: { defaultPath: '/tmp', properties: ['openDirectory'] } })
    expect(result).toBe('/tmp')
    expect(showOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: '/tmp', properties: ['openDirectory'] })
    )
  })
})
