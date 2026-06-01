import type { Binding } from '@core/domain/models/entries/schemas/shortcut.schema'
import type { ShortcutKnowledge } from '@core/domain/models/knowledges/schemas/knowledge.schema'
import type { BindingRef, RpcKnowledge } from '@shared/rpc'
import { memo } from 'react'
import { useKeymapView } from '../../hooks/shortcuts/use_keymap_view.hook'
import { BindingRow } from './binding_row.component'

type Collision = {
  kind: 'hard' | 'soft'
  otherBindingId: string
  otherChordHash: string
  otherEntryKey: string
  otherApp: string
}

export type ShortcutKeymapProps = {
  entry: RpcKnowledge
  cache: {
    all: BindingRef[]
    collisionsById: Map<string, Collision[]>
  }
  displayAdvisories: boolean
  initialSelectedBindingId?: string | null
  onChordDetailNavigate: (chordHash: string, bindingId: string) => void
  onRevealSource: (bindingId: string) => void
  onBack?: () => void
}

function slugify(action: string): string {
  return action
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function computeBindingId(entryKey: string, binding: Binding): string {
  return `${entryKey}:${binding.id ?? slugify(binding.action)}`
}

function filterVisibleBindings(
  bindings: Binding[],
  entryKey: string,
  activeTab: string,
  collisionsById: Map<string, Collision[]>
): Binding[] {
  if (activeTab === 'All') return bindings
  if (activeTab === 'Conflicts') {
    return bindings.filter(b => {
      const id = computeBindingId(entryKey, b)
      return collisionsById.get(id)?.some(c => c.kind === 'hard')
    })
  }
  return bindings.filter(b => (b.group ?? '') === activeTab)
}

function buildTabs(groups: string[], hasHardCollisions: boolean): string[] {
  const names = ['All', ...groups]
  if (hasHardCollisions) names.push('Conflicts')
  return names
}

// jscpd:ignore-start
const EMPTY_SHORTCUT_ENTRY: ShortcutKnowledge = {
  id: 0,
  key: '',
  source: '',
  desc: '',
  tags: [],
  links: [],
  notes: [],
  doc: '',
  type: 'shortcut',
  platform: 'any',
  bindings: [],
  createdAt: 0,
  updatedAt: 0
}
// jscpd:ignore-end

function ShortcutKeymapComponent({
  entry,
  cache,
  displayAdvisories,
  initialSelectedBindingId,
  onChordDetailNavigate,
  onRevealSource,
  onBack
}: ShortcutKeymapProps) {
  const shortcutEntry: ShortcutKnowledge =
    entry.type === 'shortcut' ? (entry as ShortcutKnowledge) : EMPTY_SHORTCUT_ENTRY

  const keymapState = useKeymapView({
    entry: shortcutEntry,
    bindingsCache: {
      all: cache.all,
      collisionsById: cache.collisionsById as Map<
        string,
        { kind: 'hard' | 'soft'; otherEntryKey: string; otherApp: string }[]
      >
    },
    initialSelectedBindingId,
    onChordDetailNavigate,
    onRevealSource
  })

  if (entry.type !== 'shortcut') return null

  const groups: string[] = [...new Set<string>(shortcutEntry.bindings.map(b => b.group ?? ''))]
  const hasHardCollisions = [...cache.collisionsById.values()].some(cols => cols.some(c => c.kind === 'hard'))
  const tabNames = buildTabs(groups, hasHardCollisions)
  const visibleBindings = filterVisibleBindings(
    shortcutEntry.bindings,
    entry.key,
    keymapState.activeTab,
    cache.collisionsById as Map<string, Collision[]>
  )

  return renderKeymapBody(entry, keymapState, visibleBindings, tabNames, cache, displayAdvisories, onBack)
}

function renderKeymapBody(
  entry: RpcKnowledge,
  keymapState: ReturnType<typeof useKeymapView>,
  visibleBindings: Binding[],
  tabNames: string[],
  cache: ShortcutKeymapProps['cache'],
  displayAdvisories: boolean,
  onBack?: () => void
) {
  return (
    <div className="cmp-shortcut-keymap">
      <div className="cmp-shortcut-keymap__tabs" role="tablist">
        {tabNames.map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={keymapState.activeTab === tab}
            className={`cmp-shortcut-keymap__tab${keymapState.activeTab === tab ? ' cmp-shortcut-keymap__tab--active' : ''}${tab === 'Conflicts' ? ' cmp-shortcut-keymap__tab--warn' : ''}`}
            onClick={() => keymapState.setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="cmp-shortcut-keymap__body" role="tabpanel">
        {visibleBindings.map(binding => {
          const bindingId = computeBindingId(entry.key, binding)
          const colls = cache.collisionsById.get(bindingId) ?? []
          const isSelected =
            keymapState.selectedBinding === null
              ? bindingId ===
                computeBindingId(entry.key, visibleBindings[0] ?? ({ id: undefined, action: '' } as Binding))
              : computeBindingId(entry.key, keymapState.selectedBinding) === bindingId
          return (
            <BindingRow
              key={bindingId}
              binding={binding}
              collisions={colls}
              displayAdvisories={displayAdvisories}
              selected={isSelected}
              onSelect={() => keymapState.setSelectedBindingId(bindingId)}
              onPrimary={keymapState.onPrimaryAction}
              onSecondary={keymapState.onSecondaryAction}
              onInfo={() => {
                /* TODO: binding detail drawer */
              }}
              platform="macos"
            />
          )
        })}
      </div>
      <div className="cmp-shortcut-keymap__footer">
        {onBack ? (
          <button type="button" className="cmp-shortcut-keymap__back" onClick={onBack}>
            <b>←</b> back
          </button>
        ) : null}
        <span>
          <b>↑↓</b> select binding
        </span>
        <span>
          <b>↵</b> chord detail
        </span>
        <span>
          <b>⌘↵</b> reveal source
        </span>
      </div>
    </div>
  )
}

export const ShortcutKeymap = memo(
  ShortcutKeymapComponent,
  (prev, next) =>
    prev.entry === next.entry &&
    prev.displayAdvisories === next.displayAdvisories &&
    prev.initialSelectedBindingId === next.initialSelectedBindingId &&
    prev.onBack === next.onBack &&
    prev.cache.all === next.cache.all &&
    prev.cache.collisionsById === next.cache.collisionsById
)
