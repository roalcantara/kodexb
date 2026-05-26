import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { AsyncLocalStorage } from 'node:async_hooks'
import { configureSync, type LogRecord } from '@logtape/logtape'
import { Elysia, t } from 'elysia'
import { rpcLogger } from './rpc.middleware'

type CapturedRecord = LogRecord & { category: readonly string[] }

// `records` is a const so the sink closure and the test always read the same
// array; `beforeEach` resets contents via `.length = 0` instead of reassigning.
const records: CapturedRecord[] = []

function memorySink(record: LogRecord) {
  records.push(record as CapturedRecord)
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

function buildApp() {
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
  return records.filter(r => r.category.join('.') === 'kb.rpc').map(r => String(r.rawMessage))
}

function rpcRecords() {
  return records.filter(r => r.category.join('.') === 'kb.rpc')
}

describe('rpcLogger', () => {
  beforeEach(() => {
    records.length = 0
  })
  afterEach(() => {
    records.length = 0
  })

  // NOTE: `onAfterResponse` does not fire under `app.handle(req)` because no
  // real HTTP socket sees the response; the `Completed` line is exercised
  // end-to-end by `src/shell/main/rpc/server.spec.ts`. Specs here cover
  // `Started`, `Parameters`, and error emission only.
  describe.each([
    { level: 'debug' as const, parameters: true },
    { level: 'info' as const, parameters: false }
  ])('when LOG_LEVEL=$level', ({ level, parameters }) => {
    beforeEach(async () => {
      configureAt(level)
      await buildApp().handle(postJson('/api/list', {}))
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
      res = await buildApp().handle(postJson('/api/boom', {}))
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
      await buildApp().handle(postJson('/api/list', {}, { 'x-request-id': customId }))
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
      await buildApp().handle(postJson('/api/list', {}))
    })

    it('generates a request id', () => {
      const id = rpcRecords()[0]?.properties?.requestId as string
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThanOrEqual(8)
    })
  })
})
