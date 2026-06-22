import { treaty } from '@elysiajs/eden'
import { getLogger, RPC_LOG_PREVIEW_MAX_LEN } from '@shared/logging'
import type {
  DesktopRpcSchema,
  RpcCallParams,
  RpcCallResponse,
  RpcImportResult,
  RpcSyncProgressPayload
} from '@shared/rpc'
import { Electroview } from 'electrobun/view'
import { notifyAfterSyncComplete, onAfterSyncComplete } from './client_sync_complete.util'
import type { RpcApp } from './rpc_app.types'

export { onAfterSyncComplete }

const rpcClientLog = getLogger(['kb', 'ui', 'rpc-client'])

const RPC_TIMEOUT_MS = 60_000
const BRIDGE_ORIGIN = 'http://kb.local'

const syncListeners: {
  onProgress?: (payload: RpcSyncProgressPayload) => void
  onComplete?: (result: RpcImportResult) => void
} = {}

const webviewRpc = Electroview.defineRPC<DesktopRpcSchema>({
  maxRequestTime: RPC_TIMEOUT_MS,
  handlers: {
    requests: {},
    messages: {
      syncProgress: payload => {
        syncListeners.onProgress?.(payload)
      },
      syncComplete: result => {
        syncListeners.onComplete?.(result)
        notifyAfterSyncComplete(result)
      }
    }
  }
})

new Electroview({ rpc: webviewRpc })

type RpcCallRequest = (params: RpcCallParams) => Promise<RpcCallResponse>

const rpcCall = (webviewRpc.request as unknown as { rpcCall: RpcCallRequest }).rpcCall

async function bridgeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const parsed = new URL(url, BRIDGE_ORIGIN)
  const method = init?.method ?? 'POST'
  const path = `${parsed.pathname}${parsed.search}`
  const bodyText = await readInitBody(init?.body)
  const headers = extractHeaders(init?.headers)
  const requestId = headers
    ? 'x-request-id' in headers
      ? headers['x-request-id']
      : headers['X-Request-Id']
    : undefined

  rpcClientLog.info('→ {method} {path}', { method, path, requestId })

  if (rpcClientLog.isEnabledFor('debug') && bodyText !== undefined) {
    const preview =
      bodyText.length > RPC_LOG_PREVIEW_MAX_LEN ? `${bodyText.slice(0, RPC_LOG_PREVIEW_MAX_LEN)}…(truncated)` : bodyText
    rpcClientLog.debug('Request body', { body: preview })
  }

  const startedAt = performance.now()
  const result = await rpcCall({
    path,
    method,
    body: bodyText,
    headers
  })
  const durationMs = Math.round((performance.now() - startedAt) * 10) / 10

  rpcClientLog.info('← {status} {path} in {durationMs}ms', {
    status: result.status,
    path,
    durationMs,
    requestId
  })

  const payload = result.body.length === 0 ? 'null' : result.body
  return new Response(payload, {
    status: result.status,
    headers: { 'content-type': 'application/json' }
  })
}

function readInitBody(body: BodyInit | null | undefined): Promise<string | undefined> {
  if (body == null) return Promise.resolve(undefined)
  if (typeof body === 'string') return Promise.resolve(body)
  if (body instanceof ArrayBuffer) return Promise.resolve(new TextDecoder().decode(body))
  if (ArrayBuffer.isView(body)) {
    const view = body as ArrayBufferView
    return Promise.resolve(
      new TextDecoder().decode(new Uint8Array(view.buffer as ArrayBuffer, view.byteOffset, view.byteLength))
    )
  }
  return new Response(body).text()
}

function extractHeaders(input: HeadersInit | undefined): Record<string, string> | undefined {
  if (!input) return
  const headers = new Headers(input)
  const out: Record<string, string> = {}
  headers.forEach((value, key) => {
    out[key] = value
  })
  return out
}

export const rpc = treaty<RpcApp>(BRIDGE_ORIGIN, {
  fetcher: bridgeFetch as typeof fetch
})

type TreatyResult<T> = { data: T | null; error: { value: unknown; status: number } | null }

function extractErrorMessage(value: unknown): string {
  if (value && typeof value === 'object' && 'error' in value) {
    const e = (value as { error: unknown }).error
    if (typeof e === 'string') return e
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function unwrap<T>(result: TreatyResult<T>): T {
  if (result.error) {
    const value = result.error.value
    const message = typeof value === 'string' ? value : extractErrorMessage(value)
    throw new Error(message)
  }
  return result.data as T
}

type TreatyPending<T = unknown> = Promise<{ data: T | null; error: { value: unknown; status: number } | null }>

export function call<T>(pending: TreatyPending): Promise<T> {
  return pending.then(unwrap) as Promise<T>
}

export function setSyncMessageHandlers(handlers: {
  onProgress?: (payload: RpcSyncProgressPayload) => void
  onComplete?: (result: RpcImportResult) => void
}): void {
  syncListeners.onProgress = handlers.onProgress
  syncListeners.onComplete = handlers.onComplete
}
