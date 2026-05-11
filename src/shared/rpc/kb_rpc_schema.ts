import type { Knowledge } from '@core'
import type { ElectrobunRPCSchema, RPCSchema } from 'electrobun/bun'

/** Stable id + source row shape returned from SQLite (discriminated `Knowledge`). */
export type RpcKnowledge = Knowledge

/** Mirrors `getDbStats()` in the shell; kept here so `src/shared` stays shell-free. */
export type RpcDbStats = {
  total: number
  byType: Record<string, number>
}

/** Serializable config snapshot for `getConfig` / `saveConfig` responses. */
export type RpcGetConfigPayload = {
  configPath: string
  database: { path: string }
  sources: { path: string }
  display: {
    terminalApp?: string
    editorApp?: string
    pageSize: string
  }
}

/** Result shape for `sync` / `syncComplete` (matches `ImportService.run`). */
export type RpcImportResult = {
  filesProcessed: number
  inserted: number
  updated: number
  errors: string[]
}

export type TaskView = 'actionable' | 'today' | 'overdue' | 'this_week' | 'all_pending' | 'all_doing'

export type ListOpts = {
  query?: string
  tags?: string[]
  types?: Array<'bookmark' | 'command' | 'cheat' | 'task'>
  taskView?: TaskView
  limit?: number
  offset?: number
}

export type ListStats = {
  total: number
  bookmark: number
  command: number
  cheat: number
  task: number
  taskViews: Record<TaskView, number>
  /** Occurrence count per normalized tag (for filter dropdown). */
  tags: Record<string, number>
  byType: Record<string, number>
}

export type ConfigPatch = {
  sourcesDir?: string
  dbPath?: string
  configPath?: string
  terminalApp?: string
  editorApp?: string
  pageSize?: 25 | 50 | 100 | 200
}

export type OpenDialogOpts = {
  title?: string
  defaultPath?: string
  properties?: Array<'openFile' | 'openDirectory'>
}

export type PreviewImageResult = {
  url: string
  title?: string
}

/** Placeholder task mutation payloads (full validation in Phase 7). */
export type TaskCreateInput = { key: string; desc?: string }
export type TaskUpdateInput = { desc?: string }

/** Empty RPC params object (Electrobun requires a `params` property per method). */
export type RpcEmptyParams = Record<string, never>

/**
 * Electrobun combined RPC schema for kb.
 *
 * - `bun.requests` — webview calls main (async, return value).
 * - `webview.messages` — main pushes to webview (fire-and-forget).
 *
 * See `assets/guides/ELECTROBUN.md` for the official mapping.
 */
export type KbDesktopRpcSchema = ElectrobunRPCSchema & {
  bun: RPCSchema<{
    requests: {
      list: { params: ListOpts; response: RpcKnowledge[] }
      getEntry: { params: { id: number }; response: RpcKnowledge | null }
      getListStats: { params: RpcEmptyParams; response: ListStats }
      sync: { params: { sourcesDir?: string }; response: RpcImportResult }
      getStats: { params: RpcEmptyParams; response: RpcDbStats }
      getConfig: { params: RpcEmptyParams; response: RpcGetConfigPayload }
      saveConfig: { params: ConfigPatch; response: RpcGetConfigPayload }
      createTask: { params: TaskCreateInput; response: RpcKnowledge }
      updateTask: { params: { id: number; patch: TaskUpdateInput }; response: RpcKnowledge }
      deleteTask: { params: { id: number }; response: undefined }
      cycleStatus: { params: { id: number; dir: 'forward' | 'backward' }; response: RpcKnowledge }
      cyclePriority: { params: { id: number; dir: 'forward' | 'backward' }; response: RpcKnowledge }
      reorderTask: { params: { id: number; dir: 'up' | 'down' }; response: undefined }
      openExternal: { params: { url: string }; response: undefined }
      pasteInTerminal: { params: { cmd: string }; response: undefined }
      openInEditor: { params: { filePath: string }; response: undefined }
      showOpenDialog: { params: { opts?: OpenDialogOpts }; response: string | null }
      fetchPreviewImage: { params: { url: string }; response: PreviewImageResult | null }
      suggestTags: { params: { entryId: number }; response: string[] }
      resizeWindow: { params: { width: number; height: number }; response: undefined }
    }
    messages: Record<string, never>
  }>
  webview: RPCSchema<{
    requests: Record<string, never>
    messages: {
      syncProgress: { processed: number; total: number }
      syncComplete: RpcImportResult
    }
  }>
}
