import type {
  DesktopRpcSchema,
  RpcCallParams,
  RpcCallResponse,
  RpcImportResult,
  RpcSyncProgressPayload
} from '@shared/rpc'
import { BrowserView } from 'electrobun/bun'

import type { SyncEmitter } from '../../app/app'
import type { RpcApp } from './server'

const DEFAULT_RPC_TIMEOUT_MS = 60_000
const BRIDGE_ORIGIN = 'http://kb.local'
const ALLOWED_HEADERS = ['accept']

const PATH_PREFIX = '/api/'
const ALLOWED_METHOD = 'POST'

type RequestHandler = { handle: (req: Request) => Promise<Response> | Response }

export const bridge_error_codes = {
  invalid_path: 'RPC_BRIDGE_INVALID_PATH',
  invalid_method: 'RPC_BRIDGE_INVALID_METHOD',
  missing_path: 'RPC_BRIDGE_MISSING_PATH'
} as const

function bridgeRejection(type: string, detail?: string): RpcCallResponse {
  return {
    status: 400,
    body: JSON.stringify({ error: type, detail: detail ?? '' })
  }
}

function filterHeaders(headers?: Record<string, string>): Record<string, string> {
  if (!headers) return {}
  const filtered: Record<string, string> = {}
  for (const key of ALLOWED_HEADERS) {
    const value = headers[key]
    if (value !== undefined) filtered[key] = value
  }
  return filtered
}

/**
 * Validate the Electrobun bridge payload before forwarding to the Elysia
 * RpcApp. Rejects non-/api/ paths, non-POST methods, and filters headers
 * to the explicit allowlist.
 */
function validateBridgePayload(params: RpcCallParams): true {
  if (!params.path || params.path.trim() === '') {
    throw Object.assign(new Error('RPC bridge: path is required'), { code: bridge_error_codes.missing_path })
  }
  if (!params.path.startsWith(PATH_PREFIX)) {
    throw Object.assign(new Error('RPC bridge: path must start with /api/'), { code: bridge_error_codes.invalid_path })
  }
  const method = (params.method ?? '').trim()
  if (method !== '' && method.toUpperCase() !== ALLOWED_METHOD) {
    throw Object.assign(new Error('RPC bridge: only POST is allowed'), { code: bridge_error_codes.invalid_method })
  }
  return true
}

/**
 * Build a `Request` from the Electrobun-serialised RPC call payload and pass
 * it to the Elysia `RpcApp`. The bridge validates the payload envelope before
 * forwarding: only /api/ paths, only POST, only allowlisted headers.
 */
async function forwardToRpcApp(rpc: RequestHandler, params: RpcCallParams): Promise<RpcCallResponse> {
  try {
    validateBridgePayload(params)
  } catch (e) {
    const err = e as Error & { code?: string }
    return bridgeRejection(err.code ?? 'RPC_BRIDGE_REJECTED', err.message)
  }

  const method = params.method ?? ALLOWED_METHOD
  const headers = { 'content-type': 'application/json', ...filterHeaders(params.headers) }
  const init: RequestInit = {
    method,
    headers,
    body: params.body
  }
  const req = new Request(`${BRIDGE_ORIGIN}${params.path}`, init)
  const res = await rpc.handle(req)
  return { status: res.status, body: await res.text() }
}

/**
 * Build the Electrobun-side RPC object that owns:
 *   - the single `rpcCall` request handler that forwards to `RpcApp.handle`
 *   - typed `send.syncProgress` / `send.syncComplete` push messages
 *
 * Assign the returned `webviewRpc` as `BrowserWindow({ rpc })` so that
 * Electrobun attaches its transport to the same instance.
 */
export function createWebviewRpc(rpcApp: RpcApp, maxRequestTime = DEFAULT_RPC_TIMEOUT_MS) {
  // The Electrobun handler typing has an open-ended `_?: (method, params) => any`
  // fallback that widens every keyed handler to `(params?: unknown) => unknown`.
  // Cast the typed handler through `unknown` so the schema-typed signature
  // survives without losing the rest of the per-method types.
  const requests = {
    rpcCall: (params: RpcCallParams) => forwardToRpcApp(rpcApp, params)
  } as unknown as Parameters<typeof BrowserView.defineRPC<DesktopRpcSchema>>[0]['handlers']['requests']

  return BrowserView.defineRPC<DesktopRpcSchema>({
    maxRequestTime,
    handlers: {
      requests,
      messages: {}
    }
  })
}

/**
 * Emit object compatible with `App`'s constructor `emit` parameter that
 * pushes sync progress / completion through the Electrobun `webview.messages`
 * channel. Calling `send.*` before the transport is attached is a no-op
 * (Electrobun queues messages once the view is wired).
 */
export function createSyncEmitter(webviewRpc: ReturnType<typeof createWebviewRpc>): Required<SyncEmitter> {
  const send = webviewRpc.send as {
    syncProgress: (payload: RpcSyncProgressPayload) => void
    syncComplete: (payload: RpcImportResult) => void
  }
  return {
    syncProgress: payload => send.syncProgress(payload),
    syncComplete: result => send.syncComplete(result)
  }
}

/** Helpers exported for unit testing the request bridge without a window. */
export const testing_helpers = { forwardToRpcApp, validateBridgePayload, filterHeaders, bridge_error_codes }
