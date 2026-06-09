import { describe, expect, it } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { useMutationError } from './use_mutation_error.hook'

describe('useMutationError', () => {
  describe('initial state', () => {
    it('starts with null mutationError', () => {
      const { result } = renderHook(() => useMutationError())
      expect(result.current.mutationError).toBeNull()
    })
  })

  describe('when setMutationError is called', () => {
    it('sets mutationError to the given message', () => {
      const { result } = renderHook(() => useMutationError())
      act(() => result.current.setMutationError('Write failed'))
      expect(result.current.mutationError).toBe('Write failed')
    })

    it('replaces a previous error message', () => {
      const { result } = renderHook(() => useMutationError())
      act(() => result.current.setMutationError('first error'))
      act(() => result.current.setMutationError('second error'))
      expect(result.current.mutationError).toBe('second error')
    })
  })

  describe('when clearMutationError is called', () => {
    it('clears the error back to null', () => {
      const { result } = renderHook(() => useMutationError())
      act(() => result.current.setMutationError('some error'))
      expect(result.current.mutationError).toBe('some error')
      act(() => result.current.clearMutationError())
      expect(result.current.mutationError).toBeNull()
    })
  })
})
