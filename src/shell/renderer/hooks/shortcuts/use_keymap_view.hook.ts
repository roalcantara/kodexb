import type { ShortcutKnowledge } from '@core/domain/models/knowledges/schemas/knowledge.schema'
import type { BindingRef } from '@shared/rpc'
import { useMemo, useState } from 'react'
import {
  buildKeymapGroups,
  buildKeymapTabNames,
  type KeymapCollisionInfo
} from '../../utils/shortcuts/use_keymap_groups.util'
import { useKeymapInitialSelection } from './use_keymap_initial_selection.hook'
import { useKeymapSelectedBinding } from './use_keymap_selected_binding.hook'
import { useKeymapViewActions } from './use_keymap_view_actions.hook'

export type { KeymapCollisionInfo as CollisionInfo, KeymapGroup } from '../../utils/shortcuts/use_keymap_groups.util'

export type UseKeymapViewOptions = {
  entry: ShortcutKnowledge
  bindingsCache: {
    all: BindingRef[]
    collisionsById: Map<string, KeymapCollisionInfo[]>
  }
  initialSelectedBindingId?: string | null
  onChordDetailNavigate: (chordHash: string, bindingId: string) => void
  onRevealSource: (bindingId: string) => void
}

export type UseKeymapViewResult = {
  groups: ReturnType<typeof buildKeymapGroups>
  tabNames: string[]
  activeTab: string
  setActiveTab: (tab: string) => void
  hasConflicts: boolean
  selectedBindingId: string | null
  setSelectedBindingId: (id: string | null) => void
  selectedBinding: ReturnType<typeof useKeymapSelectedBinding>['selectedBinding']
  collisionsForSelected: KeymapCollisionInfo[]
  onPrimaryAction: () => void
  onSecondaryAction: () => void
}

export function useKeymapView({
  entry,
  bindingsCache,
  initialSelectedBindingId,
  onChordDetailNavigate,
  onRevealSource
}: UseKeymapViewOptions): UseKeymapViewResult {
  const [activeTab, setActiveTab] = useState<string>('All')
  const [selectedBindingId, setSelectedBindingId] = useState<string | null>(initialSelectedBindingId ?? null)

  useKeymapInitialSelection({
    activeTab,
    entryKey: entry.key,
    bindings: entry.bindings,
    collisionsById: bindingsCache.collisionsById,
    initialSelectedBindingId,
    setSelectedBindingId
  })

  const groups = useMemo(() => buildKeymapGroups(entry.bindings), [entry.bindings])
  const tabNames = useMemo(
    () => buildKeymapTabNames(groups, bindingsCache.collisionsById),
    [groups, bindingsCache.collisionsById]
  )
  const hasConflicts = useMemo(() => tabNames.includes('Conflicts'), [tabNames])

  const { selectedBinding, collisionsForSelected } = useKeymapSelectedBinding({
    activeTab,
    entryKey: entry.key,
    bindings: entry.bindings,
    collisionsById: bindingsCache.collisionsById,
    selectedBindingId
  })

  const { setActiveTabAndSelect, onPrimaryAction, onSecondaryAction } = useKeymapViewActions({
    entry,
    collisionsById: bindingsCache.collisionsById,
    selectedBinding,
    setActiveTab,
    setSelectedBindingId,
    onChordDetailNavigate,
    onRevealSource
  })

  return {
    groups,
    tabNames,
    activeTab,
    setActiveTab: setActiveTabAndSelect,
    hasConflicts,
    selectedBindingId,
    setSelectedBindingId,
    selectedBinding,
    collisionsForSelected,
    onPrimaryAction,
    onSecondaryAction
  }
}
