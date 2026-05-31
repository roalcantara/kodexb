import { describe, expect, it } from 'bun:test'

import { runRoute } from '@testing/helpers/run_route.util'

import { configSyncRoutes } from './config_sync.routes'
import { setupRpcRouteSpecSuite } from './utils/rpc_route_spec.util'

describe('configSyncRoutes', () => {
  const { postViaRoutes } = setupRpcRouteSpecSuite()

  async function postConfig<T>(path: string, body: unknown): Promise<{ status: number; data: T }> {
    return await runRoute<T>(() => postViaRoutes(configSyncRoutes, path, body))
  }

  describe('POST /api/getStats', () => {
    it('returns total, byType, dbPath, and dbSize', () => {
      expect(postConfig('/api/getStats', {})).resolves.toMatchObject({
        status: 200,
        data: {
          total: expect.any(Number),
          byType: expect.any(Object),
          dbPath: expect.any(String),
          dbSize: expect.any(Number)
        }
      })
    })

    describe('when the body contains extra properties', () => {
      it('still returns 200 because the handler ignores the body', () => {
        expect(postConfig('/api/getStats', { unexpected: true })).resolves.toMatchObject({ status: 200 })
      })
    })
  })

  describe('POST /api/getConfig', () => {
    it('returns config paths and display settings', () => {
      expect(postConfig('/api/getConfig', {})).resolves.toMatchObject({
        status: 200,
        data: {
          configPath: expect.any(String),
          database: { path: expect.any(String) },
          sources: { path: expect.any(String) },
          display: expect.any(Object)
        }
      })
    })
  })

  describe('POST /api/getSyncInfo', () => {
    it('returns the sources directory and file count', () => {
      expect(postConfig('/api/getSyncInfo', {})).resolves.toMatchObject({
        status: 200,
        data: { sourcesDir: expect.any(String), fileCount: expect.any(Number) }
      })
    })
  })

  describe('POST /api/sync', () => {
    it('imports sources into the database', () => {
      expect(postConfig('/api/sync', {})).resolves.toMatchObject({
        status: 200,
        data: {
          filesProcessed: expect.any(Number),
          inserted: expect.any(Number),
          updated: expect.any(Number),
          errors: expect.any(Array),
          warnings: expect.any(Array)
        }
      })
    })

    describe('when sourcesDir is empty', () => {
      it('returns 500', () => {
        expect(postConfig<{ error: string }>('/api/sync', { sourcesDir: '' })).resolves.toMatchObject({
          status: 500,
          data: { error: expect.any(String) }
        })
      })
    })
  })

  describe('POST /api/saveConfig', () => {
    it('applies a valid patch and returns updated config', () => {
      expect(postConfig('/api/saveConfig', { pageSize: 25 })).resolves.toMatchObject({
        status: 200,
        data: { display: { pageSize: '25' } }
      })
    })

    describe('when pageSize is not allowed', () => {
      it('returns 500', () => {
        expect(postConfig<{ error: string }>('/api/saveConfig', { pageSize: 99 })).resolves.toMatchObject({
          status: 500,
          data: { error: expect.any(String) }
        })
      })
    })

    describe('when sourcesDir is empty', () => {
      it('returns 500', () => {
        expect(postConfig<{ error: string }>('/api/saveConfig', { sourcesDir: '' })).resolves.toMatchObject({
          status: 500,
          data: { error: expect.any(String) }
        })
      })
    })
  })
})
