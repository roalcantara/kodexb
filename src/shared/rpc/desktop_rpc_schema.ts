import type { ElectrobunRPCSchema, RPCSchema } from 'electrobun/bun'
import type { Knowledge } from '../../core'

/** Stable id + source row shape returned from SQLite (discriminated `Knowledge`). */
export type RpcKnowledge = Knowledge

/** List/split row: knowledge plus local usage ranking (not in YAML). */
export type RpcListEntry = Knowledge & {
  frecencyScore: number
  visitCount: number
}

/** Mirrors `getDbStats()` in the shell; kept here so `src/shared` stays shell-free. */
export type RpcDbStats = {
  total: number
  byType: Record<string, number>
  dbPath: string
  dbSize: number
}

/** Serializable config snapshot for `getConfig` / `saveConfig` responses. */

/**
 * ├─ CONTRACT NOTE ──────────────────────────────────────────────
 * │ Several shared types (ListOpts, ConfigPatch, TaskCreateInput,
 * │ TaskUpdateInput, OpenDialogOpts) have corresponding TypeBox
 * │ schemas in src/shell/main/rpc/schemas.ts. The shared types are
 * │ intentionally hand-written because:
 * │
 * │  1. src/shared/ must not import from src/shell/ (FCIS).
 * │  2. The renderer imports shared types for Eden Treaty typing;
 * │     TypeBox schemas live in shell/main/ for transport validation.
 * │  3. Route-contract tests in src/shell/main/rpc/schemas.spec.ts
 * │     assert that valid payloads match both the schema and the
 * │     shared type's shape, catching drift at test time.
 * │
 * │ When changing RPC payloads, update both the TypeBox schema AND
 * │ this shared type, then run bun test src/shell/main/rpc.
 * └──────────────────────────────────────────────────────────────
 */
export type RpcGetConfigPayload = {
  configPath: string
  database: { path: string }
  sources: { path: string }
  display: {
    terminalApp?: string
    editorApp?: string
    pageSize: string
    advisories?: boolean
  }
}

/** Result shape for `sync` / `syncComplete` (matches `ImportService.run`). */
export type RpcImportResult = {
  filesProcessed: number
  inserted: number
  updated: number
  errors: string[]
  warnings: string[]
  fileLog: RpcSyncFileResult[]
}

/** One source file finished (success or failure) during import. */
export type RpcSyncFileResult = {
  path: string
  label: string
  ok: boolean
  error?: string
  inserted: number
  updated: number
}

/** Main→renderer push while `sync` runs (hybrid with Eden `sync` response). */
export type RpcSyncProgressPayload = {
  processed: number
  total: number
  recentFile?: RpcSyncFileResult
}

export type TaskView = 'actionable' | 'today' | 'overdue' | 'this_week' | 'all_pending' | 'all_doing'

export type ListOpts = {
  query?: string
  tags?: string[]
  types?: Array<'bookmark' | 'command' | 'cheat' | 'shortcut' | 'task'>
  taskView?: TaskView
  limit?: number
  offset?: number
}

export type ListStats = {
  total: number
  bookmark: number
  command: number
  cheat: number
  shortcut: number
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

/** A single flattened binding row returned by the RPC. */
export type BindingRef = {
  bindingId: string
  entryKey: string
  app: string
  platform: 'macos' | 'linux' | 'windows' | 'any'
  scope: 'global' | 'local'
  chordHash: string
  chordPrefix: string | null
  action: string
}

/** Task mutation payloads (full CRUD in App layer). */
export type TaskCreateInput = {
  key: string
  desc?: string
  tags?: string[]
  priority?: 'low' | 'mid' | 'high' | 'urgent'
  dueDate?: number
  dependsOn?: number[]
}
export type TaskUpdateInput = {
  key?: string
  desc?: string
  tags?: string[]
  status?: 'todo' | 'doing' | 'done'
  priority?: 'low' | 'mid' | 'high' | 'urgent'
  dueDate?: number
  dependsOn?: number[]
}

/**
 * Single Electrobun bridge method — the renderer's Eden Treaty client forwards
 * every `/api/*` call through `rpcCall`. `RpcApp.handle` interprets the
 * payload as a real HTTP `Request` and returns its serialised `Response`.
 */
export type RpcCallParams = {
  path: string
  method?: string
  body?: string
  headers?: Record<string, string>
}

export type RpcCallResponse = {
  status: number
  body: string
}

/**
 * Electrobun combined RPC schema (post-Phase 5).
 *
 * - `bun.requests.rpcCall` — single Eden bridge method. Every renderer
 *   `/api/*` call funnels here so the main process can dispatch through the
 *   Elysia `RpcApp` (`createRpcServer`). There are no other request methods:
 *   per-route typing now comes from `RpcApp` via Eden Treaty.
 * - `webview.messages` — main pushes to renderer (fire-and-forget). Used for
 *   hybrid sync progress / completion alongside the Eden bridge.
 *
 * See `assets/guides/ELECTROBUN.md` for the official mapping.
 */
export type DesktopRpcSchema = ElectrobunRPCSchema & {
  bun: RPCSchema<{
    requests: {
      rpcCall: { params: RpcCallParams; response: RpcCallResponse }
    }
    messages: Record<string, never>
  }>
  webview: RPCSchema<{
    requests: Record<string, never>
    messages: {
      syncProgress: RpcSyncProgressPayload
      syncComplete: RpcImportResult
    }
  }>
}
