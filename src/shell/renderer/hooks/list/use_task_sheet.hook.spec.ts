import { describe, expect, it, mock } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { act, renderHook } from '@testing-library/react'
import { useTaskSheet } from './use_task_sheet.hook'

const mockCreateTask = mock<(input: unknown) => Promise<Record<string, unknown>>>(() =>
  Promise.resolve({ ok: true, message: '', status: 'success', operation: 'create', data: null })
)
const mockUpdateTask = mock<(id: number, patch: unknown) => Promise<Record<string, unknown>>>(() =>
  Promise.resolve({ ok: true, message: '', status: 'success', operation: 'update', data: null })
)
const mockCycleStatus = mock<(id: number, dir: string) => Promise<Record<string, unknown>>>(() =>
  Promise.resolve({ ok: true, message: '', status: 'success', operation: 'cycle_status', data: null })
)
const mockCyclePriority = mock<(id: number, dir: string) => Promise<Record<string, unknown>>>(() =>
  Promise.resolve({ ok: true, message: '', status: 'success', operation: 'cycle_priority', data: null })
)

mock.module('../../rpc/client', () => ({
  createTask: mockCreateTask,
  updateTask: mockUpdateTask,
  cycleStatus: mockCycleStatus,
  cyclePriority: mockCyclePriority
}))

function makeEntry(overrides: Partial<RpcKnowledge> = {}): RpcKnowledge {
  return { id: 1, type: 'task', key: 'test-task', status: 'todo', priority: 'mid', ...overrides } as RpcKnowledge
}

describe('useTaskSheet', () => {
  describe('when save mutation returns ok: false', () => {
    it('sets form.error instead of calling onClose', async () => {
      const onClose = mock(() => undefined)
      mockCreateTask.mockResolvedValueOnce({
        ok: false,
        status: 'source_write_failed',
        operation: 'create',
        message: 'Write failed',
        details: {}
      })

      const { result } = renderHook(() => useTaskSheet(null, onClose))
      act(() => result.current.set('key', 'new-task'))

      await act(() => result.current.handleSave())

      expect(result.current.form.error).toBe('Write failed')
      expect(result.current.form.saving).toBe(false)
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('when update mutation returns ok: false', () => {
    it('sets form.error instead of calling onClose', async () => {
      const onClose = mock(() => undefined)
      mockUpdateTask.mockResolvedValueOnce({
        ok: false,
        status: 'source_write_failed',
        operation: 'update',
        message: 'Conflict detected',
        details: {}
      })

      const { result } = renderHook(() => useTaskSheet(makeEntry(), onClose))
      act(() => result.current.set('desc', 'updated'))

      await act(() => result.current.handleSave())

      expect(result.current.form.error).toBe('Conflict detected')
      expect(result.current.form.saving).toBe(false)
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('when cycleStatus returns ok: false', () => {
    it('sets form.error and does not cycle the status', async () => {
      const onClose = mock(() => undefined)
      mockCycleStatus.mockResolvedValueOnce({
        ok: false,
        status: 'source_write_failed',
        operation: 'cycle_status',
        message: 'Status cycle failed',
        details: {}
      })

      const { result } = renderHook(() => useTaskSheet(makeEntry(), onClose))

      await act(() => result.current.handleCycleStatus())

      expect(result.current.form.error).toBe('Status cycle failed')
      expect(result.current.form.status).toBe('todo')
      expect(result.current.form.saving).toBe(false)
    })
  })

  describe('when cyclePriority returns ok: false', () => {
    it('sets form.error and does not cycle the priority', async () => {
      const onClose = mock(() => undefined)
      mockCyclePriority.mockResolvedValueOnce({
        ok: false,
        status: 'source_write_failed',
        operation: 'cycle_priority',
        message: 'Priority cycle failed',
        details: {}
      })

      const { result } = renderHook(() => useTaskSheet(makeEntry(), onClose))

      await act(() => result.current.handleCyclePriority())

      expect(result.current.form.error).toBe('Priority cycle failed')
      expect(result.current.form.priority).toBe('mid')
      expect(result.current.form.saving).toBe(false)
    })
  })

  describe('when rpc call rejects', () => {
    it('handleSave sets form.error when createTask rejects', async () => {
      const onClose = mock(() => undefined)
      mockCreateTask.mockRejectedValueOnce(new Error('Network error'))
      const rendered = renderHook(() => useTaskSheet(null, onClose))

      act(() => rendered.result.current.set('key', 'new-task'))
      await act(() => rendered.result.current.handleSave())

      expect(rendered.result.current.form.saving).toBe(false)
      expect(rendered.result.current.form.error).toBe('Failed to save')
      expect(onClose).not.toHaveBeenCalled()
    })

    it('handleCycleStatus sets form.error when cycleStatus rejects', async () => {
      mockCycleStatus.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() =>
        useTaskSheet(
          makeEntry(),
          mock(() => undefined)
        )
      )

      await act(() => result.current.handleCycleStatus())

      expect(result.current.form.error).toBe('Failed to cycle status')
      expect(result.current.form.saving).toBe(false)
    })

    it('handleCyclePriority sets form.error when cyclePriority rejects', async () => {
      mockCyclePriority.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() =>
        useTaskSheet(
          makeEntry(),
          mock(() => undefined)
        )
      )

      await act(() => result.current.handleCyclePriority())

      expect(result.current.form.error).toBe('Failed to cycle priority')
      expect(result.current.form.saving).toBe(false)
    })
  })

  describe('when save succeeds', () => {
    it('calls onClose and clears saving', async () => {
      const onClose = mock(() => undefined)
      mockCreateTask.mockResolvedValueOnce({
        ok: true,
        status: 'success',
        operation: 'create',
        message: 'OK'
      })

      const { result } = renderHook(() => useTaskSheet(null, onClose))
      act(() => result.current.set('key', 'valid-task'))

      await act(() => result.current.handleSave())

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
