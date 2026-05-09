import type {
  ConfigPatch,
  KbDesktopRpcSchema,
  ListOpts,
  ListStats,
  OpenDialogOpts,
  PreviewImageResult,
  RpcEmptyParams,
  RpcGetConfigPayload,
  RpcImportResult,
  RpcKnowledge
} from '@shared/rpc'
import { Electroview } from 'electrobun/view'

const emptyParams = {} as RpcEmptyParams

const syncListeners: {
  onProgress?: (payload: { processed: number; total: number }) => void
  onComplete?: (result: RpcImportResult) => void
} = {}

const kbWebviewRpc = Electroview.defineRPC<KbDesktopRpcSchema>({
  maxRequestTime: 60_000,
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

/** Register main→renderer sync notifications (replace previous listeners). */
export function setSyncMessageHandlers(handlers: {
  onProgress?: (payload: { processed: number; total: number }) => void
  onComplete?: (result: RpcImportResult) => void
}): void {
  syncListeners.onProgress = handlers.onProgress
  syncListeners.onComplete = handlers.onComplete
}

export function listEntries(opts: ListOpts = {}): Promise<RpcKnowledge[]> {
  return kbWebviewRpc.request.list(opts) as Promise<RpcKnowledge[]>
}

export function getListStats(): Promise<ListStats> {
  return kbWebviewRpc.request.getListStats(emptyParams) as Promise<ListStats>
}

export function getEntry(id: number): Promise<RpcKnowledge | null> {
  return kbWebviewRpc.request.getEntry({ id }) as Promise<RpcKnowledge | null>
}

export function getConfig(): Promise<RpcGetConfigPayload> {
  return kbWebviewRpc.request.getConfig(emptyParams) as Promise<RpcGetConfigPayload>
}

export function saveConfig(patch: ConfigPatch): Promise<RpcGetConfigPayload> {
  return kbWebviewRpc.request.saveConfig(patch) as Promise<RpcGetConfigPayload>
}

export function showOpenDialog(opts?: OpenDialogOpts): Promise<string | null> {
  const params = opts === undefined ? {} : { opts }
  return kbWebviewRpc.request.showOpenDialog(params) as Promise<string | null>
}

export function syncRpc(sourcesDir?: string): Promise<RpcImportResult> {
  const params = sourcesDir === undefined ? {} : { sourcesDir }
  return kbWebviewRpc.request.sync(params) as Promise<RpcImportResult>
}

export function resizeWindow(width: number, height: number): Promise<void> {
  return kbWebviewRpc.request.resizeWindow({ width, height }) as Promise<void>
}

export function openExternal(url: string): Promise<void> {
  return kbWebviewRpc.request.openExternal({ url }) as Promise<void>
}

export function fetchPreviewImage(url: string): Promise<PreviewImageResult | null> {
  return kbWebviewRpc.request.fetchPreviewImage({ url }) as Promise<PreviewImageResult | null>
}
