import type { Binding } from '@core/domain/models/entries/schemas/shortcut.schema'
import type { ShortcutKnowledge } from '@core/domain/models/knowledges/schemas/knowledge.schema'
import { BINDING_FRECENCY_WEIGHT_REVEAL } from '@shared/constants/binding_frecency_weight.const'
import type { RpcKnowledge } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { memo, useEffect } from 'react'
import type { CollisionInfo } from '../../hooks/shortcuts/use_chord_detail.hook'
import { useChordDetail } from '../../hooks/shortcuts/use_chord_detail.hook'
import { recordBindingVisit } from '../../rpc/client'
import { ChordDetailRows } from './chord_detail_rows.component'
import { KbdChip } from './kbd_chip.component'

export type ChordDetailComponentProps = {
  chordHash: string
  entry: RpcKnowledge
  cache: {
    byHash: Map<string, import('@shared/rpc').BindingRef[]>
    collisionsById: Map<string, CollisionInfo[]>
  }
  displayAdvisories: boolean
  onBack: () => void
  onRevealSource?: (bindingId: string) => void
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

function ChordDetailComponent({
  chordHash,
  entry,
  cache,
  displayAdvisories,
  onBack,
  onRevealSource
}: ChordDetailComponentProps) {
  const shortcutEntry: ShortcutKnowledge =
    entry.type === 'shortcut' ? (entry as ShortcutKnowledge) : EMPTY_SHORTCUT_ENTRY

  const bindingsForHash = cache.byHash.get(chordHash) ?? []

  const state = useChordDetail({
    chordHash,
    currentEntryKey: shortcutEntry.key,
    currentEntryBindings: shortcutEntry.bindings as Binding[],
    bindingsForHash,
    collisionsById: cache.collisionsById,
    displayAdvisories
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return
      const selectedRow = state.selectedRow
      if (!selectedRow) return
      e.preventDefault()
      fireAndForget(recordBindingVisit(selectedRow.bindingRef.bindingId, BINDING_FRECENCY_WEIGHT_REVEAL))
      onRevealSource?.(selectedRow.bindingRef.bindingId)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state.selectedRow, onRevealSource])

  return (
    <section className="cmp-chord-detail" data-chord-hash={chordHash}>
      <div className="cmp-chord-detail__crumb">
        <button type="button" className="cmp-chord-detail__back" onClick={onBack}>
          ← {shortcutEntry.key} keymap
        </button>
        <span className="cmp-chord-detail__crumb-sep">·</span>
        <span className="cmp-chord-detail__crumb-label">
          chord detail for{' '}
          {state.chordDisplaySteps ? <KbdChip chord={state.chordDisplaySteps} platform="macos" /> : chordHash}
        </span>
      </div>

      <div className="cmp-chord-detail__head">
        <div className="cmp-chord-detail__chord-block">
          {state.chordDisplaySteps && <KbdChip chord={state.chordDisplaySteps} platform="macos" />}
          <div className="cmp-chord-detail__head-meta">
            <div className="cmp-chord-detail__head-title">chord</div>
            <div className="cmp-chord-detail__head-stats">
              {bindingsForHash.length} apps
              {state.hasHardCollisions ? ' · ' : ''}
              {state.hasHardCollisions && <span className="cmp-chord-detail__warn">⚠ conflicts</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="cmp-chord-detail__summary">
        <div
          className={`cmp-chord-detail__summary-card${state.globalBinding ? ' cmp-chord-detail__summary-card--warn' : ' cmp-chord-detail__summary-card--free'}`}
        >
          <div className="cmp-chord-detail__summary-label">Global</div>
          {state.globalBinding ? (
            <>
              <div className="cmp-chord-detail__summary-value">
                <span className="cmp-chord-detail__scope-dot cmp-chord-detail__scope-dot--global" />
                {state.globalBinding.action}
              </div>
              <div className="cmp-chord-detail__summary-sub">{state.globalBinding.app}</div>
            </>
          ) : (
            <>
              <div className="cmp-chord-detail__summary-value cmp-chord-detail__summary-value--free">
                — chord is free system-wide
              </div>
              <div className="cmp-chord-detail__summary-sub">no global binding will preempt this chord</div>
            </>
          )}
        </div>

        {state.hasHardCollisions ? (
          <div className="cmp-chord-detail__summary-card cmp-chord-detail__summary-card--hard">
            <div className="cmp-chord-detail__summary-label">⚠ Hard collision</div>
            <div className="cmp-chord-detail__summary-value">same chord, same app</div>
            <div className="cmp-chord-detail__summary-sub">one binding will be unreachable</div>
          </div>
        ) : (
          <div className="cmp-chord-detail__summary-card cmp-chord-detail__summary-card--soft">
            <div className="cmp-chord-detail__summary-label">Advisory</div>
            <div className="cmp-chord-detail__summary-value">
              {bindingsForHash.filter(b => b.scope === 'local').length} cross-app overlap
            </div>
            <div className="cmp-chord-detail__summary-sub">coexistence advisory — not a conflict</div>
          </div>
        )}
      </div>

      <ChordDetailRows state={state} bindingsForHash={bindingsForHash} displayAdvisories={displayAdvisories} />

      <div className="cmp-chord-detail__footer">
        <span>
          <b>←</b> back to keymap
        </span>
        <span>
          <b>⌘↵</b> reveal source
        </span>
        <span>
          <b>↑↓</b> select
        </span>
      </div>
    </section>
  )
}

export const ChordDetail = memo(
  ChordDetailComponent,
  (prev, next) =>
    prev.chordHash === next.chordHash && prev.entry === next.entry && prev.displayAdvisories === next.displayAdvisories
)
