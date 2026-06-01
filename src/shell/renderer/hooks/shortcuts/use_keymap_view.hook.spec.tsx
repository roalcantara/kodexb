import { describe, expect, it } from 'bun:test'
import type { Binding } from '@core/domain/models/entries/schemas/shortcut.schema'
import type { ShortcutKnowledge } from '@core/domain/models/knowledges/schemas/knowledge.schema'
import type { BindingRef } from '@shared/rpc'
import { factoryFor } from '@testing'
import { act, renderHook } from '@testing-library/react'
import type { CollisionInfo } from './use_keymap_view.hook'
import { useKeymapView } from './use_keymap_view.hook'

function vscodeEntry(overrides: { bindings?: Binding[] } = {}): ShortcutKnowledge {
  return factoryFor('shortcut:vscodeKeymap', { overrides })
}

function makeBindingsCache(overrides: { all?: BindingRef[]; collisionsById?: Map<string, CollisionInfo[]> } = {}): {
  all: BindingRef[]
  collisionsById: Map<string, CollisionInfo[]>
} {
  return {
    all: overrides.all ?? [],
    collisionsById: overrides.collisionsById ?? new Map()
  }
}

const noop = () => undefined

describe('useKeymapView', () => {
  it('groups bindings by group field', () => {
    const entry = vscodeEntry({
      bindings: [
        factoryFor('binding', { overrides: { id: 'a', action: 'Action A', group: 'Navigation' } }),
        factoryFor('binding', { overrides: { id: 'b', action: 'Action B', group: 'Editor' } }),
        factoryFor('binding', { overrides: { id: 'c', action: 'Action C', group: 'Navigation' } })
      ]
    })
    const { result } = renderHook(() =>
      useKeymapView({
        entry,
        bindingsCache: makeBindingsCache(),
        onChordDetailNavigate: noop,
        onRevealSource: noop
      })
    )
    expect(result.current.groups).toHaveLength(2)
    expect(result.current.groups.find(g => g.name === 'Navigation')?.bindings).toHaveLength(2)
    expect(result.current.groups.find(g => g.name === 'Editor')?.bindings).toHaveLength(1)
  })

  it('treats empty group as unnamed group', () => {
    const entry = vscodeEntry({
      bindings: [
        factoryFor('binding', { overrides: { id: 'a', action: 'Action A', group: undefined } }),
        factoryFor('binding', { overrides: { id: 'b', action: 'Action B', group: '' } })
      ]
    })
    const { result } = renderHook(() =>
      useKeymapView({
        entry,
        bindingsCache: makeBindingsCache(),
        onChordDetailNavigate: noop,
        onRevealSource: noop
      })
    )
    expect(result.current.groups).toHaveLength(1)
    expect(result.current.groups[0]?.name).toBe('')
  })

  it('includes Conflicts tab when hard collisions exist', () => {
    const entry = vscodeEntry({
      bindings: [factoryFor('binding:goToFile')]
    })
    const collisions = new Map<string, CollisionInfo[]>()
    collisions.set('vscode:go-to-file', [
      { kind: 'hard', otherEntryKey: 'macos', otherBindingId: 'mbp:go-to-file', otherApp: 'macos' } as CollisionInfo
    ])
    const { result } = renderHook(() =>
      useKeymapView({
        entry,
        bindingsCache: makeBindingsCache({ collisionsById: collisions }),
        onChordDetailNavigate: noop,
        onRevealSource: noop
      })
    )
    expect(result.current.tabNames).toContain('Conflicts')
    expect(result.current.hasConflicts).toBe(true)
  })

  it('does not include Conflicts tab when only soft collisions', () => {
    const entry = vscodeEntry({
      bindings: [factoryFor('binding:goToFile')]
    })
    const collisions = new Map<string, CollisionInfo[]>()
    collisions.set('vscode:go-to-file', [
      {
        kind: 'soft',
        otherEntryKey: 'cursor',
        otherBindingId: 'cursor:go-to-file',
        otherApp: 'cursor'
      } as CollisionInfo
    ])
    const { result } = renderHook(() =>
      useKeymapView({
        entry,
        bindingsCache: makeBindingsCache({ collisionsById: collisions }),
        onChordDetailNavigate: noop,
        onRevealSource: noop
      })
    )
    expect(result.current.tabNames).not.toContain('Conflicts')
    expect(result.current.hasConflicts).toBe(false)
  })

  it('selects first binding on mount', () => {
    const entry = vscodeEntry({
      bindings: [
        factoryFor('binding:goToFile'),
        factoryFor('binding', { overrides: { id: 'cmd-palette', action: 'Command Palette' } })
      ]
    })
    const { result } = renderHook(() =>
      useKeymapView({
        entry,
        bindingsCache: makeBindingsCache(),
        onChordDetailNavigate: noop,
        onRevealSource: noop
      })
    )
    expect(result.current.selectedBindingId).toBe('vscode:go-to-file')
    expect(result.current.selectedBinding?.action).toBe('Go to File')
  })

  it('switches visible bindings when tab changes', () => {
    const entry = vscodeEntry({
      bindings: [
        factoryFor('binding', { overrides: { id: 'a', action: 'Action A', group: 'Nav' } }),
        factoryFor('binding', { overrides: { id: 'b', action: 'Action B', group: 'Edit' } })
      ]
    })
    const { result } = renderHook(() =>
      useKeymapView({
        entry,
        bindingsCache: makeBindingsCache(),
        onChordDetailNavigate: noop,
        onRevealSource: noop
      })
    )
    act(() => {
      result.current.setActiveTab('Edit')
    })
    expect(result.current.selectedBindingId).toBe('vscode:b')
    expect(result.current.selectedBinding?.action).toBe('Action B')
  })

  it('calls onChordDetailNavigate on primary action', () => {
    let navigatedHash = ''
    let navigatedId = ''
    const entry = vscodeEntry({
      bindings: [factoryFor('binding:goToFile')]
    })
    const { result } = renderHook(() =>
      useKeymapView({
        entry,
        bindingsCache: makeBindingsCache(),
        onChordDetailNavigate: (hash, id) => {
          navigatedHash = hash
          navigatedId = id
        },
        onRevealSource: noop
      })
    )
    act(() => {
      result.current.onPrimaryAction()
    })
    expect(navigatedHash).toBe('cmd+p')
    expect(navigatedId).toBe('vscode:go-to-file')
  })

  it('calls onRevealSource on secondary action', () => {
    let revealedId = ''
    const entry = vscodeEntry({
      bindings: [factoryFor('binding:goToFile')]
    })
    const { result } = renderHook(() =>
      useKeymapView({
        entry,
        bindingsCache: makeBindingsCache(),
        onChordDetailNavigate: noop,
        onRevealSource: id => {
          revealedId = id
        }
      })
    )
    act(() => {
      result.current.onSecondaryAction()
    })
    expect(revealedId).toBe('vscode:go-to-file')
  })

  it('shows no Conflicts tab when no collisions', () => {
    const entry = vscodeEntry({
      bindings: [factoryFor('binding', { overrides: { id: 'x', action: 'X' } })]
    })
    const { result } = renderHook(() =>
      useKeymapView({
        entry,
        bindingsCache: makeBindingsCache(),
        onChordDetailNavigate: noop,
        onRevealSource: noop
      })
    )
    expect(result.current.tabNames).toEqual(['All'])
  })
})
