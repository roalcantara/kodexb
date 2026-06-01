import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { configureMainLogging, rpcErrorContract } from '@shared/logging'
import { Elysia, t } from 'elysia'

beforeAll(() => {
  configureMainLogging()
})

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

describe('validateBridgePayload()', () => {
  describe('when payload is valid', () => {
    describe.each([
      ['POST method', { path: '/api/echo', method: 'POST' }],
      ['omitted method', { path: '/api/echo' }]
    ])('with %s', (_, payload) => {
      it('passes validation', () => {
        expect(() => validateBridgePayload(payload)).not.toThrow()
      })
    })
  })

  describe('when payload is invalid', () => {
    describe.each([
      ['non-/api/ path', { path: '/status' }, bridge_error_codes.invalid_path],
      ['empty path', { path: '' }, bridge_error_codes.missing_path],
      ['GET method', { path: '/api/echo', method: 'GET' }, bridge_error_codes.invalid_method],
      ['PUT method', { path: '/api/echo', method: 'PUT' }, bridge_error_codes.invalid_method]
    ])('with %s', (_, payload, code) => {
      it('raises bridge error', () => {
        expect(() => validateBridgePayload(payload)).toThrow()
        try {
          validateBridgePayload(payload)
        } catch (e) {
          expect((e as { code: string }).code).toBe(code)
        }
      })
    })
  })
})

describe('forwardToRpcApp bridge validation', () => {
  describe('when request is invalid', () => {
    describe.each([
      ['non-/api/ path', { path: '/status', body: '{}' }, bridge_error_codes.invalid_path],
      ['GET method', { path: '/api/echo', method: 'GET', body: '{}' }, bridge_error_codes.invalid_method]
    ])('with %s', (_, request, errorCode) => {
      it('returns 400', async () => {
        const rpc = tinyRpcApp()
        const result = await forwardToRpcApp(rpc, request)
        expect(result.status).toBe(HTTP_BAD_REQUEST)
        const parsed = JSON.parse(result.body) as { error: string }
        expect(parsed.error).toBe(errorCode)
      })
    })
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
