import type { AuthoringChordStep } from '@core/domain/models/entries/schemas/shortcut.schema'
import {
  BINDING_FRECENCY_WEIGHT_PRIMARY,
  BINDING_FRECENCY_WEIGHT_REVEAL
} from '@shared/constants/binding_frecency_weight.const'
import type { BindingRef } from '@shared/rpc'
import type { BindingCollisionByHash } from '../../utils/shortcuts/binding_collisions_by_hash.util'
import { QuickLookupChordMode } from './quick_lookup_chord_mode.component'
import { QuickLookupTextRow } from './quick_lookup_text_row.component'

export type QuickLookupResultsProps = {
  mode: 'text' | 'chord'
  firstChordCard: { hash: string; bindings: BindingRef[] } | undefined
  chordCards: { hash: string; bindings: BindingRef[] }[]
  chordSteps: AuthoringChordStep[] | null
  textRows: BindingRef[]
  rows: BindingRef[]
  highlightIndex: number
  displayAdvisories: boolean
  collisionsById: Map<string, BindingCollisionByHash[]>
  onSelectIndex: (index: number) => void
  recordVisit: (bindingId: string, weight: number) => void
}

export function QuickLookupResults({
  mode,
  firstChordCard,
  chordCards,
  chordSteps,
  textRows,
  rows,
  highlightIndex,
  displayAdvisories,
  collisionsById,
  onSelectIndex,
  recordVisit
}: QuickLookupResultsProps) {
  if (mode === 'chord' && firstChordCard) {
    return (
      <QuickLookupChordMode
        card={firstChordCard}
        highlightIndex={highlightIndex}
        rows={rows}
        displayAdvisories={displayAdvisories}
        collisionsById={collisionsById}
        onSelectIndex={onSelectIndex}
        onPrimary={row => recordVisit(row.bindingId, BINDING_FRECENCY_WEIGHT_PRIMARY)}
        onSecondary={row => recordVisit(row.bindingId, BINDING_FRECENCY_WEIGHT_REVEAL)}
      />
    )
  }

  if (mode === 'text' && textRows.length === 0) {
    return <div className="quick-lookup-empty">No bindings found</div>
  }

  if (mode === 'chord' && chordCards.length === 0 && chordSteps) {
    return <div className="quick-lookup-empty">No bindings for this chord</div>
  }

  if (mode !== 'text') return null

  return (
    <>
      {textRows.map((row, index) => (
        <QuickLookupTextRow
          key={row.bindingId}
          binding={row}
          rowIndex={index}
          isSelected={index === highlightIndex}
          displayAdvisories={displayAdvisories}
          collisionsById={collisionsById}
          onSelect={() => onSelectIndex(index)}
          onPrimary={() => recordVisit(row.bindingId, BINDING_FRECENCY_WEIGHT_PRIMARY)}
          onSecondary={() => recordVisit(row.bindingId, BINDING_FRECENCY_WEIGHT_REVEAL)}
        />
      ))}
    </>
  )
}
