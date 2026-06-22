import type { Static } from '@sinclair/typebox'
import type { ElectrobunRPCSchema, RPCSchema } from 'electrobun/bun'
import type { Knowledge } from '../../core'
import type {
  bindingRefSchema,
  configPatchSchema,
  listOptsSchema,
  listStatsSchema,
  showOpenDialogSchema,
  taskCreateSchema,
  taskUpdateSchema
} from './payload_schemas'

// ARCH-1 AC1: `TaskView` is owned by core; re-exported here for backward
// compatibility only. New consumers should import from `@core` directly.
export type { TaskView } from '../../core/domain/models/knowledges/task_views/task_view.types'

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
 * │ Six request-payload types (TaskView, ListOpts, ConfigPatch,
 * │ TaskCreateInput, TaskUpdateInput, OpenDialogOpts) are now
 * │ derived via Static<typeof schema> from the TypeBox schemas
 * │ in shared/rpc/payload_schemas.ts — single source, impossible
 * │ to drift by construction. Response-only types remain
 * │ hand-written (no schema exists for them).
 * │
 * │ When changing RPC payloads, update the TypeBox schema in
 * │ payload_schemas.ts; the derived types update automatically.
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

export type ListOpts = Static<typeof listOptsSchema>

export type ListStats = Static<typeof listStatsSchema>

export type ConfigPatch = Static<typeof configPatchSchema>

export type OpenDialogOpts = NonNullable<Static<typeof showOpenDialogSchema>['opts']>

export type PreviewImageResult = {
  url: string
  title?: string
}

/** A single flattened binding row returned by the RPC. */
export type BindingRef = Static<typeof bindingRefSchema>

/** Task mutation payloads (full CRUD in App layer). */
export type TaskCreateInput = Static<typeof taskCreateSchema>
export type TaskUpdateInput = Static<typeof taskUpdateSchema>['patch']

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
