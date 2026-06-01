import { describe, expect, it } from 'bun:test'
import { bindingRefsForApps } from '@testing'
import { renderHook } from '@testing-library/react'
import { useChordDetail } from './use_chord_detail.hook'

describe('useChordDetail', () => {
  it('returns only globals tab when no bindingsForHash', () => {
    const { result } = renderHook(() =>
      useChordDetail({
        chordHash: 'ctrl+a',
        currentEntryKey: 'test-entry',
        currentEntryBindings: [
          { id: 'b1', action: 'Select All', chord: [{ modifiers: ['ctrl'], key: 'a' }], scope: 'local' }
        ],
        bindingsForHash: [],
        collisionsById: new Map(),
        displayAdvisories: false
      })
    )
    expect(result.current.tabs).toEqual([{ type: 'globals' }])
  })

  it('builds app tabs sorted alphabetically from bindingsForHash', () => {
    const { result } = renderHook(() =>
      useChordDetail({
        chordHash: 'ctrl+a',
        currentEntryKey: 'test-entry',
        currentEntryBindings: [
          { id: 'b1', action: 'Select All', chord: [{ modifiers: ['ctrl'], key: 'a' }], scope: 'local' }
        ],
        bindingsForHash: bindingRefsForApps('ctrl+a', [
          { app: 'Firefox', scope: 'local' },
          { app: 'Chrome', scope: 'local' },
          { app: 'VS Code', scope: 'global' }
        ]),
        collisionsById: new Map(),
        displayAdvisories: false
      })
    )
    expect(result.current.tabs).toHaveLength(4)
    expect(result.current.tabs[0]).toEqual({ type: 'globals' })
    expect(result.current.tabs[1]).toEqual({ type: 'app', app: 'Chrome' })
    expect(result.current.tabs[2]).toEqual({ type: 'app', app: 'Firefox' })
    expect(result.current.tabs[3]).toEqual({ type: 'app', app: 'VS Code' })
  })

  it('identifies globalBinding when a global binding exists', () => {
    const { result } = renderHook(() =>
      useChordDetail({
        chordHash: 'ctrl+a',
        currentEntryKey: 'test-entry',
        currentEntryBindings: [
          { id: 'b1', action: 'Select All', chord: [{ modifiers: ['ctrl'], key: 'a' }], scope: 'local' }
        ],
        bindingsForHash: bindingRefsForApps('ctrl+a', [
          { app: 'VS Code', scope: 'global' },
          { app: 'Chrome', scope: 'local' }
        ]),
        collisionsById: new Map(),
        displayAdvisories: false
      })
    )
    expect(result.current.globalBinding).not.toBeNull()
    expect(result.current.globalBinding?.scope).toBe('global')
    expect(result.current.globalBinding?.app).toBe('VS Code')
  })

  it('sets hasHardCollisions when collisions include hard kind', () => {
    const { result } = renderHook(() =>
      useChordDetail({
        chordHash: 'ctrl+a',
        currentEntryKey: 'test-entry',
        currentEntryBindings: [
          { id: 'b1', action: 'Select All', chord: [{ modifiers: ['ctrl'], key: 'a' }], scope: 'local' }
        ],
        bindingsForHash: bindingRefsForApps('ctrl+a', [
          { app: 'App1', scope: 'global' },
          { app: 'App2', scope: 'global' }
        ]),
        collisionsById: new Map([
          [
            'App1:b0',
            [
              {
                kind: 'hard',
                otherBindingId: 'App2:b1',
                otherApp: 'App2',
                otherEntryKey: 'entry',
                otherChordHash: 'ctrl+a'
              }
            ]
          ]
        ]),
        displayAdvisories: false
      })
    )
    expect(result.current.hasHardCollisions).toBe(true)
  })

  it('does not set hasHardCollisions for soft collisions only', () => {
    const { result } = renderHook(() =>
      useChordDetail({
        chordHash: 'ctrl+a',
        currentEntryKey: 'test-entry',
        currentEntryBindings: [
          { id: 'b1', action: 'Select All', chord: [{ modifiers: ['ctrl'], key: 'a' }], scope: 'local' }
        ],
        bindingsForHash: bindingRefsForApps('ctrl+a', [
          { app: 'App1', scope: 'local' },
          { app: 'App2', scope: 'local' }
        ]),
        collisionsById: new Map([
          [
            'App1:b0',
            [
              {
                kind: 'soft',
                otherBindingId: 'App2:b1',
                otherApp: 'App2',
                otherEntryKey: 'entry',
                otherChordHash: 'ctrl+a'
              }
            ]
          ]
        ]),
        displayAdvisories: false
      })
    )
    expect(result.current.hasHardCollisions).toBe(false)
  })

  it('filters rows by activeTab — globals tab shows only global bindings', () => {
    const { result } = renderHook(() =>
      useChordDetail({
        chordHash: 'ctrl+a',
        currentEntryKey: 'test-entry',
        currentEntryBindings: [
          { id: 'b1', action: 'Select All', chord: [{ modifiers: ['ctrl'], key: 'a' }], scope: 'local' }
        ],
        bindingsForHash: bindingRefsForApps('ctrl+a', [
          { app: 'VS Code', scope: 'global' },
          { app: 'Chrome', scope: 'local' }
        ]),
        collisionsById: new Map(),
        displayAdvisories: false
      })
    )
    expect(result.current.rows).toHaveLength(1)
    const firstRow = result.current.rows[0]
    expect(firstRow).toBeDefined()
    expect(firstRow?.scope).toBe('global')
  })

  it('setActiveTab resets selectedRowIndex to null and selectedRow to null', () => {
    const { result } = renderHook(() =>
      useChordDetail({
        chordHash: 'ctrl+a',
        currentEntryKey: 'test-entry',
        currentEntryBindings: [
          { id: 'b1', action: 'Select All', chord: [{ modifiers: ['ctrl'], key: 'a' }], scope: 'local' }
        ],
        bindingsForHash: bindingRefsForApps('ctrl+a', [
          { app: 'VS Code', scope: 'global' },
          { app: 'Chrome', scope: 'local' }
        ]),
        collisionsById: new Map(),
        displayAdvisories: false
      })
    )

    expect(result.current.selectedRowIndex).toBeNull()
    expect(result.current.selectedRow).toBeNull()

    result.current.setActiveTab({ type: 'app', app: 'Chrome' })
    expect(result.current.selectedRowIndex).toBeNull()
    expect(result.current.selectedRow).toBeNull()
    expect(result.current.rows).toHaveLength(1)
  })

  it('returns null chordDisplaySteps when bindingsForHash is empty', () => {
    const { result } = renderHook(() =>
      useChordDetail({
        chordHash: 'ctrl+a',
        currentEntryKey: 'test-entry',
        currentEntryBindings: [
          { id: 'b1', action: 'Select All', chord: [{ modifiers: ['ctrl'], key: 'a' }], scope: 'local' }
        ],
        bindingsForHash: [],
        collisionsById: new Map(),
        displayAdvisories: false
      })
    )
    expect(result.current.chordDisplaySteps).toBeNull()
  })
})
