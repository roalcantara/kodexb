import { entryActionPrimaryRowHint } from '@core/helpers/entry_action/entry_action_row_hint.util'
import type { RpcKnowledge, RpcListEntry } from '@shared/rpc'
import { memo } from 'react'
import { getIcon } from '../../utils/shared/get_icon.util'
import { BadgeAccessory } from '../shared/badge_accessory.component'
import { EntryRowFrecencyIndicator } from './entry_row_frecency_indicator.component'

const DESC_PREVIEW_LEN = 80

type DragHandlers = {
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent) => void
}

export type EntryRowProps = {
  entry: RpcListEntry
  allEntries: RpcKnowledge[]
  selected: boolean
  onSelect: (id: number) => void
  maxFrecencyScore?: number
  dragHandlers?: DragHandlers
  dragOver?: boolean
  onCycleStatus?: (id: number) => void
  onCyclePriority?: (id: number) => void
  compact?: boolean
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

function BadgeChips({ entry }: { entry: Extract<RpcKnowledge, { type: 'task' }> }) {
  return (
    <>
      <span className={`theme-type-chip theme-type-chip--${entry.status}`}>{entry.status}</span>
      {entry.priority ? (
        <span className={`theme-type-chip theme-type-chip--${entry.priority}`}>{entry.priority}</span>
      ) : null}
    </>
  )
}

function typeChip(entry: RpcKnowledge) {
  return <span className={`theme-type-chip theme-type-chip--${entry.type}`}>{entry.type}</span>
}

function EntryRowComponent({
  entry,
  allEntries,
  selected,
  onSelect,
  dragHandlers,
  dragOver,
  onCycleStatus,
  onCyclePriority,
  maxFrecencyScore = 0,
  compact
}: EntryRowProps) {
  if (compact) {
    const isTask = entry.type === 'task'
    const rowCls = selected ? 'theme-list-row theme-list-row--selected' : 'theme-list-row'
    return (
      <button
        type="button"
        className={rowCls}
        data-entry-id={entry.id}
        tabIndex={-1}
        onClick={() => onSelect(entry.id)}
      >
        <span className="theme-list-row-icon">{getIcon(entry)}</span>
        <span className="theme-list-row-body">
          <span className="theme-list-row-title">{titleLine(entry)}</span>
          <span className="theme-list-row-subtitle">
            {typeChip(entry)}
            {entry.tags.map(t => (
              <span key={t} className="theme-type-chip">
                {t}
              </span>
            ))}
            {isTask ? <BadgeChips entry={entry as Extract<RpcKnowledge, { type: 'task' }>} /> : null}
          </span>
        </span>
        <span className="theme-list-row-trailing">
          <EntryRowFrecencyIndicator
            frecencyScore={entry.frecencyScore}
            visitCount={entry.visitCount}
            maxFrecencyScore={maxFrecencyScore}
          />
        </span>
      </button>
    )
  }

  const cls = selected
    ? 'theme-entry-row theme-entry-row--selected'
    : dragOver
      ? 'theme-entry-row theme-entry-row--drag-over'
      : 'theme-entry-row'
  return (
    <button
      type="button"
      className={cls}
      data-entry-id={entry.id}
      tabIndex={-1}
      draggable={dragHandlers?.draggable}
      onMouseDown={e => {
        e.preventDefault()
      }}
      onClick={() => onSelect(entry.id)}
      onDragStart={dragHandlers?.onDragStart}
      onDragEnd={dragHandlers?.onDragEnd}
      onDragOver={dragHandlers?.onDragOver}
      onDragLeave={dragHandlers?.onDragLeave}
      onDrop={dragHandlers?.onDrop}
    >
      <div className="theme-entry-row-glyph">{getIcon(entry)}</div>
      <div className="theme-entry-row-body">
        <div className="theme-entry-row-title">{titleLine(entry)}</div>
        <div className="theme-entry-row-sub">{subtitleLine(entry)}</div>
      </div>
      <div className="theme-entry-row-badges">
        <BadgeAccessory
          entry={entry}
          allEntries={allEntries}
          onCycleStatus={onCycleStatus}
          onCyclePriority={onCyclePriority}
        />
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
    prev.maxFrecencyScore === next.maxFrecencyScore &&
    prev.entry.frecencyScore === next.entry.frecencyScore &&
    prev.entry.visitCount === next.entry.visitCount &&
    prev.onSelect === next.onSelect
)
