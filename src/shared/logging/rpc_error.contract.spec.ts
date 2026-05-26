import { beforeEach, describe, expect, it } from 'bun:test'
import { Elysia, t } from 'elysia'
import { rpcErrorContract } from './rpc_error.contract'

const HTTP_OK = 200
const HTTP_INTERNAL_ERROR = 500

const echoSchema = { body: t.Object({ value: t.String() }, { additionalProperties: false }) }

function buildApp() {
  const app = new Elysia({ prefix: '/api' }).use(rpcErrorContract)
  app.post('/echo', ({ body }) => body, echoSchema)
  app.post('/throw', () => {
    throw new Error('boom')
  })
  return app
}

function postJson(path: string, body: unknown): Request {
  return new Request(`http://local${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('rpcErrorContract', () => {
  describe('when the handler succeeds', () => {
    it('returns the response body unchanged', async () => {
      const res = await buildApp().handle(postJson('/api/echo', { value: 'hi' }))
      expect(res.status).toBe(HTTP_OK)
      expect(await res.json()).toEqual({ value: 'hi' })
    })
  })

  describe('when the handler throws', () => {
    let res: Response

    beforeEach(async () => {
      res = await buildApp().handle(postJson('/api/throw', {}))
    })

    it('returns HTTP 500', () => {
      expect(res.status).toBe(HTTP_INTERNAL_ERROR)
    })

    it('returns a structured { error } body', async () => {
      const parsed = (await res.json()) as { error: string }
      expect(parsed.error).toBe('boom')
    })
  })

  describe('when the body fails validation', () => {
    let res: Response

    beforeEach(async () => {
      res = await buildApp().handle(postJson('/api/echo', { value: 42 }))
    })

    it('returns HTTP 500', () => {
      expect(res.status).toBe(HTTP_INTERNAL_ERROR)
    })

    it('returns a non-empty error message', async () => {
      const parsed = (await res.json()) as { error: string }
      expect(typeof parsed.error).toBe('string')
      expect(parsed.error.length).toBeGreaterThan(0)
    })
  })
})
