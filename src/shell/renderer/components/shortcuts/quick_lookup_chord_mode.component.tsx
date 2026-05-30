import type { BindingRef } from '@shared/rpc'
import { collisionKindFlagsForBinding } from '../../utils/shortcuts/binding_collision_kind.util'
import type { BindingCollisionByHash } from '../../utils/shortcuts/binding_collisions_by_hash.util'

export type QuickLookupChordModeProps = {
  card: { hash: string; bindings: BindingRef[] }
  highlightIndex: number
  rows: BindingRef[]
  displayAdvisories: boolean
  collisionsById: Map<string, BindingCollisionByHash[]>
  onSelectIndex: (index: number) => void
  onPrimary: (row: BindingRef) => void
  onSecondary: (row: BindingRef) => void
}

export function QuickLookupChordMode({
  card,
  highlightIndex,
  rows,
  displayAdvisories,
  collisionsById,
  onSelectIndex,
  onPrimary,
  onSecondary
}: QuickLookupChordModeProps) {
  return (
    <div className="quick-lookup-chord-card">
      <div className="quick-lookup-chord-card-header">
        <span className="quick-lookup-chord-card-title">chord</span>
        <span className="quick-lookup-chord-card-count">{card.bindings.length} bindings</span>
      </div>

      <div className="quick-lookup-chord-card-rows">
        {card.bindings.map((binding, rowIndex) => {
          const globalRow = binding.scope === 'global'
          const { hasHard, hasSoft } = collisionKindFlagsForBinding(collisionsById, binding.bindingId)

          return (
            <button
              key={binding.bindingId}
              type="button"
              data-row-index={rowIndex}
              className={`quick-lookup-chord-row${rowIndex === highlightIndex ? ' quick-lookup-chord-row--selected' : ''}`}
              onClick={() => onSelectIndex(rowIndex)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault()
                  onPrimary(binding)
                } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  onSecondary(binding)
                }
              }}
            >
              <span
                className={`quick-lookup-chord-scope-mark${globalRow ? ' quick-lookup-chord-scope-mark--global' : ''}`}
              />
              <span className="quick-lookup-chord-app">{globalRow ? 'global' : `local · ${binding.app}`}</span>
              <span className="quick-lookup-chord-action">{binding.action}</span>
              <span className="quick-lookup-chord-meta">
                {hasHard ? (
                  <span
                    className="quick-lookup-collision-icon quick-lookup-collision-icon--warn"
                    title="Hard collision"
                  >
                    ⚠
                  </span>
                ) : hasSoft && displayAdvisories ? (
                  <span className="quick-lookup-collision-icon quick-lookup-collision-icon--soft" title="Soft advisory">
                    ·
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>

      {highlightIndex < rows.length && (
        <div className="quick-lookup-chord-card-footer">
          <span>↵ chord detail · ⌘↵ reveal source</span>
        </div>
      )}
    </div>
  )
}
