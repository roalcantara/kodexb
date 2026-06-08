import { mountRouteModule, rpcSpecPostJson, setupRpcRouteSpecSuite } from '@testing'
import { runRoute } from '@testing/helpers/run_route.util'
import { catalogRoutes } from './catalog.routes'
import { taskRoutes } from './task.routes'

const OK_STATUS = 200

export function setupTaskRouteTestKit() {
  const { importedApp, postViaRoutes } = setupRpcRouteSpecSuite()

  async function firstSeededTask(): Promise<{ id: number; priority?: string; status?: string; updatedAt?: number }> {
    const listRes = await postViaRoutes(catalogRoutes, '/api/list', { types: ['task'] })
    if (listRes.status !== OK_STATUS) {
      throw new Error('Failed to list seeded tasks')
    }
    const tasks = (await listRes.json()) as Array<{
      id: number
      priority?: string
      status?: string
      updatedAt?: number
    }>
    if (tasks.length === 0) {
      throw new Error('No seeded tasks found')
    }
    return tasks.at(0) ?? { id: 0 }
  }

  async function firstSeededTaskId(): Promise<number> {
    return (await firstSeededTask()).id
  }

  async function postTask<T>(path: string, body: unknown): Promise<{ status: number; data: T }> {
    return await runRoute<T>(() => postViaRoutes(taskRoutes, path, body))
  }

  function cycleForward<T extends string>(values: readonly T[], current: string | undefined, fallback: T): T {
    const idx = values.indexOf((current ?? fallback) as T)
    const base = idx === -1 ? values.indexOf(fallback) : idx
    return values[(base + 1) % values.length] as T
  }

  return {
    importedApp,
    postViaRoutes,
    firstSeededTask,
    firstSeededTaskId,
    postTask,
    cycleForward,
    rpcSpecPostJson,
    mountRouteModule,
    runRoute,
    taskRoutes
  }
}
