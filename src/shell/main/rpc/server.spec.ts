import { afterEach, describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { createTempDir, factoryFor, type TempDir, testingPaths } from '@testing'
import { App } from '../../app/app'
import type { LoadedConfig } from '../../app/config/config.loader'
import { ImportService } from '../../app/db/import.service'
import { createRpcServer } from './server'

const API = 'http://local/api'

function postJson(reqPath: string, body: unknown): Request {
  return new Request(`http://local${reqPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('createRpcServer', () => {
  let tmp: TempDir | undefined

  afterEach(async () => {
    await tmp?.cleanup()
    tmp = undefined
  })

  async function loadedFixture(): Promise<LoadedConfig> {
    tmp = await createTempDir('kb-rpc-server-')
    return factoryFor('loadedConfig', {
      overrides: {
        configPath: join(tmp.dir, 'config.yaml'),
        database: { path: join(tmp.dir, 'kb.sqlite') },
        sources: { path: testingPaths.minimal }
      }
    })
  }

  async function importedAppFixture(): Promise<App> {
    const loaded = await loadedFixture()
    const importer = new ImportService(loaded.database.path)
    await importer.run(loaded.sources.path)
    return new App(loaded)
  }

  describe('POST /api/list', () => {
    describe('when body is empty', () => {
      it('returns an array of entries', async () => {
        const app = await importedAppFixture()
        const rpc = createRpcServer(app)
        const res = await rpc.handle(postJson('/api/list', {}))
        expect(res.status).toBe(200)
        const data = (await res.json()) as unknown
        expect(Array.isArray(data)).toBe(true)
      })
    })
  })

  describe('POST /api/getListStats', () => {
    it('returns object with numeric totals', async () => {
      const app = await importedAppFixture()
      const rpc = createRpcServer(app)
      const res = await rpc.handle(postJson('/api/getListStats', {}))
      expect(res.status).toBe(200)
      const data = (await res.json()) as { total: number }
      expect(typeof data.total).toBe('number')
    })
  })

  describe('POST /api/getEntry', () => {
    describe('when body has an invalid id', () => {
      it('returns 500 with a structured error', async () => {
        const app = await importedAppFixture()
        const rpc = createRpcServer(app)
        const res = await rpc.handle(postJson('/api/getEntry', { id: 'nope' }))
        expect(res.status).toBe(500)
        const data = (await res.json()) as { error: string }
        expect(typeof data.error).toBe('string')
      })
    })
  })

  describe('POST /api/getStats', () => {
    it('returns total and byType', async () => {
      const app = await importedAppFixture()
      const rpc = createRpcServer(app)
      const res = await rpc.handle(postJson('/api/getStats', {}))
      expect(res.status).toBe(200)
      const data = (await res.json()) as { total: number; byType: Record<string, number> }
      expect(typeof data.total).toBe('number')
      expect(typeof data.byType).toBe('object')
    })
  })

  describe('POST /api/openExternal', () => {
    describe('when url is empty', () => {
      it('returns 500 with a structured error', async () => {
        const app = await importedAppFixture()
        const rpc = createRpcServer(app)
        const res = await rpc.handle(postJson('/api/openExternal', { url: '' }))
        expect(res.status).toBe(500)
      })
    })
  })

  describe('POST /api/resizeWindow', () => {
    describe('when shell hook is wired', () => {
      it('forwards width and height to the hook', async () => {
        const loaded = await loadedFixture()
        const calls: Array<{ width: number; height: number }> = []
        const app = new App(loaded, {}, false, {
          resizeWindow: (width, height) => calls.push({ width, height })
        })
        const rpc = createRpcServer(app)
        const res = await rpc.handle(postJson('/api/resizeWindow', { width: 1200, height: 700 }))
        expect(res.status).toBe(200)
        expect(calls).toEqual([{ width: 1200, height: 700 }])
      })
    })
  })

  describe('unknown route under /api', () => {
    it('does not match list and falls through', async () => {
      const app = await importedAppFixture()
      const rpc = createRpcServer(app)
      const res = await rpc.handle(postJson('/api/totallyUnknown', {}))
      expect(res.status).not.toBe(200)
    })
  })

  describe('content negotiation', () => {
    it('treats /list with no Content-Type as valid empty body', async () => {
      const app = await importedAppFixture()
      const rpc = createRpcServer(app)
      const res = await rpc.handle(new Request(`${API}/list`, { method: 'POST', body: JSON.stringify({}) }))
      expect(res.status).toBe(200)
    })
  })
})
