import { describe, expect, it, mock } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { useListPageShell } from './use_list_page_shell.hook'

describe('useListPageShell', () => {
  describe('list-level mutation error surface', () => {
    it('exposes mutationError and clearMutationError in return value', () => {
      const { result } = renderHook(() =>
        useListPageShell({ showSettings: false, onOpenSettings: mock(() => undefined) })
      )

      expect(result.current.mutationError).toBeNull()

      act(() => result.current.clearMutationError())
      expect(result.current.mutationError).toBeNull()
    })
  })
})
