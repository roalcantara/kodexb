import {
  BINDING_FRECENCY_WEIGHT_PRIMARY,
  BINDING_FRECENCY_WEIGHT_REVEAL
} from '@shared/constants/binding_frecency_weight.const'
import type { RpcKnowledge } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { ChordDetail } from '../../components/shortcuts/chord_detail.component'
import { ShortcutKeymap } from '../../components/shortcuts/shortcut_keymap.component'
import { useBindings } from '../../hooks/shortcuts/use_bindings_cache.hook'
import { recordBindingVisit } from '../../rpc/client'

export type ShortcutDetailBody =
  | { mode: 'keymap'; restoreBindingId: string | null }
  | { mode: 'chord'; chordHash: string; restoreBindingId: string }

export type DetailShortcutBodyProps = {
  entry: RpcKnowledge
  entryId: number
  body: ShortcutDetailBody
  displayAdvisories: boolean
  onChordDetailNavigate: (chordHash: string, bindingId: string) => void
  onBack: () => void
}

export function DetailShortcutBody({
  entry,
  entryId,
  body,
  displayAdvisories,
  onChordDetailNavigate,
  onBack
}: DetailShortcutBodyProps) {
  const cache = useBindings()

  if (entry.type !== 'shortcut') return null

  if (body.mode === 'chord') {
    return (
      <ChordDetail
        key={`${entryId}-${body.chordHash}`}
        chordHash={body.chordHash}
        entry={entry}
        cache={{ byHash: cache.byHash, collisionsById: cache.collisionsById }}
        displayAdvisories={displayAdvisories}
        onBack={onBack}
        onRevealSource={bindingId => {
          fireAndForget(recordBindingVisit(bindingId, BINDING_FRECENCY_WEIGHT_REVEAL))
        }}
      />
    )
  }

  return (
    <ShortcutKeymap
      key={`${entryId}-${body.restoreBindingId ?? 'none'}`}
      entry={entry}
      cache={{ all: cache.all, collisionsById: cache.collisionsById }}
      displayAdvisories={displayAdvisories}
      initialSelectedBindingId={body.restoreBindingId}
      onChordDetailNavigate={onChordDetailNavigate}
      onRevealSource={bindingId => {
        fireAndForget(recordBindingVisit(bindingId, BINDING_FRECENCY_WEIGHT_REVEAL))
      }}
    />
  )
}

export function navigateToChordDetail(
  chordHash: string,
  bindingId: string,
  setBody: (body: ShortcutDetailBody) => void
): void {
  fireAndForget(recordBindingVisit(bindingId, BINDING_FRECENCY_WEIGHT_PRIMARY))
  setBody({ mode: 'chord', chordHash, restoreBindingId: bindingId })
}
