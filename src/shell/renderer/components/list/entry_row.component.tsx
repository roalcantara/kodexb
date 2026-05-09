import type { RpcKnowledge } from '@shared/rpc'
import { memo } from 'react'

import { getIcon } from '../../utils/shared/get_icon.util'
import { BadgeAccessory } from '../shared/badge_accessory.component'

const DESC_PREVIEW_LEN = 80

export type EntryRowProps = {
  entry: RpcKnowledge
  allEntries: RpcKnowledge[]
  selected: boolean
  onSelect: (id: number) => void
}

function titleLine(entry: RpcKnowledge): string {
  if (entry.desc.trim() === '') return entry.key
  const d = entry.desc.length > DESC_PREVIEW_LEN ? `${entry.desc.slice(0, DESC_PREVIEW_LEN)}…` : entry.desc
  return `${entry.key}  ${d}`
}

function subtitleLine(entry: RpcKnowledge): string {
  const tags = entry.tags.length > 0 ? entry.tags.map(t => `#${t}`).join(' ') : ''
  return `${entry.type}${tags === '' ? '' : `  ${tags}`}`
}

function EntryRowComponent({ entry, allEntries, selected, onSelect }: EntryRowProps) {
  const cls = selected ? 'kb-entryRow kb-entryRow--selected' : 'kb-entryRow'
  return (
    <button
      type="button"
      className={cls}
      data-entry-id={entry.id}
      tabIndex={-1}
      onMouseDown={e => {
        e.preventDefault()
      }}
      onClick={() => onSelect(entry.id)}
    >
      <div className="kb-entryRow-glyph">{getIcon(entry)}</div>
      <div className="kb-entryRow-body">
        <div className="kb-entryRow-title">{titleLine(entry)}</div>
        <div className="kb-entryRow-sub">{subtitleLine(entry)}</div>
      </div>
      <div className="kb-entryRow-badges">
        {entry.type === 'task' ? (
          <BadgeAccessory entry={entry} allEntries={allEntries} />
        ) : (
          <BadgeAccessory entry={entry} />
        )}
      </div>
    </button>
  )
}

export const EntryRow = memo(
  EntryRowComponent,
  (prev, next) =>
    prev.entry === next.entry &&
    prev.allEntries === next.allEntries &&
    prev.selected === next.selected &&
    prev.onSelect === next.onSelect
)
