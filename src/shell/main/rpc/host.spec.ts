import { describe, expect, it, mock } from 'bun:test'
import { Elysia, t } from 'elysia'
import { rpcErrorContract } from './server'

mock.module('electrobun/bun', () => ({
  BrowserView: {}
}))

const { testing_helpers } =
  // import('./host') must happen after mock.module is registered above
  await import('./host')

const HTTP_INTERNAL_ERROR = 500
const HTTP_BAD_REQUEST = 400
const { forwardToRpcApp, validateBridgePayload, filterHeaders, bridge_error_codes } = testing_helpers

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
    it('filters headers to allowlist and keeps content-type as application/json', async () => {
      const rpc = tinyRpcApp()
      const result = await forwardToRpcApp(rpc, {
        path: '/api/echo',
        headers: { 'x-trace-id': 'abc', accept: 'application/json' },
        body: JSON.stringify({ value: 'h' })
      })
      expect(result.status).toBe(200)
    })
  })
})

describe('validateBridgePayload', () => {
  it('accepts /api/ path and POST method', () => {
    expect(() => validateBridgePayload({ path: '/api/echo', method: 'POST' })).not.toThrow()
  })

  it('accepts omitted method (defaults to POST)', () => {
    expect(() => validateBridgePayload({ path: '/api/echo' })).not.toThrow()
  })

  it('rejects non-/api/ path', () => {
    expect(() => validateBridgePayload({ path: '/status' })).toThrow()
    try {
      validateBridgePayload({ path: '/status' })
    } catch (e) {
      expect((e as { code: string }).code).toBe(bridge_error_codes.invalid_path)
    }
  })

  it('rejects empty path', () => {
    expect(() => validateBridgePayload({ path: '' })).toThrow()
    try {
      validateBridgePayload({ path: '' })
    } catch (e) {
      expect((e as { code: string }).code).toBe(bridge_error_codes.missing_path)
    }
  })

  it('rejects non-POST methods (GET, PUT)', () => {
    for (const method of ['GET', 'PUT']) {
      expect(() => validateBridgePayload({ path: '/api/echo', method })).toThrow()
      try {
        validateBridgePayload({ path: '/api/echo', method })
      } catch (e) {
        expect((e as { code: string }).code).toBe(bridge_error_codes.invalid_method)
      }
    }
  })
})

describe('forwardToRpcApp bridge validation', () => {
  it('rejects non-/api/ path with 400', async () => {
    const rpc = tinyRpcApp()
    const result = await forwardToRpcApp(rpc, { path: '/status', body: '{}' })
    expect(result.status).toBe(HTTP_BAD_REQUEST)
    const parsed = JSON.parse(result.body) as { error: string }
    expect(parsed.error).toBe(bridge_error_codes.invalid_path)
  })

  it('rejects GET method with 400', async () => {
    const rpc = tinyRpcApp()
    const result = await forwardToRpcApp(rpc, { path: '/api/echo', method: 'GET', body: '{}' })
    expect(result.status).toBe(HTTP_BAD_REQUEST)
    const parsed = JSON.parse(result.body) as { error: string }
    expect(parsed.error).toBe(bridge_error_codes.invalid_method)
  })
})

describe('filterHeaders', () => {
  it('passes through allowed accept header', () => {
    const result = filterHeaders({ accept: 'application/json' })
    expect(result).toEqual({ accept: 'application/json' })
  })

  it('strips disallowed headers including content-type', () => {
    const result = filterHeaders({
      'content-type': 'application/json',
      'x-custom': 'bad',
      authorization: 'token',
      accept: 'text/html'
    })
    expect(result).toEqual({ accept: 'text/html' })
    expect(result).not.toHaveProperty('content-type')
    expect(result).not.toHaveProperty('x-custom')
    expect(result).not.toHaveProperty('authorization')
  })

  it('returns empty object for undefined headers', () => {
    expect(filterHeaders(undefined)).toEqual({})
  })
})
