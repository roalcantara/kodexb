/// <reference lib="dom" />

import '@happy-dom/global-registrator'

import { describe, expect, it, mock } from 'bun:test'
import { renderHook } from '@testing-library/react'

mock.module('electrobun/view', () => ({
  Electroview: class {
    // biome-ignore lint/style/useNamingConvention: mirrors Electrobun API
    static defineRPC() {
      return {
        request: {
          rpcCall: mock(() => Promise.resolve({ status: 200, body: 'null' }))
        },
        send: {},
        setTransport: () => undefined
      }
    }

    rpc: unknown
    constructor(config: { rpc: unknown }) {
      this.rpc = config.rpc
    }
  }
}))

const { useCmdkPalette } = await import('./use_cmdk_palette.hook')

describe('useCmdkPalette', () => {
  it('includes quit kb action', () => {
    const { result } = renderHook(() =>
      useCmdkPalette({
        selectedEntry: null,
        onEditTask: () => undefined,
        onNewTask: () => undefined,
        onSync: () => undefined,
        pushToast: () => undefined
      })
    )
    const quit = result.current.actions.find(a => a.id === 'quit')
    expect(quit?.label).toBe('Quit kb')
    expect(quit?.shortcut?.length).toBeGreaterThan(0)
  })
})
