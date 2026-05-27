import type { RpcKnowledge, RpcListEntry } from '@shared/rpc'
import { memo } from 'react'
import {
  entryGlyphTileClass,
  entryMetaSemanticClass,
  entryMetaText,
  entryTagItems,
  entryTitleText
} from '../../utils/list/entry_row_display.util'
import { getIcon } from '../../utils/shared/get_icon.util'
import { BadgeAccessory } from '../shared/badge_accessory.component'
import { EntryRowFrecencyIndicator } from './entry_row_frecency_indicator.component'

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

function BadgeChips({ entry }: { entry: Extract<RpcKnowledge, { type: 'task' }> }) {
  return (
    <>
      <span className={`cmp-tag cmp-tag--status-${entry.status}`}>{entry.status}</span>
      {entry.priority ? <span className={`cmp-tag cmp-tag--priority-${entry.priority}`}>{entry.priority}</span> : null}
    </>
  )
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
    const rowCls = selected ? 'cmp-list-row cmp-list-row--selected' : 'cmp-list-row'
    const tileCls = entryGlyphTileClass(entry)
    const tags = entryTagItems(entry)
    return (
      <button
        type="button"
        className={rowCls}
        data-entry-id={entry.id}
        tabIndex={-1}
        onClick={() => onSelect(entry.id)}
      >
        <span className={`cmp-list-row-icon ${tileCls}`}>{getIcon(entry)}</span>
        <span className="cmp-list-row-body">
          <span className={`cmp-list-row-meta ${entryMetaSemanticClass(entry)}`}>
            {entry.type === 'task' ? (
              <span className="cmp-list-row-meta-clock" aria-hidden>
                ◷{' '}
              </span>
            ) : null}
            {entryMetaText(entry)}
          </span>
          <span className="cmp-list-row-title">{entryTitleText(entry)}</span>
          <span className="cmp-list-row-tags">
            {tags.map(tag => (
              <span key={tag.key} className={tag.className}>
                {tag.label}
              </span>
            ))}
            {isTask ? <BadgeChips entry={entry as Extract<RpcKnowledge, { type: 'task' }>} /> : null}
          </span>
        </span>
        <span className="cmp-list-row-trailing">
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
    ? 'cmp-entry-row cmp-entry-row--selected'
    : dragOver
      ? 'cmp-entry-row cmp-entry-row--drag-over'
      : 'cmp-entry-row'
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
      <div className={`cmp-entry-row-glyph ${entryGlyphTileClass(entry)}`}>{getIcon(entry)}</div>
      <div className="cmp-entry-row-body">
        <div className={`cmp-entry-row-meta ${entryMetaSemanticClass(entry)}`}>{entryMetaText(entry)}</div>
        <div className="cmp-entry-row-title">{entryTitleText(entry)}</div>
      </div>
      <div className="cmp-entry-row-badges">
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
