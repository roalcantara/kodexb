import { describe, expect, it, mock } from 'bun:test'

mock.module('electrobun/bun', () => ({
  BrowserView: {}
}))

// biome-ignore lint/nursery/useImportsFirst: must follow mock.module for Bun to intercept
import { Elysia, t } from 'elysia'

const { testing_helpers } =
  // import('./host') must happen after mock.module is registered above
  await import('./host')

// biome-ignore lint/nursery/useImportsFirst: must follow dynamic import
import { rpcErrorContract } from './server'

const HTTP_INTERNAL_ERROR = 500
const { forwardToRpcApp } = testing_helpers

function tinyRpcApp() {
  return new Elysia({ prefix: '/api' })
    .use(rpcErrorContract)
    .post('/echo', ({ body }) => body, {
      body: t.Object({ value: t.String() }, { additionalProperties: false })
    })
    .post('/ping', () => ({ ok: true }), {
      body: t.Object({}, { additionalProperties: false })
    })
}

describe('forwardToRpcApp', () => {
  describe('when body is valid', () => {
    it('returns serialised status and body from the RpcApp', async () => {
      const rpc = tinyRpcApp()
      const result = await forwardToRpcApp(rpc, {
        path: '/api/echo',
        body: JSON.stringify({ value: 'hello' })
      })
      expect(result.status).toBe(200)
      expect(JSON.parse(result.body)).toEqual({ value: 'hello' })
    })
  })

  describe('when method is omitted', () => {
    it('defaults to POST', async () => {
      const rpc = tinyRpcApp()
      const result = await forwardToRpcApp(rpc, { path: '/api/ping', body: '{}' })
      expect(result.status).toBe(200)
    })
  })

  describe('when body fails TypeBox validation', () => {
    it('returns 500 with a structured error', async () => {
      const rpc = tinyRpcApp()
      const result = await forwardToRpcApp(rpc, {
        path: '/api/echo',
        body: JSON.stringify({ value: 42 })
      })
      expect(result.status).toBe(HTTP_INTERNAL_ERROR)
      const parsed = JSON.parse(result.body) as { error: string }
      expect(typeof parsed.error).toBe('string')
    })
  })

  describe('when caller passes custom headers', () => {
    it('keeps content-type default but allows extra headers', async () => {
      const rpc = tinyRpcApp()
      const result = await forwardToRpcApp(rpc, {
        path: '/api/echo',
        headers: { 'x-trace-id': 'abc' },
        body: JSON.stringify({ value: 'h' })
      })
      expect(result.status).toBe(200)
    })
  })
})
