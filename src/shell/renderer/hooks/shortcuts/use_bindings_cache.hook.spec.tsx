import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { BindingRef } from '@shared/rpc'
import { bindingsCacheSample } from '@testing'
import { cleanup, renderHook, waitFor } from '@testing-library/react'

const mockBindings = bindingsCacheSample()

const listBindingsMock = mock<() => Promise<BindingRef[]>>()
listBindingsMock.mockResolvedValue(mockBindings)

const onAfterSyncCompleteMock = mock<(cb: (result: unknown) => void) => () => void>()
const noopUnsubscribe = (): undefined => undefined
onAfterSyncCompleteMock.mockImplementation(() => noopUnsubscribe)

mock.module('../../rpc/client', () => ({
  listBindings: listBindingsMock,
  onAfterSyncComplete: onAfterSyncCompleteMock
}))

const { useBindings, refreshBindingsCache } = await import('./use_bindings_cache.hook')

describe('useBindings', () => {
  beforeEach(() => {
    listBindingsMock.mockClear()
    onAfterSyncCompleteMock.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('calls listBindings on mount', async () => {
    renderHook(() => useBindings())
    await waitFor(() => expect(listBindingsMock).toHaveBeenCalled())
  })

  it('returns all bindings in the cache', async () => {
    const { result } = renderHook(() => useBindings())
    await waitFor(() => expect(result.current.all.length).toBeGreaterThan(0))
    expect(result.current.all).toEqual(mockBindings)
  })

  it('builds byHash index', async () => {
    const { result } = renderHook(() => useBindings())
    await waitFor(() => expect(result.current.all.length).toBeGreaterThan(0))
    const pBindings = result.current.byHash.get('cmd+p')
    expect(pBindings).toBeDefined()
    expect(pBindings).toHaveLength(2)
  })

  it('builds byApp index', async () => {
    const { result } = renderHook(() => useBindings())
    await waitFor(() => expect(result.current.all.length).toBeGreaterThan(0))
    const vBindings = result.current.byApp.get('vscode')
    expect(vBindings).toBeDefined()
    expect(vBindings).toHaveLength(2)
  })

  it('detects collisions for global×global same hash', async () => {
    const { result } = renderHook(() => useBindings())
    await waitFor(() => expect(result.current.all.length).toBeGreaterThan(0))
    expect(result.current.collisionsById.size).toBeGreaterThan(0)
    const cols = result.current.collisionsById.get('b1')
    expect(cols).toBeDefined()
    expect(cols?.some(c => c.otherBindingId === 'b3')).toBe(true)
  })

  it('refresh() refetches and updates cache', async () => {
    const { result } = renderHook(() => useBindings())
    await waitFor(() => expect(result.current.all.length).toBeGreaterThan(0))
    const firstBinding = mockBindings[0]
    if (!firstBinding) throw new Error('fixture binding missing')
    const one: BindingRef[] = [firstBinding]
    listBindingsMock.mockResolvedValueOnce(one)
    refreshBindingsCache()
    await waitFor(() => expect(result.current.all).toHaveLength(1))
  })
})
