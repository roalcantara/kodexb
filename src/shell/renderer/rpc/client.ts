import { treaty } from '@elysiajs/eden'
import { getLogger, RPC_LOG_PREVIEW_MAX_LEN } from '@shared/logging'
import type {
  BindingRef,
  ConfigPatch,
  DesktopRpcSchema,
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
  RpcListEntry,
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

/**
 * Electrobun-side webview RPC instance. Used for:
 *   - request bridge: `webviewRpc.request.rpcCall({...})` reaches the main
 *     process and is forwarded into `RpcApp.handle(request)`.
 *   - push messages: `syncProgress`, `syncComplete` from `App.sync` emitters.
 *
 * In the preview server the `electrobun/view` import is swapped at bundle
 * time for `packages/dev/src/preview/mock_electroview.script.ts`, which proxies `rpcCall`
 * through native `fetch` against the same `RpcApp` exposed over HTTP.
 */
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

export const rpc = treaty<RpcApp>(BRIDGE_ORIGIN, {
  fetcher: bridgeFetch as typeof fetch
})

type TreatyResult<T> = { data: T | null; error: { value: unknown; status: number } | null }

export function unwrap<T>(result: TreatyResult<T>): T {
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

type TreatyPending<T = unknown> = Promise<{ data: T | null; error: { value: unknown; status: number } | null }>

/**
 * Run an Eden Treaty call through `unwrap`, carrying the response type. Replaces
 * the repeated `rpc.api.X.post(...).then(unwrap) as Promise<T>` cast — the type
 * argument lives in one place (this signature) instead of at every call site.
 */
export function call<T>(pending: TreatyPending): Promise<T> {
  return pending.then(unwrap) as Promise<T>
}

/** Register main→renderer sync notifications (replace previous listeners). */
export function setSyncMessageHandlers(handlers: {
  onProgress?: (payload: RpcSyncProgressPayload) => void
  onComplete?: (result: RpcImportResult) => void
}): void {
  syncListeners.onProgress = handlers.onProgress
  syncListeners.onComplete = handlers.onComplete
}

export function listEntries(opts: ListOpts = {}): Promise<RpcListEntry[]> {
  return call<RpcListEntry[]>(rpc.api.list.post(opts))
}

export function listMatchCount(opts: ListOpts = {}): Promise<number> {
  return call<number>(rpc.api.listMatchCount.post(opts))
}

export function getListStats(
  body: Partial<Pick<ListOpts, 'query' | 'tags' | 'types' | 'taskView'>> = {}
): Promise<ListStats> {
  return call<ListStats>(rpc.api.getListStats.post(body))
}

export function getStats(): Promise<RpcDbStats> {
  return call<RpcDbStats>(rpc.api.getStats.post({}))
}

export function getEntry(id: number): Promise<RpcKnowledge | null> {
  return call<RpcKnowledge | null>(rpc.api.getEntry.post({ id }))
}

export function recordEntryVisit(id: number): Promise<{ ok: true }> {
  return call<{ ok: true }>(rpc.api.recordEntryVisit.post({ id }))
}

export function listBindings(): Promise<BindingRef[]> {
  return call<BindingRef[]>(rpc.api.listBindings.post({}))
}

export function listBindingsByChord(hash: string): Promise<BindingRef[]> {
  return call<BindingRef[]>(rpc.api.listBindingsByChord.post({ hash }))
}

export function recordBindingVisit(id: string, weight: number): Promise<{ ok: true }> {
  return call<{ ok: true }>(rpc.api.recordBindingVisit.post({ id, weight }))
}

export function getConfig(): Promise<RpcGetConfigPayload> {
  return call<RpcGetConfigPayload>(rpc.api.getConfig.post({}))
}

export function saveConfig(patch: ConfigPatch): Promise<RpcGetConfigPayload> {
  return call<RpcGetConfigPayload>(rpc.api.saveConfig.post(patch))
}

export function showOpenDialog(opts?: OpenDialogOpts): Promise<string | null> {
  return call<string | null>(rpc.api.showOpenDialog.post({ opts }))
}

export function syncRpc(sourcesDir?: string): Promise<RpcImportResult> {
  const params = sourcesDir === undefined ? {} : { sourcesDir }
  return call<RpcImportResult>(rpc.api.sync.post(params)).then(result => {
    notifyAfterSyncComplete(result)
    return result
  })
}

export function resizeWindow(width: number, height: number): Promise<void> {
  return call<void>(rpc.api.resizeWindow.post({ width, height }))
}

export function getWindowPosition(): Promise<{ x: number; y: number } | null> {
  return call<{ x: number; y: number } | null>(rpc.api.getWindowPosition.post({}))
}

export function setWindowPosition(x: number, y: number): Promise<void> {
  return call<void>(rpc.api.setWindowPosition.post({ x, y }))
}

export function openExternal(url: string): Promise<void> {
  return call<void>(rpc.api.openExternal.post({ url }))
}

export function fetchPreviewImage(url: string): Promise<PreviewImageResult | null> {
  return call<PreviewImageResult | null>(rpc.api.fetchPreviewImage.post({ url }))
}

export function pasteInTerminal(cmd: string): Promise<void> {
  return call<void>(rpc.api.pasteInTerminal.post({ cmd }))
}

export function runInTerminal(cmd: string): Promise<void> {
  return call<void>(rpc.api.runInTerminal.post({ cmd }))
}

export function pasteDoc(doc: string): Promise<void> {
  return call<void>(rpc.api.pasteDoc.post({ doc }))
}

export function openInEditor(filePath: string): Promise<void> {
  return call<void>(rpc.api.openInEditor.post({ filePath }))
}

export function suggestTags(entryId: number): Promise<string[]> {
  return call<string[]>(rpc.api.suggestTags.post({ entryId }))
}

export function hideWindow(): Promise<void> {
  return call<void>(rpc.api.hideWindow.post({}))
}

export function quitApp(): Promise<void> {
  return call<void>(rpc.api.quit.post({}))
}

export function getSyncInfo(): Promise<{ sourcesDir: string; fileCount: number }> {
  return call<{ sourcesDir: string; fileCount: number }>(rpc.api.getSyncInfo.post({}))
}

export {
  createTask,
  cyclePriority,
  cycleStatus,
  deleteTask,
  reorderTask,
  updateTask
} from './client_task_mutation.util'
