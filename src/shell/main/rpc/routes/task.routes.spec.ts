import { describe, expect, it } from 'bun:test'
import type { TaskMutationOutcome } from '@shared/rpc'
import { runRoute } from '@testing/helpers/run_route.util'
import { setupTaskRouteTestKit } from './task_routes_test.util'

describe('taskRoutes', () => {
  const {
    importedApp,
    mountRouteModule,
    postTask,
    firstSeededTask,
    firstSeededTaskId,
    cycleForward,
    rpcSpecPostJson,
    taskRoutes
  } = setupTaskRouteTestKit()
  describe('POST /api/createTask', () => {
    describe('when the task creation succeeds', () => {
      const body = { key: 'RPC route task', desc: 'Created in task.routes.spec' }
      it('creates a task', () => {
        expect(
          postTask<TaskMutationOutcome<{ type: string; key: string; status: string }>>('/api/createTask', body)
        ).resolves.toMatchObject({
          status: 200,
          data: {
            ok: true,
            status: 'success',
            operation: 'create',
            data: { type: 'task', key: body.key, status: 'todo' }
          }
        })
      })
    })

    describe.each([
      ['key is missing', {}],
      ['priority is invalid', { key: 'Bad priority', priority: 'extreme' }]
    ])('when %s', (_desc, body) => {
      it('returns 500', () => {
        expect(postTask<{ error: string }>('/api/createTask', body)).resolves.toMatchObject({
          status: 500,
          data: { error: expect.any(String) }
        })
      })
    })
  })
  describe('POST /api/updateTask', () => {
    it('updates an existing task', async () => {
      const taskId = await firstSeededTaskId()
      expect(
        postTask<TaskMutationOutcome<{ id: number; desc: string }>>('/api/updateTask', {
          id: taskId,
          patch: { desc: 'Updated via RPC route spec' }
        })
      ).resolves.toMatchObject({
        status: 200,
        data: {
          ok: true,
          status: 'success',
          operation: 'update',
          data: { id: taskId, desc: 'Updated via RPC route spec' }
        }
      })
    })

    describe.each([
      ['id is not given', { patch: { desc: 'orphan patch' } }, null],
      ['status is invalid', { id: 1, patch: { status: 'finished' } }, null],
      ['the task does not exist', { id: 9_999_999, patch: { desc: 'missing' } }, 'not found']
    ])('when %s', (_desc, body, expectContains) => {
      it('returns 500', () => {
        expect(postTask<{ error: string }>('/api/updateTask', body)).resolves.toMatchObject({
          status: 500,
          data: { error: expect.stringContaining(expectContains ?? '') }
        })
      })
    })
  })
  describe('POST /api/deleteTask', () => {
    it('deletes an existing task', async () => {
      const app = await importedApp()
      const rpc = mountRouteModule(app, taskRoutes)
      const suffix = Date.now()
      const createRes = await rpc.handle(
        rpcSpecPostJson('/api/createTask', { key: `Task to delete ${suffix}`, desc: 'ephemeral' })
      )
      expect(createRes.status).toBe(200)
      const created = (await createRes.json()) as TaskMutationOutcome<{ id: number }>
      expect(created.ok).toBe(true)

      const createdTaskId = created.ok ? created.data.id : -1

      expect(
        runRoute<TaskMutationOutcome<void>>(() => rpc.handle(rpcSpecPostJson('/api/deleteTask', { id: createdTaskId })))
      ).resolves.toMatchObject({
        status: 200,
        data: {
          ok: true,
          status: 'success',
          operation: 'delete',
          taskId: createdTaskId
        }
      })
    })

    describe.each([
      ['id is missing', {}, null],
      ['id is not an integer', { id: 'nope' }, null],
      ['the task does not exist', { id: 9_999_999 }, 'not found']
    ])('when %s', (_desc, body, expectContains) => {
      it('returns 500', () => {
        expect(postTask<{ error: string }>('/api/deleteTask', body)).resolves.toMatchObject({
          status: 500,
          data: { error: expect.stringContaining(expectContains ?? '') }
        })
      })
    })
  })
  describe('POST /api/cycleStatus', () => {
    it('cycles task status forward', async () => {
      const task = await firstSeededTask()
      const next = cycleForward(['todo', 'doing', 'done'], task.status, 'todo')

      expect(
        postTask<TaskMutationOutcome<{ id: number; status: string }>>('/api/cycleStatus', {
          id: task.id,
          dir: 'forward'
        })
      ).resolves.toMatchObject({
        status: 200,
        data: {
          ok: true,
          status: 'success',
          operation: 'cycle_status',
          data: { id: task.id, status: next }
        }
      })
    })

    describe.each([
      ['dir is invalid', { id: 1, dir: 'up' }, null],
      ['id is missing', { dir: 'forward' }, null],
      ['the task does not exist', { id: 9_999_999, dir: 'forward' }, 'not found']
    ])('when %s', (_desc, body, expectCycleStatusContains) => {
      it('returns 500', () => {
        expect(postTask<{ error: string }>('/api/cycleStatus', body)).resolves.toMatchObject({
          status: 500,
          data: { error: expect.stringContaining(expectCycleStatusContains ?? '') }
        })
      })
    })
  })
  describe('POST cyclePriority', () => {
    it('cycles task priority forward', async () => {
      const task = await firstSeededTask()
      const next = cycleForward(['low', 'mid', 'high', 'urgent'], task.priority, 'mid')

      expect(
        postTask<TaskMutationOutcome<{ id: number; priority: string }>>('/api/cyclePriority', {
          id: task.id,
          dir: 'forward'
        })
      ).resolves.toMatchObject({
        status: 200,
        data: {
          ok: true,
          status: 'success',
          operation: 'cycle_priority',
          data: { id: task.id, priority: next }
        }
      })
    })

    describe.each([
      ['dir is invalid', { id: 1, dir: 'down' }, null],
      ['id is missing', { dir: 'backward' }, null],
      ['the task does not exist', { id: 9_999_999, dir: 'forward' }, 'not found']
    ])('when %s', (_desc, body, expectCyclePriorityContains) => {
      it('returns 500', () => {
        expect(postTask<{ error: string }>('/api/cyclePriority', body)).resolves.toMatchObject({
          status: 500,
          data: { error: expect.stringContaining(expectCyclePriorityContains ?? '') }
        })
      })
    })
  })
  describe('POST /api/reorderTask', () => {
    describe('when the reorder succeeds', () => {
      it('returns affected tasks', async () => {
        const app = await importedApp()
        const rpc = mountRouteModule(app, taskRoutes)
        const suffix = Date.now()
        const lowerRes = await rpc.handle(
          rpcSpecPostJson('/api/createTask', { key: `Task A ${suffix}`, desc: 'lower order' })
        )
        expect(lowerRes.status).toBe(200)
        const upperRes = await rpc.handle(
          rpcSpecPostJson('/api/createTask', { key: `Task B ${suffix}`, desc: 'upper order' })
        )
        expect(upperRes.status).toBe(200)
        const upper = (await upperRes.json()) as TaskMutationOutcome<{ id: number }>
        expect(upper.ok).toBe(true)

        const upperId = upper.ok ? upper.data.id : -1
        const upperSourceVersion = upper.ok ? upper.sourceVersion : undefined

        expect(
          runRoute<TaskMutationOutcome<Array<{ id: number }>>>(() =>
            rpc.handle(
              rpcSpecPostJson('/api/reorderTask', { id: upperId, dir: 'up', sourceVersion: upperSourceVersion })
            )
          )
        ).resolves.toMatchObject({
          status: 200,
          data: {
            ok: true,
            status: 'success',
            operation: 'reorder',
            data: expect.arrayContaining([expect.objectContaining({ id: expect.any(Number) })])
          }
        })
      })
    })

    describe.each([
      ['dir is invalid', { id: 1, dir: 'forward' }],
      ['id is missing', { dir: 'up' }]
    ])('when %s', (_desc, body) => {
      it('returns 500', () => {
        expect(postTask<{ error: string }>('/api/reorderTask', body)).resolves.toMatchObject({
          status: 500,
          data: { error: expect.any(String) }
        })
      })
    })

    describe('when the task cannot move', () => {
      it('returns 200 with an empty array', async () => {
        const taskId = await firstSeededTaskId()
        expect(
          postTask<TaskMutationOutcome<unknown[]>>('/api/reorderTask', { id: taskId, dir: 'up' })
        ).resolves.toMatchObject({
          status: 200,
          data: {
            ok: true,
            status: 'success',
            operation: 'reorder',
            data: []
          }
        })
      })
    })
  })
})
