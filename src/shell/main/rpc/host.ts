import { BrowserView } from 'electrobun/bun'
import type { KbDesktopRpcSchema, RpcCallParams, RpcCallResponse, RpcImportResult } from '../../../shared/rpc'

import type { SyncEmitter } from '../../app/app'
import type { RpcApp } from './server'

const DEFAULT_RPC_TIMEOUT_MS = 60_000
const BRIDGE_ORIGIN = 'http://kb.local'

type RequestHandler = { handle: (req: Request) => Promise<Response> | Response }

/**
 * Build a `Request` from the Electrobun-serialised RPC call payload and pass
 * it to the Elysia `RpcApp`. Headers default to JSON because every kb route
 * uses TypeBox bodies; explicit headers from the caller win.
 */
async function forwardToRpcApp(rpc: RequestHandler, params: RpcCallParams): Promise<RpcCallResponse> {
  const method = params.method ?? 'POST'
  const headers = { 'content-type': 'application/json', ...(params.headers ?? {}) }
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
 * Assign the returned `kbWebviewRpc` as `BrowserWindow({ rpc })` so that
 * Electrobun attaches its transport to the same instance.
 */
export function createKbWebviewRpc(rpcApp: RpcApp, maxRequestTime = DEFAULT_RPC_TIMEOUT_MS) {
  // The Electrobun handler typing has an open-ended `_?: (method, params) => any`
  // fallback that widens every keyed handler to `(params?: unknown) => unknown`.
  // Cast the typed handler through `unknown` so the schema-typed signature
  // survives without losing the rest of the per-method types.
  const requests = {
    rpcCall: (params: RpcCallParams) => forwardToRpcApp(rpcApp, params)
  } as unknown as Parameters<typeof BrowserView.defineRPC<KbDesktopRpcSchema>>[0]['handlers']['requests']

  return BrowserView.defineRPC<KbDesktopRpcSchema>({
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
export function createSyncEmitter(webviewRpc: ReturnType<typeof createKbWebviewRpc>): Required<SyncEmitter> {
  const send = webviewRpc.send as {
    syncProgress: (payload: { processed: number; total: number }) => void
    syncComplete: (payload: RpcImportResult) => void
  }
  return {
    syncProgress: (processed, total) => send.syncProgress({ processed, total }),
    syncComplete: result => send.syncComplete(result)
  }
}

/** Helpers exported for unit testing the request bridge without a window. */
export const testing_helpers = { forwardToRpcApp }
