// @shortcuts
import { afterEach, describe, expect, it } from 'bun:test'
import type { BindingRef, RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
import { cleanup, render, screen } from '@testing-library/react'
import { ShortcutKeymap } from './shortcut_keymap.component'

afterEach(() => {
  cleanup()
})

const vscodeEntry = (overrides: Record<string, unknown> = {}): RpcKnowledge =>
  factoryFor('shortcut:vscodeKeymap', { overrides }) as RpcKnowledge

const emptyCache = {
  all: [] as BindingRef[],
  collisionsById: new Map() as Map<
    string,
    { kind: 'hard' | 'soft'; otherBindingId: string; otherChordHash: string; otherEntryKey: string; otherApp: string }[]
  >
}

describe('ShortcutKeymap', () => {
  it('renders keymap with all bindings in All tab', () => {
    render(
      <ShortcutKeymap
        entry={vscodeEntry()}
        cache={emptyCache}
        displayAdvisories={false}
        onChordDetailNavigate={() => undefined}
        onRevealSource={() => undefined}
      />
    )
    expect(screen.getByText('Go to File')).not.toBeNull()
    expect(screen.getByText('Show All Commands')).not.toBeNull()
    expect(screen.getByText('Toggle Terminal')).not.toBeNull()
  })

  it('renders group tabs from binding group fields', () => {
    render(
      <ShortcutKeymap
        entry={vscodeEntry()}
        cache={emptyCache}
        displayAdvisories={false}
        onChordDetailNavigate={() => undefined}
        onRevealSource={() => undefined}
      />
    )
    const tabs = document.querySelectorAll('.cmp-shortcut-keymap__tab')
    const tabTexts = Array.from(tabs).map(t => t.textContent)
    expect(tabTexts).toContain('Navigation')
    expect(tabTexts).toContain('Editor')
  })

  it('filters bindings by group when tab is selected', () => {
    const { rerender } = render(
      <ShortcutKeymap
        entry={vscodeEntry()}
        cache={emptyCache}
        displayAdvisories={false}
        onChordDetailNavigate={() => undefined}
        onRevealSource={() => undefined}
      />
    )
    expect(screen.getByText('Go to File')).not.toBeNull()

    const navTab = screen.getByRole('tab', { name: 'Navigation' })
    navTab.click()
    rerender(
      <ShortcutKeymap
        entry={vscodeEntry()}
        cache={emptyCache}
        displayAdvisories={false}
        onChordDetailNavigate={() => undefined}
        onRevealSource={() => undefined}
      />
    )
    expect(screen.queryByText('Toggle Terminal')).toBeNull()
    expect(screen.getByText('Go to File')).not.toBeNull()
  })

  it('does not render when entry is not shortcut type', () => {
    const bookmark = { id: 1, type: 'bookmark', key: 'https://example.com' } as RpcKnowledge
    render(
      <ShortcutKeymap
        entry={bookmark}
        cache={emptyCache}
        displayAdvisories={false}
        onChordDetailNavigate={() => undefined}
        onRevealSource={() => undefined}
      />
    )
    expect(document.querySelector('.cmp-shortcut-keymap')).toBeNull()
  })

  it('shows Conflicts tab when hard collisions exist', () => {
    const cache = {
      all: [] as BindingRef[],
      collisionsById: new Map<
        string,
        {
          kind: 'hard' | 'soft'
          otherBindingId: string
          otherChordHash: string
          otherEntryKey: string
          otherApp: string
        }[]
      >()
    }
    cache.collisionsById.set('vscode:go-to-file', [
      {
        kind: 'hard',
        otherBindingId: 'macos:restart',
        otherChordHash: 'cmd+p',
        otherEntryKey: 'macos',
        otherApp: 'macos'
      }
    ])
    render(
      <ShortcutKeymap
        entry={vscodeEntry()}
        cache={cache}
        displayAdvisories={false}
        onChordDetailNavigate={() => undefined}
        onRevealSource={() => undefined}
      />
    )
    const conflictsTab = document.querySelector('.cmp-shortcut-keymap__tab--warn')
    expect(conflictsTab?.textContent).toContain('Conflicts')
  })

  it('filters to only hard-collision bindings in Conflicts tab', () => {
    const cache = {
      all: [] as BindingRef[],
      collisionsById: new Map<
        string,
        {
          kind: 'hard' | 'soft'
          otherBindingId: string
          otherChordHash: string
          otherEntryKey: string
          otherApp: string
        }[]
      >()
    }
    cache.collisionsById.set('vscode:go-to-file', [
      {
        kind: 'hard',
        otherBindingId: 'macos:restart',
        otherChordHash: 'cmd+p',
        otherEntryKey: 'macos',
        otherApp: 'macos'
      }
    ])
    const { rerender } = render(
      <ShortcutKeymap
        entry={vscodeEntry()}
        cache={cache}
        displayAdvisories={false}
        onChordDetailNavigate={() => undefined}
        onRevealSource={() => undefined}
      />
    )
    const conflictsTab = document.querySelector('.cmp-shortcut-keymap__tab--warn') as HTMLButtonElement
    conflictsTab.click()
    rerender(
      <ShortcutKeymap
        entry={vscodeEntry()}
        cache={cache}
        displayAdvisories={false}
        onChordDetailNavigate={() => undefined}
        onRevealSource={() => undefined}
      />
    )
    expect(screen.getByText('Go to File')).not.toBeNull()
    expect(screen.queryByText('Toggle Terminal')).toBeNull()
  })

  it('renders footer with keyboard hints', () => {
    render(
      <ShortcutKeymap
        entry={vscodeEntry()}
        cache={emptyCache}
        displayAdvisories={false}
        onChordDetailNavigate={() => undefined}
        onRevealSource={() => undefined}
      />
    )
    expect(document.querySelector('.cmp-shortcut-keymap__footer')?.textContent).toContain('↑↓')
    expect(document.querySelector('.cmp-shortcut-keymap__footer')?.textContent).toContain('↵')
    expect(document.querySelector('.cmp-shortcut-keymap__footer')?.textContent).toContain('⌘↵')
  })

  it('renders selected binding row with selected class', () => {
    render(
      <ShortcutKeymap
        entry={vscodeEntry()}
        cache={emptyCache}
        displayAdvisories={false}
        onChordDetailNavigate={() => undefined}
        onRevealSource={() => undefined}
      />
    )
    const selectedRow = document.querySelector('.cmp-keymap-row--selected')
    expect(selectedRow).not.toBeNull()
  })
})
