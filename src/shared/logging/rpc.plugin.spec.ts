import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { AsyncLocalStorage } from 'node:async_hooks'
import { configureSync, type LogRecord } from '@logtape/logtape'
import { Elysia, t } from 'elysia'
import { rpcCommonPlugins, rpcErrorContract, rpcLogger } from './rpc.plugin'

type CapturedRecord = LogRecord & { category: readonly string[] }

// -- rpcLogger tests (was rpc.middleware.spec.ts) ----------------------------

const rpcLoggerRecords: CapturedRecord[] = []

function memorySink(record: LogRecord) {
  rpcLoggerRecords.push(record as CapturedRecord)
}

function configureAt(level: 'warning' | 'info' | 'debug' | 'trace') {
  configureSync({
    reset: true,
    contextLocalStorage: new AsyncLocalStorage(),
    sinks: { mem: memorySink },
    loggers: [
      { category: ['logtape', 'meta'], sinks: [], lowestLevel: 'fatal' },
      { category: ['kb', 'rpc'], sinks: ['mem'], lowestLevel: level, parentSinks: 'override' },
      { category: ['kb'], sinks: [], lowestLevel: level }
    ]
  })
}

function buildLoggerApp() {
  return new Elysia({ prefix: '/api' })
    .use(rpcLogger)
    .post('/list', ({ body }) => ({ got: body }), {
      body: t.Object({}, { additionalProperties: false })
    })
    .post('/boom', () => {
      throw new Error('intentional')
    })
}

function postJson(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`http://local${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  })
}

function rpcTemplates(): string[] {
  return rpcLoggerRecords.filter(r => r.category.join('.') === 'kb.rpc').map(r => String(r.rawMessage))
}

function rpcRecords() {
  return rpcLoggerRecords.filter(r => r.category.join('.') === 'kb.rpc')
}

describe('rpcLogger', () => {
  beforeEach(() => {
    rpcLoggerRecords.length = 0
  })
  afterEach(() => {
    rpcLoggerRecords.length = 0
  })

  describe.each([
    { level: 'debug' as const, parameters: true },
    { level: 'info' as const, parameters: false }
  ])('when LOG_LEVEL=$level', ({ level, parameters }) => {
    beforeEach(async () => {
      configureAt(level)
      await buildLoggerApp().handle(postJson('/api/list', {}))
    })

    it('emits a Started record', () => {
      expect(rpcTemplates().some(template => template.startsWith('Started'))).toBe(true)
    })

    it(parameters ? 'emits a Parameters record' : 'omits the Parameters record', () => {
      expect(rpcTemplates().some(template => template.startsWith('Parameters'))).toBe(parameters)
    })
  })

  describe('when the handler throws', () => {
    let res: Response

    beforeEach(async () => {
      configureAt('debug')
      res = await buildLoggerApp().handle(postJson('/api/boom', {}))
    })

    it('returns a 5xx response', () => {
      expect(res.status).toBeGreaterThanOrEqual(500)
    })

    it('emits one error record on kb.rpc', () => {
      const errors = rpcRecords().filter(r => r.level === 'error')
      expect(errors).toHaveLength(1)
    })
  })

  describe('with an X-Request-Id header', () => {
    const customId = 'abcdef01-2345-4def-9abc-fedcba012345'

    beforeEach(async () => {
      configureAt('info')
      await buildLoggerApp().handle(postJson('/api/list', {}, { 'x-request-id': customId }))
    })

    it('preserves the inbound id', () => {
      const ids = rpcRecords()
        .map(r => r.properties?.requestId)
        .filter(Boolean)
      expect(ids).toContain(customId)
    })
  })

  describe('without an X-Request-Id header', () => {
    beforeEach(async () => {
      configureAt('info')
      await buildLoggerApp().handle(postJson('/api/list', {}))
    })

    it('generates a request id', () => {
      const id = rpcRecords()[0]?.properties?.requestId as string
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThanOrEqual(8)
    })
  })
})

// -- rpcCommonPlugins tests (was rpc_common.plugin.spec.ts) ------------------

const commonRecords: LogRecord[] = []

function commonMemorySink(record: LogRecord) {
  commonRecords.push(record)
}

function configureCommon() {
  const meta = { category: ['logtape', 'meta'], sinks: [], lowestLevel: 'fatal' as const }
  const kb = { category: ['kb'], sinks: ['mem'], lowestLevel: 'debug' as const }
  configureSync({
    reset: true,
    contextLocalStorage: new AsyncLocalStorage(),
    sinks: { mem: commonMemorySink },
    loggers: [meta, kb]
  })
}

function buildCommonApp() {
  return new Elysia({ prefix: '/api' })
    .use(rpcCommonPlugins)
    .post('/ok', () => ({ ok: true }), { body: t.Object({}, { additionalProperties: false }) })
    .post('/boom', () => {
      throw new Error('explode')
    })
}

function commonPostJson(path: string): Request {
  return new Request(`http://local${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })
}

function commonRpcRecords() {
  return commonRecords.filter(r => Array.isArray(r.category) && r.category[1] === 'rpc')
}

describe('rpcCommonPlugins', () => {
  beforeEach(() => {
    commonRecords.length = 0
    configureCommon()
  })
  afterEach(() => {
    commonRecords.length = 0
  })

  describe('when the handler succeeds', () => {
    beforeEach(async () => {
      await buildCommonApp().handle(commonPostJson('/api/ok'))
    })

    it('emits a Started log record', () => {
      const templates = commonRpcRecords().map(r => String(r.rawMessage))
      expect(templates.some(template => template.startsWith('Started'))).toBe(true)
    })
  })

  describe('when the handler throws', () => {
    let body: { error: string }

    beforeEach(async () => {
      const res = await buildCommonApp().handle(commonPostJson('/api/boom'))
      body = (await res.json()) as { error: string }
    })

    it('routes through the error contract', () => {
      expect(body.error).toBe('explode')
    })

    it('routes through the rpc logger', () => {
      const errors = commonRpcRecords().filter(r => r.level === 'error')
      expect(errors).toHaveLength(1)
    })
  })
})

// -- rpcErrorContract tests (was rpc_error.contract.spec.ts) -----------------

const HTTP_OK = 200
const HTTP_INTERNAL_ERROR = 500

const echoSchema = { body: t.Object({ value: t.String() }, { additionalProperties: false }) }

function buildContractApp() {
  const app = new Elysia({ prefix: '/api' }).use(rpcErrorContract)
  app.post('/echo', ({ body }) => body, echoSchema)
  app.post('/throw', () => {
    throw new Error('boom')
  })
  return app
}

function contractPostJson(path: string, body: unknown): Request {
  return new Request(`http://local${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('rpcErrorContract', () => {
  describe('when the handler succeeds', () => {
    it('returns the response body unchanged', async () => {
      const res = await buildContractApp().handle(contractPostJson('/api/echo', { value: 'hi' }))
      expect(res.status).toBe(HTTP_OK)
      expect(await res.json()).toEqual({ value: 'hi' })
    })
  })

  describe('when the handler throws', () => {
    let res: Response

    beforeEach(async () => {
      res = await buildContractApp().handle(contractPostJson('/api/throw', {}))
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
      res = await buildContractApp().handle(contractPostJson('/api/echo', { value: 42 }))
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
