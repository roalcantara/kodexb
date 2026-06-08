import { describe, expect, it } from 'bun:test'
import type { TaskMutationOutcome } from '@shared/rpc'
import { runRoute } from '@testing/helpers/run_route.util'
import { setupTaskRouteTestKit } from './task_routes_test.util'

describe('taskRoutes atomicity', () => {
  const { importedApp, postViaRoutes, mountRouteModule, rpcSpecPostJson, taskRoutes, firstSeededTask } =
    setupTaskRouteTestKit()

  it('returns source_write_failed when source persistence fails', async () => {
    const app = await importedApp()
    ;(app as unknown as { loaded: { writeTarget: string } }).loaded.writeTarget = '/dev/null/tasks.yml'

    expect(
      runRoute<TaskMutationOutcome<never>>(() => {
        const rpc = mountRouteModule(app, taskRoutes)
        return rpc.handle(rpcSpecPostJson('/api/createTask', { key: 'Atomicity probe', desc: 'force source failure' }))
      })
    ).resolves.toMatchObject({
      status: 200,
      data: {
        ok: false,
        status: 'source_write_failed',
        operation: 'create'
      }
    })
  })

  it('returns conflict when sourceVersion is stale', async () => {
    const task = await firstSeededTask()
    const sourceVersion = (task.updatedAt ?? Date.now()) - 1

    expect(
      runRoute<TaskMutationOutcome<never>>(() =>
        postViaRoutes(taskRoutes, '/api/updateTask', {
          id: task.id,
          sourceVersion,
          patch: { desc: 'stale update' }
        })
      )
    ).resolves.toMatchObject({
      status: 200,
      data: {
        ok: false,
        status: 'conflict',
        operation: 'update',
        taskId: task.id,
        details: {
          requestSourceVersion: sourceVersion,
          currentSourceVersion: expect.any(Number)
        }
      }
    })
  })

  it('does not emit failure diagnostics on success path', async () => {
    const response = await runRoute<TaskMutationOutcome<{ type: string; key: string; status: string }>>(() =>
      postViaRoutes(taskRoutes, '/api/createTask', {
        key: 'RPC route task diagnostics',
        desc: 'success should not include failure details'
      })
    )
    expect(response.status).toBe(200)
    expect(response.data.ok).toBe(true)
    if (response.data.ok) {
      expect('details' in response.data).toBe(false)
    }
  })

  it('returns projection_failed when app reports projection write failure', async () => {
    const app = await importedApp()
    ;(app as unknown as { createTask: (input: unknown) => Promise<never> }).createTask = () => {
      const error = new Error('projection write failed')
      error.name = 'TaskProjectionWriteError'
      return Promise.reject(error)
    }

    expect(
      runRoute<TaskMutationOutcome<never>>(() => {
        const rpc = mountRouteModule(app, taskRoutes)
        return rpc.handle(
          rpcSpecPostJson('/api/createTask', { key: 'projection-failure-probe', desc: 'route mapping' })
        )
      })
    ).resolves.toMatchObject({
      status: 200,
      data: {
        ok: false,
        status: 'projection_failed',
        operation: 'create'
      }
    })
  })

  it('returns unique correlation ids for repeated source failures', async () => {
    const app = await importedApp()
    ;(app as unknown as { loaded: { writeTarget: string } }).loaded.writeTarget = '/dev/null/tasks.yml'
    const rpc = mountRouteModule(app, taskRoutes)

    const first = await runRoute<TaskMutationOutcome<never>>(() =>
      rpc.handle(rpcSpecPostJson('/api/createTask', { key: 'corr-probe-1', desc: 'first' }))
    )
    const second = await runRoute<TaskMutationOutcome<never>>(() =>
      rpc.handle(rpcSpecPostJson('/api/createTask', { key: 'corr-probe-2', desc: 'second' }))
    )

    const firstId = first.data.ok ? undefined : first.data.details?.correlationId
    const secondId = second.data.ok ? undefined : second.data.details?.correlationId
    expect(first.data.ok).toBe(false)
    expect(second.data.ok).toBe(false)
    expect(typeof firstId).toBe('string')
    expect(typeof secondId).toBe('string')
    expect(firstId).not.toBe(secondId)
  })
})
