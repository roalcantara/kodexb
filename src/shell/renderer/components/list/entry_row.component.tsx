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

function getPrimaryActionHint(entry: RpcKnowledge): { label: string; className: string } | null {
  switch (entry.type) {
    case 'bookmark':
      return { label: '\u21B5 Open', className: 'kb-pt-row-hint--bookmark' }
    case 'command':
      return { label: '\u2318C Copy', className: 'kb-pt-row-hint--command' }
    case 'cheat':
      return { label: '\u2318C Copy', className: 'kb-pt-row-hint--cheat' }
    case 'task':
      return { label: '\u2318E Edit', className: 'kb-pt-row-hint--task' }
  }
}

function BadgeChips({ entry }: { entry: Extract<RpcKnowledge, { type: 'task' }> }) {
  return (
    <>
      <span className={`kb-pt-chip kb-pt-chip--${entry.status}`}>{entry.status}</span>
      {entry.priority ? <span className={`kb-pt-chip kb-pt-chip--${entry.priority}`}>{entry.priority}</span> : null}
    </>
  )
}

function typeChip(entry: RpcKnowledge) {
  return <span className={`kb-pt-chip kb-pt-chip--${entry.type}`}>{entry.type}</span>
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
    const hint = getPrimaryActionHint(entry)
    const rowCls = selected ? 'kb-pt-row kb-pt-row--selected' : 'kb-pt-row'
    return (
      <button
        type="button"
        className={rowCls}
        data-entry-id={entry.id}
        tabIndex={-1}
        onClick={() => onSelect(entry.id)}
      >
        <span className="kb-pt-row-icon">{getIcon(entry)}</span>
        <span className="kb-pt-row-body">
          <span className="kb-pt-row-title">{titleLine(entry)}</span>
          <span className="kb-pt-row-subtitle">
            {typeChip(entry)}
            {entry.tags.map(t => (
              <span key={t} className="kb-pt-chip">
                {t}
              </span>
            ))}
            {isTask ? <BadgeChips entry={entry as Extract<RpcKnowledge, { type: 'task' }>} /> : null}
          </span>
        </span>
        <span className="kb-pt-row-trailing">
          <EntryRowFrecencyIndicator
            frecencyScore={entry.frecencyScore}
            visitCount={entry.visitCount}
            maxFrecencyScore={maxFrecencyScore}
          />
          {hint && selected ? <span className={`kb-pt-row-hint ${hint.className}`}>{hint.label}</span> : null}
        </span>
      </button>
    )
  }

  const cls = selected
    ? 'kb-entryRow kb-entryRow--selected'
    : dragOver
      ? 'kb-entryRow kb-entryRow--dragOver'
      : 'kb-entryRow'
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
      <div className="kb-entryRow-glyph">{getIcon(entry)}</div>
      <div className="kb-entryRow-body">
        <div className="kb-entryRow-title">{titleLine(entry)}</div>
        <div className="kb-entryRow-sub">{subtitleLine(entry)}</div>
      </div>
      <div className="kb-entryRow-badges">
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
