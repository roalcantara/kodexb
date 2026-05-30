import { afterEach, describe, expect, it } from 'bun:test'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { useQuickLookupState } from './use_quick_lookup_state.hook'

describe('useQuickLookupState', () => {
  afterEach(() => {
    cleanup()
  })

  it('starts closed', () => {
    const { result } = renderHook(() => useQuickLookupState({ isBlocked: false }))
    expect(result.current.open).toBe(false)
  })

  it('openOverlay sets open to true and resets state', async () => {
    const { result } = renderHook(() => useQuickLookupState({ isBlocked: false }))
    act(() => {
      result.current.openOverlay()
    })
    await waitFor(() => expect(result.current.open).toBe(true))
    expect(result.current.search).toBe('')
  })

  it('closeOverlay sets open to false', async () => {
    const { result } = renderHook(() => useQuickLookupState({ isBlocked: false }))
    act(() => {
      result.current.openOverlay()
    })
    await waitFor(() => expect(result.current.open).toBe(true))
    act(() => {
      result.current.closeOverlay()
    })
    await waitFor(() => expect(result.current.open).toBe(false))
  })

  it('Escape key closes when open', async () => {
    const { result } = renderHook(() => useQuickLookupState({ isBlocked: false }))
    act(() => {
      result.current.openOverlay()
    })
    await waitFor(() => expect(result.current.open).toBe(true))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    })
    await waitFor(() => expect(result.current.open).toBe(false))
  })
})
