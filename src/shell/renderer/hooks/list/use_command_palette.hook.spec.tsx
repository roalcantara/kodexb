/// <reference lib="dom" />

import '@happy-dom/global-registrator'

import { describe, expect, it, mock } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
import { renderHook } from '@testing-library/react'

mock.module('electrobun/view', () => ({
  Electroview: class {
    // biome-ignore lint/style/useNamingConvention: mirrors Electrobun Electroview.defineRPC
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

const { useCommandPalette } = await import('./use_command_palette.hook')

const paletteCallbacks = {
  onEditTask: () => undefined,
  onNewTask: () => undefined,
  onSync: () => undefined,
  pushToast: () => undefined
}

function renderPalette(overrides: { selectedId: number | null; rows: RpcKnowledge[] }) {
  return renderHook(() => useCommandPalette({ ...paletteCallbacks, ...overrides }))
}

describe('useCommandPalette', () => {
  it('includes quit kb action', () => {
    const { result } = renderPalette({ selectedId: null, rows: [] })
    const quit = result.current.actions.find(a => a.id === 'quit')
    expect(quit?.label).toBe('Quit kb')
    expect(quit?.shortcut?.length).toBeGreaterThan(0)
    expect(quit?.section).toBe('app')
  })

  it('orders globals library then app when nothing selected', () => {
    const { result } = renderPalette({ selectedId: null, rows: [] })
    const ids = result.current.actions.map(a => a.id)
    expect(ids).toEqual(['sync', 'new-task', 'quit'])
    expect(result.current.actions.every(a => a.section === 'library' || a.section === 'app')).toBe(true)
  })

  it('puts entry actions before library for a command row', () => {
    const cmd = factoryFor('command', {
      overrides: {
        id: 1,
        key: 'echo hi',
        source: '/x.yaml',
        desc: '',
        tags: [],
        doc: '',
        createdAt: 0,
        updatedAt: 0
      }
    }) as RpcKnowledge
    const { result } = renderPalette({ selectedId: 1, rows: [cmd] })
    const ids = result.current.actions.map(a => a.id)
    expect(ids[0]).toBe('paste-terminal')
    expect(result.current.actions.find(a => a.id === 'paste-terminal')?.section).toBe('entry')
    expect(ids).toContain('copy')
    expect(ids.indexOf('paste-terminal')).toBeLessThan(ids.indexOf('sync'))
  })

  it('has no This entry row for cheat; Clipboard Copy uses doc', () => {
    const cheat = factoryFor('cheat', {
      overrides: {
        id: 2,
        key: 'Title',
        doc: 'snippet body',
        source: '/c.yaml',
        desc: '',
        tags: [],
        createdAt: 0,
        updatedAt: 0
      }
    }) as RpcKnowledge
    const { result } = renderPalette({ selectedId: 2, rows: [cheat] })
    const ids = result.current.actions.map(a => a.id)
    expect(ids).not.toContain('copy-doc')
    const copy = result.current.actions.find(a => a.id === 'copy')
    expect(copy?.label).toBe('Copy')
    expect(copy?.section).toBe('clipboard')
    expect(ids.indexOf('copy')).toBeLessThan(ids.indexOf('open-editor'))
  })
})
