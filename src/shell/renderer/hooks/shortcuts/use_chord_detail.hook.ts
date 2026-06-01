import type { ChordStep } from '@core/domain/models/entries/schemas/shortcut.schema'
import type { BindingRef } from '@shared/rpc'
import { useCallback, useMemo, useState } from 'react'
import {
  buildChordDetailRows,
  buildChordDetailTabs,
  computeEntryBindingId,
  resolveChordDisplaySteps
} from '../../utils/shortcuts/use_chord_detail_build.util'

export type ChordDetailTab = { type: 'app'; app: string } | { type: 'globals' }

export type CollisionInfo = {
  kind: 'hard' | 'soft'
  otherBindingId: string
  otherApp: string
  otherEntryKey: string
  otherChordHash: string
}

export type ChordDetailRow = {
  bindingRef: BindingRef
  scope: 'global' | 'local'
  app: string
  action: string
  colls: CollisionInfo[]
  isCurrentApp: boolean
}

export type UseChordDetailOptions = {
  chordHash: string
  currentEntryKey: string
  currentEntryBindings: Array<{
    id?: string
    action: string
    chord: ChordStep[]
    scope: 'global' | 'local'
  }>
  bindingsForHash: BindingRef[]
  collisionsById: Map<string, CollisionInfo[]>
  displayAdvisories: boolean
}

export type UseChordDetailResult = {
  tabs: ChordDetailTab[]
  activeTab: ChordDetailTab
  setActiveTab: (tab: ChordDetailTab) => void
  rows: ChordDetailRow[]
  selectedRowIndex: number | null
  setSelectedRowIndex: (i: number | null) => void
  selectedRow: ChordDetailRow | null
  globalBinding: BindingRef | null
  hasHardCollisions: boolean
  chordDisplaySteps: ChordStep[] | null
  onPrimaryAction: () => void
  onSecondaryAction: () => void
}

const noopChordDetailAction = (): undefined => undefined

export function useChordDetail({
  chordHash: _chordHash,
  currentEntryKey,
  currentEntryBindings,
  bindingsForHash,
  collisionsById
}: UseChordDetailOptions): UseChordDetailResult {
  const apps = useMemo((): string[] => {
    const seen = new Set<string>()
    for (const binding of bindingsForHash) {
      seen.add(binding.app)
    }
    return [...seen].sort()
  }, [bindingsForHash])

  const tabs = useMemo(() => buildChordDetailTabs(apps), [apps])

  const { globalBinding, hasHardCollisions } = useMemo(() => {
    const global = bindingsForHash.find(binding => binding.scope === 'global') ?? null
    const hard = bindingsForHash.some(binding => {
      const cols = collisionsById.get(binding.bindingId) ?? []
      return cols.some(collision => collision.kind === 'hard')
    })
    return { globalBinding: global, hasHardCollisions: hard }
  }, [bindingsForHash, collisionsById])

  const currentEntryBindingById = useMemo(() => {
    const map = new Map<string, (typeof currentEntryBindings)[0]>()
    for (const binding of currentEntryBindings) {
      map.set(computeEntryBindingId(currentEntryKey, binding), binding)
    }
    return map
  }, [currentEntryBindings, currentEntryKey])

  const chordDisplaySteps = useMemo(
    () => resolveChordDisplaySteps(bindingsForHash, currentEntryBindingById),
    [bindingsForHash, currentEntryBindingById]
  )

  const [activeTab, setActiveTab] = useState<ChordDetailTab>(() => ({ type: 'globals' }))
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)

  const rows = useMemo(
    () => buildChordDetailRows(activeTab, bindingsForHash, collisionsById, currentEntryKey),
    [activeTab, bindingsForHash, collisionsById, currentEntryKey]
  )

  const selectedRow = useMemo((): ChordDetailRow | null => {
    if (selectedRowIndex === null || selectedRowIndex < 0 || selectedRowIndex >= rows.length) return null
    return rows[selectedRowIndex] ?? null
  }, [selectedRowIndex, rows])

  const handleSetActiveTab = useCallback((tab: ChordDetailTab) => {
    setActiveTab(tab)
    setSelectedRowIndex(null)
  }, [])

  return {
    tabs,
    activeTab,
    setActiveTab: handleSetActiveTab,
    rows,
    selectedRowIndex,
    setSelectedRowIndex,
    selectedRow,
    globalBinding,
    hasHardCollisions,
    chordDisplaySteps,
    onPrimaryAction: noopChordDetailAction,
    onSecondaryAction: noopChordDetailAction
  }
}
