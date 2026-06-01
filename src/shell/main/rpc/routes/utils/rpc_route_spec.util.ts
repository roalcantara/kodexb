import { afterEach, beforeAll } from 'bun:test'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import { configureMainLogging, rpcCommonPlugins } from '@shared/logging'
import {
  createTempDir,
  factoryFor,
  recordingTerminalShellHook,
  type TempDir,
  testingPaths,
  throwingShellHook
} from '@testing'
import { Elysia } from 'elysia'

import { App } from '../../../../app/app'
import type { LoadedConfig } from '../../../../app/config/config.loader'
import { ImportService } from '../../../../app/db/import.service'
import type { AppShellHooks } from '../../../../app/lib/app_shell_hooks.types'
import { createRpcServer, type RpcApp } from '../../server'
import type { catalogRoutes } from '../catalog.routes'
import type { configSyncRoutes } from '../config_sync.routes'
import type { handoffRoutes } from '../handoff.routes'
import type { shellRoutes } from '../shell.routes'
import type { taskRoutes } from '../task.routes'

export type RpcRoutePluginFactory =
  | typeof catalogRoutes
  | typeof configSyncRoutes
  | typeof handoffRoutes
  | typeof shellRoutes
  | typeof taskRoutes

export const RPC_SPEC_API_BASE = 'http://local/api'

export function rpcSpecPostJson(reqPath: string, body: unknown): Request {
  return new Request(`http://local${reqPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

export function mountRouteModule(app: App, routes: RpcRoutePluginFactory) {
  return new Elysia({ prefix: '/api' }).use(rpcCommonPlugins).use(routes(app))
}

/** Isolated sources + DB paths; copies minimal fixtures so task write-back never touches git. */
async function rpcRouteSpecLoadedConfig(tmp: TempDir): Promise<LoadedConfig> {
  const sourcesDir = join(tmp.dir, 'sources')
  await fs.cp(testingPaths.minimal, sourcesDir, { recursive: true })
  return factoryFor('loadedConfig', {
    overrides: {
      configPath: join(tmp.dir, 'config.yaml'),
      database: { path: join(tmp.dir, 'kb.sqlite') },
      sources: { path: sourcesDir },
      writeTarget: join(sourcesDir, 'tasks.yml')
    }
  })
}

export function createRpcRouteSpecHarness(options: { onTempDir: (tmp: TempDir) => void }) {
  async function loadedFixture(): Promise<LoadedConfig> {
    const tmp = await createTempDir('rpc-route-spec-')
    options.onTempDir(tmp)
    return rpcRouteSpecLoadedConfig(tmp)
  }

  async function importedApp(): Promise<App> {
    const loaded = await loadedFixture()
    const importer = new ImportService(loaded.database.path)
    await importer.run(loaded.sources.path)
    return new App(loaded)
  }

  async function defaultShellApp(): Promise<App> {
    const loaded = await loadedFixture()
    return new App(loaded, {}, 'default', {})
  }

  function memoryApp(hooks: AppShellHooks = {}): App {
    const config = factoryFor('loadedConfig', { overrides: { database: { path: ':memory:' } } })
    return new App(config, {}, 'default', hooks)
  }

  async function postViaRoutes(
    routes: RpcRoutePluginFactory,
    path: string,
    body: unknown,
    app: App | (() => Promise<App>) = importedApp
  ) {
    const resolvedApp = typeof app === 'function' ? await app() : app
    const rpc = mountRouteModule(resolvedApp, routes)
    return rpc.handle(rpcSpecPostJson(path, body))
  }

  async function postFullRpc(path: string, body: unknown) {
    const rpc = createRpcServer(await importedApp())
    return rpc.handle(rpcSpecPostJson(path, body))
  }

  async function handleFullRpc(request: Request) {
    const rpc: RpcApp = createRpcServer(await importedApp())
    return rpc.handle(request)
  }

  function postDefaultShellViaRoutes(routes: RpcRoutePluginFactory, path: string, body: unknown) {
    return postViaRoutes(routes, path, body, defaultShellApp)
  }

  async function shellHookViaRoutes(routes: RpcRoutePluginFactory, hooks: AppShellHooks, path: string, body: unknown) {
    const loaded = await loadedFixture()
    return postViaRoutes(routes, path, body, new App(loaded, {}, 'default', hooks))
  }

  return {
    importedApp,
    defaultShellApp,
    memoryApp,
    postViaRoutes,
    postFullRpc,
    handleFullRpc,
    postDefaultShellViaRoutes,
    shellHookViaRoutes
  }
}

export function setupRpcRouteSpecSuite() {
  beforeAll(() => {
    configureMainLogging()
  })

  let tmp: TempDir | undefined
  const harness = createRpcRouteSpecHarness({
    onTempDir: next => {
      tmp = next
    }
  })

  afterEach(async () => {
    await tmp?.cleanup()
    tmp = undefined
  })

  return {
    ...harness,
    recordingTerminalShellHook,
    throwingShellHook
  }
}
