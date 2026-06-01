import type { Binding } from '@core/domain/models/entries/schemas/shortcut.schema'
import { memo } from 'react'
import type { CollisionInfo } from '../../hooks/shortcuts/use_keymap_view.hook'
import { onBindingRowEnterKeyDown } from '../../utils/shortcuts/binding_row_enter_keydown.util'
import { KbdChip } from './kbd_chip.component'

export type BindingRowProps = {
  binding: Binding
  collisions: CollisionInfo[]
  displayAdvisories: boolean
  selected: boolean
  onSelect: () => void
  onPrimary: () => void
  onSecondary: () => void
  onInfo: () => void
  platform?: 'macos' | 'linux' | 'windows'
}

function collisionIcon(colls: CollisionInfo[], displayAdvisories: boolean): string {
  if (colls.some(c => c.kind === 'hard')) return '⚠'
  if (displayAdvisories && colls.some(c => c.kind === 'soft')) return '·'
  return ''
}

function collisionTitle(colls: CollisionInfo[]): string {
  if (colls.length === 0) return 'no conflicts'
  const hard = colls.filter(c => c.kind === 'hard')
  const soft = colls.filter(c => c.kind === 'soft')
  const parts: string[] = []
  if (hard.length > 0) parts.push(`${hard.length} conflict${hard.length > 1 ? 's' : ''}`)
  if (soft.length > 0) parts.push(`advisory: also local in ${soft[0]?.otherApp}`)
  return parts.join('; ')
}

function BindingRowComponent({
  binding,
  collisions,
  displayAdvisories,
  selected,
  onSelect,
  onPrimary,
  onSecondary,
  onInfo,
  platform = 'macos'
}: BindingRowProps) {
  const icon = collisionIcon(collisions, displayAdvisories)
  const title = collisionTitle(collisions)
  const isHard = collisions.some(c => c.kind === 'hard')

  return (
    <button
      type="button"
      className={`cmp-keymap-row${selected ? ' cmp-keymap-row--selected' : ''}`}
      onClick={onSelect}
      onKeyDown={e => onBindingRowEnterKeyDown(e, onPrimary, onSecondary)}
      data-binding-id={binding.id ?? binding.action}
    >
      <span
        className={`cmp-keymap-row__icon${icon === '⚠' ? ' cmp-keymap-row__icon--warn' : icon === '·' ? ' cmp-keymap-row__icon--soft' : ''}`}
        title={title}
      >
        {icon}
      </span>
      <span className="cmp-keymap-row__main">
        <span className="cmp-keymap-row__action">{binding.action}</span>
        <span className={`cmp-keymap-row__note${isHard ? ' cmp-keymap-row__note--warn' : ''}`}>{title}</span>
      </span>
      <span className="cmp-keymap-row__chord">
        <KbdChip chord={binding.chord} platform={platform} />
      </span>
      <button
        type="button"
        className="cmp-keymap-row__info"
        aria-label="Binding info"
        title="when / notes / links"
        onClick={e => {
          e.stopPropagation()
          onInfo()
        }}
      >
        ⓘ
      </button>
    </button>
  )
}

export const BindingRow = memo(
  BindingRowComponent,
  (prev, next) =>
    prev.binding === next.binding &&
    prev.selected === next.selected &&
    prev.displayAdvisories === next.displayAdvisories &&
    prev.collisions.length === next.collisions.length &&
    prev.collisions.every((c, i) => c.kind === next.collisions[i]?.kind && c.otherApp === next.collisions[i]?.otherApp)
)
