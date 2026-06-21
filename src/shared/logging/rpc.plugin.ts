import { Elysia } from 'elysia'
import { getLogger, withContext } from './logger'

const rpcLog = getLogger(['kb', 'rpc'])

/** Max chars for RPC parameter/body previews in debug logs (main + renderer). */
export const RPC_LOG_PREVIEW_MAX_LEN = 2048
const OK_STATUS = 200
const DURATION_PRECISION = 10
const HTTP_INTERNAL_ERROR = 500

type RequestContext = {
  requestId: string
  action: string
  method: string
  path: string
}

function inspectParams(input: { body?: unknown; query?: unknown }): string {
  const result = input.body === undefined ? (input.query ?? {}) : input.body
  const text = Bun.inspect(result, { depth: 3 })
  return text.length > RPC_LOG_PREVIEW_MAX_LEN ? `${text.slice(0, RPC_LOG_PREVIEW_MAX_LEN)}…(truncated)` : text
}

/**
 * Elysia plugin that emits one `info` record at `Started`, one `debug` record
 * with parameters, one `info` record at `Completed`, and one `error` record
 * on uncaught errors. Records carry the `{ requestId, action, method, path }`
 * context fields via `withContext(...)`, so nested DB and AppService log
 * records inherit them without explicit propagation.
 *
 * `X-Request-Id`, when present, is honoured as the `requestId`. Otherwise a
 * UUID v4 is generated. The pretty formatter renders the first 8 hex chars
 * as `req=<short>`.
 */
export const rpcLogger = new Elysia({ name: 'kb-rpc-logger' })
  .derive({ as: 'global' }, ({ request }) => {
    // NOTE: do NOT destructure Elysia's `headers` context here -- combined
    // with `onTransform` it corrupts body parsing under `bun:test`. Reading
    // the header via the native `request.headers.get(...)` API sidesteps it.
    const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
    const url = new URL(request.url)
    return {
      requestId,
      action: `${request.method} ${url.pathname}`,
      method: request.method,
      path: url.pathname,
      startedAt: performance.now()
    }
  })
  .onTransform({ as: 'global' }, ({ requestId, action, method, path }) => {
    const ctx: RequestContext = { requestId, action, method, path }
    withContext(ctx, () => {
      rpcLog.info('Started {method} {path}', { method, path })
    })
  })
  .onBeforeHandle({ as: 'global' }, ctx => {
    const requestCtx: RequestContext = {
      requestId: ctx.requestId,
      action: ctx.action,
      method: ctx.method,
      path: ctx.path
    }
    withContext(requestCtx, () => {
      rpcLog.debug('Parameters: {params}', {
        params: inspectParams({ body: ctx.body, query: ctx.query })
      })
    })
  })
  .onAfterResponse({ as: 'global' }, ctx => {
    const duration = Math.round((performance.now() - ctx.startedAt) * DURATION_PRECISION) / DURATION_PRECISION
    const requestCtx: RequestContext = {
      requestId: ctx.requestId,
      action: ctx.action,
      method: ctx.method,
      path: ctx.path
    }
    withContext(requestCtx, () => {
      rpcLog.info('Completed {status} in {duration}ms', {
        status: ctx.set.status ?? OK_STATUS,
        duration
      })
    })
  })
  .onError({ as: 'global' }, ctx => {
    // `derive` may not have run yet (validation errors fire before it), so
    // these fields can be undefined. Fall back to the raw request envelope.
    const url = new URL(ctx.request.url)
    const requestCtx: RequestContext = {
      requestId: ctx.requestId ?? 'unknown',
      action: ctx.action ?? `${ctx.request.method} ${url.pathname}`,
      method: ctx.method ?? ctx.request.method,
      path: ctx.path ?? url.pathname
    }
    const err = ctx.error as Error & { code?: string }
    withContext(requestCtx, () => {
      rpcLog.error('{message}', {
        message: err.message,
        stack: err.stack,
        code: err.code
      })
    })
  })
  .as('global')

// -- error contract (was rpc_error.contract.ts) ---------------------------------

export const rpcErrorContract = new Elysia({ name: 'rpc-error' }).onError({ as: 'global' }, ({ error, set }) => {
  const message = error instanceof Error ? error.message : String(error)
  set.status = HTTP_INTERNAL_ERROR
  return { error: message }
})

// Order matters: `rpcLogger.onError` logs without returning a value, so
// Elysia's onError chain proceeds to `rpcErrorContract.onError`, which
// converts the error to the `{ error: string }` / HTTP 500 envelope. If we
// mounted `rpcErrorContract` first, the contract would return a response
// and short-circuit the logger's error hook before the error was recorded.
export const rpcCommonPlugins = new Elysia({ name: 'kb-rpc-common' }).use(rpcLogger).use(rpcErrorContract).as('global')
