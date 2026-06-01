import { rpcCommonPlugins } from '@shared/logging'
import { Elysia } from 'elysia'

import type { App } from '../../app/app'
import { catalogRoutes } from './routes/catalog.routes'
import { configSyncRoutes } from './routes/config_sync.routes'
import { handoffRoutes } from './routes/handoff.routes'
import { shellRoutes } from './routes/shell.routes'
import { taskRoutes } from './routes/task.routes'

/**
 * Single source of truth for the main ↔ renderer transport contract.
 *
 * Routes are POST `/api/<method>` with TypeBox-validated JSON bodies. Each
 * handler delegates to `App` and returns a JSON-serialisable value.
 *
 * The error contract (`{ error: string }`/HTTP 500 envelope) and the request
 * lifecycle logger ship together via `rpcCommonPlugins`; the preview server
 * mounts the same bundle so renderer ↔ main and preview share one transport.
 *
 * Adding a route:
 * 1. Add a TypeBox schema in `schemas.ts` when needed.
 * 2. Register `.post(...)` in the matching `routes/*.routes.ts` module.
 * 3. Use `invokeRoute` when mapping expected failures to a non-500 status (default 422).
 * 4. Add or extend a case in the matching `routes/*.routes.spec.ts`.
 * 5. No preview-server change — it mounts `createRpcServer` as-is.
 */
export function createRpcServer(appInstance: App) {
  return new Elysia({ prefix: '/api' })
    .use(rpcCommonPlugins)
    .use(catalogRoutes(appInstance))
    .use(taskRoutes(appInstance))
    .use(handoffRoutes(appInstance))
    .use(configSyncRoutes(appInstance))
    .use(shellRoutes(appInstance))
}

export type RpcApp = ReturnType<typeof createRpcServer>
