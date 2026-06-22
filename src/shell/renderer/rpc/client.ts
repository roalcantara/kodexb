import type {
  BindingRef,
  ConfigPatch,
  ListOpts,
  ListStats,
  OpenDialogOpts,
  PreviewImageResult,
  RpcDbStats,
  RpcGetConfigPayload,
  RpcImportResult,
  RpcKnowledge,
  RpcListEntry
} from '@shared/rpc'
import { notifyAfterSyncComplete } from './client_sync_complete.util'
import { call, onAfterSyncComplete, rpc, setSyncMessageHandlers } from './transport'

export { call, onAfterSyncComplete, setSyncMessageHandlers }

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
