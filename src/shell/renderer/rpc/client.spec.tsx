import '@happy-dom/global-registrator'

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

const rpcCallMock = mock<(params: unknown) => Promise<{ status: number; body: string }>>()

const messageHandlers: Record<string, (payload: unknown) => void> = {}

const ElectroviewMock = {
  // biome-ignore lint/style/useNamingConvention: mirrors Electrobun API
  defineRPC(config: { handlers?: { messages?: Record<string, (payload: unknown) => void> } }) {
    const messages = config.handlers?.messages ?? {}
    for (const [name, handler] of Object.entries(messages)) {
      messageHandlers[name] = handler
    }
    return {
      request: { rpcCall: rpcCallMock },
      send: {},
      setTransport: () => undefined
    }
  }
}

mock.module('electrobun/view', () => ({
  Electroview: class {
    // biome-ignore lint/style/useNamingConvention: mirrors Electrobun API
    static defineRPC = ElectroviewMock.defineRPC
    rpc: unknown
    constructor(config: { rpc: unknown }) {
      this.rpc = config.rpc
    }
  }
}))

const {
  fetchPreviewImage,
  getEntry,
  getListStats,
  listEntries,
  openExternal,
  resizeWindow,
  setSyncMessageHandlers,
  syncRpc
} = await import('./client')

beforeEach(() => {
  rpcCallMock.mockReset()
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
        rpcCallMock.mockImplementation(() => okResponse([{ id: 1, type: 'bookmark', key: 'k' }]))

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

  describe('.getListStats', () => {
    it('posts an empty body to /api/getListStats', async () => {
      rpcCallMock.mockImplementation(() => okResponse({ total: 3 }))

      const stats = await getListStats()

      expect(stats.total).toBe(3)
      const call = rpcCallMock.mock.calls[0]?.[0] as { path: string; body: string }
      expect(call.path).toBe('/api/getListStats')
      expect(JSON.parse(call.body)).toEqual({})
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
      const progress: Array<{ processed: number; total: number }> = []
      const completes: unknown[] = []
      setSyncMessageHandlers({
        onProgress: p => progress.push(p),
        onComplete: r => completes.push(r)
      })

      messageHandlers.syncProgress?.({ processed: 1, total: 10 })
      messageHandlers.syncComplete?.({ filesProcessed: 1, inserted: 1, updated: 0, errors: [] })

      expect(progress).toEqual([{ processed: 1, total: 10 }])
      expect(completes).toHaveLength(1)
    })
  })
})
