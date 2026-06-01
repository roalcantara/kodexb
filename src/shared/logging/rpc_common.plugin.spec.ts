import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { AsyncLocalStorage } from 'node:async_hooks'
import { configureSync, type LogRecord } from '@logtape/logtape'
import { Elysia, t } from 'elysia'
import { rpcCommonPlugins } from './rpc_common.plugin'

const records: LogRecord[] = []

function memorySink(record: LogRecord) {
  records.push(record)
}

function configure() {
  const meta = { category: ['logtape', 'meta'], sinks: [], lowestLevel: 'fatal' as const }
  const kb = { category: ['kb'], sinks: ['mem'], lowestLevel: 'debug' as const }
  configureSync({
    reset: true,
    contextLocalStorage: new AsyncLocalStorage(),
    sinks: { mem: memorySink },
    loggers: [meta, kb]
  })
}

function buildApp() {
  return new Elysia({ prefix: '/api' })
    .use(rpcCommonPlugins)
    .post('/ok', () => ({ ok: true }), { body: t.Object({}, { additionalProperties: false }) })
    .post('/boom', () => {
      throw new Error('explode')
    })
}

function postJson(path: string): Request {
  return new Request(`http://local${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })
}

function rpcRecords() {
  return records.filter(r => Array.isArray(r.category) && r.category[1] === 'rpc')
}

describe('rpcCommonPlugins', () => {
  beforeEach(() => {
    records.length = 0
    configure()
  })
  afterEach(() => {
    records.length = 0
  })

  describe('when the handler succeeds', () => {
    beforeEach(async () => {
      await buildApp().handle(postJson('/api/ok'))
    })

    it('emits a Started log record', () => {
      const templates = rpcRecords().map(r => String(r.rawMessage))
      expect(templates.some(template => template.startsWith('Started'))).toBe(true)
    })
  })

  // The error-contract response shape (HTTP 500 + `{ error: '<message>' }`)
  // is owned by `rpc_error.contract.spec.ts`; the composition spec only
  // verifies that mounting `rpcCommonPlugins` actually attaches both
  // plugins, by checking one fingerprint per plugin.
  describe('when the handler throws', () => {
    let body: { error: string }

    beforeEach(async () => {
      const res = await buildApp().handle(postJson('/api/boom'))
      body = (await res.json()) as { error: string }
    })

    it('routes through the error contract', () => {
      expect(body.error).toBe('explode')
    })

    it('routes through the rpc logger', () => {
      const errors = rpcRecords().filter(r => r.level === 'error')
      expect(errors).toHaveLength(1)
    })
  })
})
