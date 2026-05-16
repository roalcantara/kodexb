import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { RpcSyncProgressPayload } from '@shared/rpc'
import { factoryFor } from '../../../__tests__/factories/factories.builder'
import {
  getElectrobunMessageHandler,
  type RpcCallParams,
  setRpcCallHandler
} from '../../../__tests__/helpers/testing.electrobun_view.mock'

const rpcCallMock = mock<(params: RpcCallParams) => Promise<{ status: number; body: string }>>()

const {
  fetchPreviewImage,
  getEntry,
  getListStats,
  listEntries,
  listMatchCount,
  recordEntryVisit,
  openExternal,
  openInEditor,
  pasteInTerminal,
  resizeWindow,
  setSyncMessageHandlers,
  syncRpc
} = await import('./client')

beforeEach(() => {
  rpcCallMock.mockReset()
  setRpcCallHandler(params => rpcCallMock(params))
})

afterEach(() => {
  rpcCallMock.mockReset()
})

function okResponse(payload: unknown): Promise<{ status: number; body: string }> {
  const body = payload === undefined ? '' : JSON.stringify(payload)
  return Promise.resolve({ status: 200, body })
}

function errorResponse(message: string, status = 500): Promise<{ status: number; body: string }> {
  return Promise.resolve({ status, body: JSON.stringify({ error: message }) })
}

describe('Eden Treaty client', () => {
  describe('.listEntries', () => {
    describe('when main returns rows', () => {
      it('forwards body to /api/list and returns the rows', async () => {
        rpcCallMock.mockImplementation(() =>
          okResponse([
            factoryFor('bookmark', {
              overrides: { id: 1, key: 'k', source: 's', desc: 'd', tags: [], doc: '', createdAt: 0, updatedAt: 0 }
            })
          ])
        )

        const rows = await listEntries({ limit: 5 })

        expect(rows).toHaveLength(1)
        const call = rpcCallMock.mock.calls[0]?.[0] as { path: string; body: string; method: string }
        expect(call.path).toBe('/api/list')
        expect(call.method).toBe('POST')
        expect(JSON.parse(call.body)).toEqual({ limit: 5 })
      })
    })

    describe('when main reports an error', () => {
      it('throws with the surfaced message', async () => {
        rpcCallMock.mockImplementation(() => errorResponse('bad list'))

        await expect(listEntries()).rejects.toThrow('bad list')
      })
    })
  })

  describe('.listMatchCount', () => {
    it('forwards body to /api/listMatchCount and returns the number', async () => {
      rpcCallMock.mockImplementation(() => okResponse(42))

      const n = await listMatchCount({ query: 'brew' })

      expect(n).toBe(42)
      const call = rpcCallMock.mock.calls[0]?.[0] as { path: string; body: string }
      expect(call.path).toBe('/api/listMatchCount')
      expect(JSON.parse(call.body)).toEqual({ query: 'brew' })
    })
  })

  describe('.recordEntryVisit', () => {
    it('forwards body to /api/recordEntryVisit', async () => {
      rpcCallMock.mockImplementation(() => okResponse({ ok: true }))

      const result = await recordEntryVisit(7)

      expect(result).toEqual({ ok: true })
      const call = rpcCallMock.mock.calls[0]?.[0] as { path: string; body: string }
      expect(call.path).toBe('/api/recordEntryVisit')
      expect(JSON.parse(call.body)).toEqual({ id: 7 })
    })
  })

  describe('.getListStats', () => {
    it('posts an empty body to /api/getListStats by default', async () => {
      rpcCallMock.mockImplementation(() => okResponse({ total: 3 }))

      const stats = await getListStats()

      expect(stats.total).toBe(3)
      const call = rpcCallMock.mock.calls[0]?.[0] as { path: string; body: string }
      expect(call.path).toBe('/api/getListStats')
      expect(JSON.parse(call.body)).toEqual({})
    })

    it('forwards filter context in the POST body when provided', async () => {
      rpcCallMock.mockImplementation(() => okResponse({ total: 1 }))

      await getListStats({ types: ['cheat'], tags: ['fabric'] })

      const call = rpcCallMock.mock.calls[0]?.[0] as { path: string; body: string }
      expect(call.path).toBe('/api/getListStats')
      expect(JSON.parse(call.body)).toEqual({ types: ['cheat'], tags: ['fabric'] })
    })
  })

  describe('.getEntry', () => {
    it('serialises id into the POST body', async () => {
      rpcCallMock.mockImplementation(() => okResponse(null))

      await getEntry(7)

      const call = rpcCallMock.mock.calls[0]?.[0] as { path: string; body: string }
      expect(call.path).toBe('/api/getEntry')
      expect(JSON.parse(call.body)).toEqual({ id: 7 })
    })
  })

  describe('.syncRpc', () => {
    describe('when sourcesDir is omitted', () => {
      it('posts an empty body', async () => {
        rpcCallMock.mockImplementation(() => okResponse({ filesProcessed: 0, inserted: 0, updated: 0, errors: [] }))
        await syncRpc()
        const call = rpcCallMock.mock.calls[0]?.[0] as { body: string }
        expect(JSON.parse(call.body)).toEqual({})
      })
    })

    describe('when sourcesDir is provided', () => {
      it('forwards it in the body', async () => {
        rpcCallMock.mockImplementation(() => okResponse({ filesProcessed: 0, inserted: 0, updated: 0, errors: [] }))
        await syncRpc('/abs/path')
        const call = rpcCallMock.mock.calls[0]?.[0] as { body: string }
        expect(JSON.parse(call.body)).toEqual({ sourcesDir: '/abs/path' })
      })
    })
  })

  describe('.resizeWindow', () => {
    it('forwards width and height', async () => {
      rpcCallMock.mockImplementation(() => okResponse(undefined))
      await resizeWindow(1024, 720)
      const call = rpcCallMock.mock.calls[0]?.[0] as { body: string }
      expect(JSON.parse(call.body)).toEqual({ width: 1024, height: 720 })
    })
  })

  describe('.openExternal', () => {
    it('forwards url', async () => {
      rpcCallMock.mockImplementation(() => okResponse(undefined))
      await openExternal('https://example.com')
      const call = rpcCallMock.mock.calls[0]?.[0] as { body: string }
      expect(JSON.parse(call.body)).toEqual({ url: 'https://example.com' })
    })
  })

  describe('.fetchPreviewImage', () => {
    it('returns the parsed body', async () => {
      rpcCallMock.mockImplementation(() => okResponse({ url: 'https://i/og.png' }))
      const result = await fetchPreviewImage('https://example.com')
      expect(result).toEqual({ url: 'https://i/og.png' })
    })
  })

  describe('.setSyncMessageHandlers', () => {
    it('registers progress and completion callbacks', () => {
      const progress: RpcSyncProgressPayload[] = []
      const completes: unknown[] = []
      setSyncMessageHandlers({
        onProgress: p => progress.push(p),
        onComplete: r => completes.push(r)
      })

      const recentFile = { path: '/tmp/a.yml', label: 'a.yml', ok: true, inserted: 2, updated: 0 }
      getElectrobunMessageHandler('syncProgress')?.({ processed: 1, total: 10, recentFile })
      getElectrobunMessageHandler('syncComplete')?.({ filesProcessed: 1, inserted: 1, updated: 0, errors: [] })

      expect(progress).toEqual([{ processed: 1, total: 10, recentFile }])
      expect(completes).toHaveLength(1)
    })
  })

  describe('.pasteInTerminal', () => {
    it('forwards cmd to /api/pasteInTerminal', async () => {
      rpcCallMock.mockImplementation(() => okResponse(undefined))
      await pasteInTerminal('git log')
      const call = rpcCallMock.mock.calls[0]?.[0] as { path: string; body: string }
      expect(call.path).toBe('/api/pasteInTerminal')
      expect(JSON.parse(call.body)).toEqual({ cmd: 'git log' })
    })
  })

  describe('.openInEditor', () => {
    it('forwards filePath to /api/openInEditor', async () => {
      rpcCallMock.mockImplementation(() => okResponse(undefined))
      await openInEditor('/tmp/file.yml')
      const call = rpcCallMock.mock.calls[0]?.[0] as { path: string; body: string }
      expect(call.path).toBe('/api/openInEditor')
      expect(JSON.parse(call.body)).toEqual({ filePath: '/tmp/file.yml' })
    })
  })
})
