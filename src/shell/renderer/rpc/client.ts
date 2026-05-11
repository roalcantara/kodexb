import { treaty } from '@elysiajs/eden'
import type {
  ConfigPatch,
  KbDesktopRpcSchema,
  ListOpts,
  ListStats,
  OpenDialogOpts,
  PreviewImageResult,
  RpcCallParams,
  RpcCallResponse,
  RpcDbStats,
  RpcGetConfigPayload,
  RpcImportResult,
  RpcKnowledge,
  TaskCreateInput,
  TaskUpdateInput
} from '@shared/rpc'
import { Electroview } from 'electrobun/view'

import type { RpcApp } from './rpc_app.types'

const RPC_TIMEOUT_MS = 60_000
const BRIDGE_ORIGIN = 'http://kb.local'

const syncListeners: {
  onProgress?: (payload: { processed: number; total: number }) => void
  onComplete?: (result: RpcImportResult) => void
} = {}

/**
 * Electrobun-side webview RPC instance. Used for:
 *   - request bridge: `kbWebviewRpc.request.rpcCall({...})` reaches the main
 *     process and is forwarded into `RpcApp.handle(request)`.
 *   - push messages: `syncProgress`, `syncComplete` from `App.sync` emitters.
 *
 * In the preview server the `electrobun/view` import is swapped at bundle
 * time for `tools/preview/mock_electroview.ts`, which proxies `rpcCall`
 * through native `fetch` against the same `RpcApp` exposed over HTTP.
 */
const kbWebviewRpc = Electroview.defineRPC<KbDesktopRpcSchema>({
  maxRequestTime: RPC_TIMEOUT_MS,
  handlers: {
    requests: {},
    messages: {
      syncProgress: payload => {
        syncListeners.onProgress?.(payload)
      },
      syncComplete: result => {
        syncListeners.onComplete?.(result)
      }
    }
  }
})

new Electroview({ rpc: kbWebviewRpc })

type RpcCallRequest = (params: RpcCallParams) => Promise<RpcCallResponse>

const rpcCall = (kbWebviewRpc.request as unknown as { rpcCall: RpcCallRequest }).rpcCall

/**
 * Eden Treaty `fetcher` override — every Treaty call (e.g. `rpc.api.list.post(...)`)
 * is translated into a single Electrobun `rpcCall` RPC. The main process turns
 * the serialised payload back into a `Request` and dispatches through the
 * Elysia `RpcApp`. The resulting `{ status, body }` becomes a native `Response`
 * so Treaty's normal data / error pipeline runs unchanged.
 */
async function bridgeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const parsed = new URL(url, BRIDGE_ORIGIN)
  const bodyText = await readInitBody(init?.body)
  const headers = extractHeaders(init?.headers)
  const result = await rpcCall({
    path: `${parsed.pathname}${parsed.search}`,
    method: init?.method ?? 'POST',
    body: bodyText,
    headers
  })
  // Eden Treaty calls `Response.json()` unconditionally; an empty body
  // (`App.openExternal` returns `void`) breaks that parser. Default empty
  // bodies to JSON `null` so Treaty surfaces `data === null` instead.
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

const rpc = treaty<RpcApp>(BRIDGE_ORIGIN, {
  fetcher: bridgeFetch as typeof fetch
})

type TreatyResult<T> = { data: T | null; error: { value: unknown; status: number } | null }

function unwrap<T>(result: TreatyResult<T>): T {
  if (result.error) {
    const value = result.error.value
    const message = typeof value === 'string' ? value : extractErrorMessage(value)
    throw new Error(message)
  }
  // `result.data === null` is a valid value: `getEntry` resolves to null when
  // the row is missing, and void-returning routes (`openExternal`,
  // `resizeWindow`, ...) deserialise to null via `bridgeFetch`.
  return result.data as T
}

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

/** Register main→renderer sync notifications (replace previous listeners). */
export function setSyncMessageHandlers(handlers: {
  onProgress?: (payload: { processed: number; total: number }) => void
  onComplete?: (result: RpcImportResult) => void
}): void {
  syncListeners.onProgress = handlers.onProgress
  syncListeners.onComplete = handlers.onComplete
}

export function listEntries(opts: ListOpts = {}): Promise<RpcKnowledge[]> {
  return rpc.api.list.post(opts).then(unwrap) as Promise<RpcKnowledge[]>
}

export function getListStats(): Promise<ListStats> {
  return rpc.api.getListStats.post({}).then(unwrap) as Promise<ListStats>
}

export function getStats(): Promise<RpcDbStats> {
  return rpc.api.getStats.post({}).then(unwrap) as Promise<RpcDbStats>
}

export function getEntry(id: number): Promise<RpcKnowledge | null> {
  return rpc.api.getEntry.post({ id }).then(unwrap) as Promise<RpcKnowledge | null>
}

export function getConfig(): Promise<RpcGetConfigPayload> {
  return rpc.api.getConfig.post({}).then(unwrap) as Promise<RpcGetConfigPayload>
}

export function saveConfig(patch: ConfigPatch): Promise<RpcGetConfigPayload> {
  return rpc.api.saveConfig.post(patch).then(unwrap) as Promise<RpcGetConfigPayload>
}

export function showOpenDialog(opts?: OpenDialogOpts): Promise<string | null> {
  return rpc.api.showOpenDialog.post({ opts }).then(unwrap) as Promise<string | null>
}

export function syncRpc(sourcesDir?: string): Promise<RpcImportResult> {
  const params = sourcesDir === undefined ? {} : { sourcesDir }
  return rpc.api.sync.post(params).then(unwrap) as Promise<RpcImportResult>
}

export function resizeWindow(width: number, height: number): Promise<void> {
  return rpc.api.resizeWindow.post({ width, height }).then(unwrap) as Promise<void>
}

export function openExternal(url: string): Promise<void> {
  return rpc.api.openExternal.post({ url }).then(unwrap) as Promise<void>
}

export function fetchPreviewImage(url: string): Promise<PreviewImageResult | null> {
  return rpc.api.fetchPreviewImage.post({ url }).then(unwrap) as Promise<PreviewImageResult | null>
}

export function createTask(input: TaskCreateInput): Promise<RpcKnowledge> {
  return rpc.api.createTask.post(input).then(unwrap) as Promise<RpcKnowledge>
}

export function updateTask(id: number, patch: TaskUpdateInput): Promise<RpcKnowledge> {
  return rpc.api.updateTask.post({ id, patch }).then(unwrap) as Promise<RpcKnowledge>
}

export function deleteTask(id: number): Promise<void> {
  return rpc.api.deleteTask.post({ id }).then(unwrap) as Promise<void>
}

export function cycleStatus(id: number, dir: 'forward' | 'backward'): Promise<RpcKnowledge> {
  return rpc.api.cycleStatus.post({ id, dir }).then(unwrap) as Promise<RpcKnowledge>
}

export function cyclePriority(id: number, dir: 'forward' | 'backward'): Promise<RpcKnowledge> {
  return rpc.api.cyclePriority.post({ id, dir }).then(unwrap) as Promise<RpcKnowledge>
}

export function reorderTask(id: number, dir: 'up' | 'down'): Promise<RpcKnowledge[]> {
  return rpc.api.reorderTask.post({ id, dir }).then(unwrap) as Promise<RpcKnowledge[]>
}
