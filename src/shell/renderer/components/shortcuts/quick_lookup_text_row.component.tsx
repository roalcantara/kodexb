import type { BindingRef } from '@shared/rpc'
import { collisionKindFlagsForBinding } from '../../utils/shortcuts/binding_collision_kind.util'
import type { BindingCollisionByHash } from '../../utils/shortcuts/binding_collisions_by_hash.util'
import { onBindingRowEnterKeyDown } from '../../utils/shortcuts/binding_row_enter_keydown.util'

export type QuickLookupTextRowProps = {
  binding: BindingRef
  rowIndex: number
  isSelected: boolean
  displayAdvisories: boolean
  collisionsById: Map<string, BindingCollisionByHash[]>
  onSelect: () => void
  onPrimary: () => void
  onSecondary: () => void
}

export function QuickLookupTextRow({
  binding,
  rowIndex,
  isSelected,
  displayAdvisories,
  collisionsById,
  onSelect,
  onPrimary,
  onSecondary
}: QuickLookupTextRowProps) {
  const { hasHard, hasSoft } = collisionKindFlagsForBinding(collisionsById, binding.bindingId)
  const icon = hasHard ? '⚠' : displayAdvisories && hasSoft ? '·' : ''

  return (
    <button
      type="button"
      data-row-index={rowIndex}
      className={`quick-lookup-row${isSelected ? ' quick-lookup-row--selected' : ''}`}
      onClick={onSelect}
      onKeyDown={e => onBindingRowEnterKeyDown(e, onPrimary, onSecondary)}
    >
      <span className="quick-lookup-row-icon">
        {icon === '⚠' ? (
          <span className="quick-lookup-collision-icon quick-lookup-collision-icon--warn" title="Hard collision">
            {icon}
          </span>
        ) : icon === '·' ? (
          <span className="quick-lookup-collision-icon quick-lookup-collision-icon--soft" title="Soft advisory">
            {icon}
          </span>
        ) : null}
      </span>
      <span className="quick-lookup-row-action">{binding.action}</span>
      <span className="quick-lookup-row-meta">
        <span className="quick-lookup-row-app">{binding.app}</span>
        {binding.scope === 'global' && <span className="quick-lookup-row-scope">G</span>}
      </span>
    </button>
  )
}
