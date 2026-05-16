import type { ListStats, TaskView } from '@shared/rpc'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { TASK_VIEW_LABEL, TYPE_FILTER_LABEL } from '../../constants/filter_labels.const'
import {
  FILTER_DROPDOWN_GAP_PX,
  FILTER_DROPDOWN_MAX_WIDTH_PX,
  FILTER_DROPDOWN_PORTAL_FALLBACK_VIEWPORT_HEIGHT_PX,
  FILTER_DROPDOWN_PORTAL_FALLBACK_VIEWPORT_WIDTH_PX,
  FILTER_DROPDOWN_PORTAL_MAX_PANEL_HEIGHT_PX,
  FILTER_DROPDOWN_PORTAL_MIN_PANEL_HEIGHT_PX,
  FILTER_DROPDOWN_PORTAL_MIN_WIDTH_PX,
  FILTER_DROPDOWN_PORTAL_VIEWPORT_BOTTOM_MARGIN_PX,
  FILTER_DROPDOWN_PORTAL_VIEWPORT_HORIZONTAL_MARGIN_PX
} from '../../constants/layout.const'
import { CompactFilterOverlay } from './compact_filter_overlay.component'
import { FilterDropdownTags } from './filter_dropdown_tags.component'

const ENTRY_TYPES = ['bookmark', 'command', 'cheat', 'task'] as const
export type EntryTypeOption = (typeof ENTRY_TYPES)[number]

const TASK_VIEWS: TaskView[] = ['actionable', 'today', 'overdue', 'this_week', 'all_pending', 'all_doing']

export function sortedTags(
  tags: Record<string, number>,
  q: string,
  selectedTags: string[] = []
): Array<{ tag: string; count: number }> {
  const needle = q.trim().toLowerCase()
  return Object.entries(tags)
    .filter(([t, count]) => count > 0 || selectedTags.includes(t))
    .filter(([t]) => needle === '' || t.toLowerCase().includes(needle))
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => (a.count === b.count ? a.tag.localeCompare(b.tag) : b.count - a.count))
}

export function showTaskSection(types: EntryTypeOption[]): boolean {
  return types.length === 0 || types.includes('task')
}

/**
 * Positions the compact filter portal under the anchor vertically, and **horizontally
 * centered in the viewport** (then clamped to side margins). Matches Raycast-style palettes.
 * `anchorRect` / `vw` / `vh` are in CSS pixels (e.g. from `getBoundingClientRect` and `window.inner*`).
 */
export function compactFilterPortalBox(
  anchorRect: Pick<DOMRect, 'left' | 'bottom' | 'width'>,
  vw: number,
  vh: number
): { top: number; left: number; width: number; maxHeight: number } {
  const marginH = FILTER_DROPDOWN_PORTAL_VIEWPORT_HORIZONTAL_MARGIN_PX
  const marginBottom = FILTER_DROPDOWN_PORTAL_VIEWPORT_BOTTOM_MARGIN_PX
  const top = anchorRect.bottom + FILTER_DROPDOWN_GAP_PX

  const capW = Math.max(1, vw - 2 * marginH)
  const width = Math.min(
    Math.max(anchorRect.width, FILTER_DROPDOWN_PORTAL_MIN_WIDTH_PX),
    FILTER_DROPDOWN_MAX_WIDTH_PX,
    capW
  )

  let left = (vw - width) / 2
  left = Math.min(left, vw - marginH - width)
  left = Math.max(marginH, left)

  const maxHeight = Math.min(
    FILTER_DROPDOWN_PORTAL_MAX_PANEL_HEIGHT_PX,
    Math.max(FILTER_DROPDOWN_PORTAL_MIN_PANEL_HEIGHT_PX, vh - top - marginBottom)
  )

  return { top, left, width, maxHeight }
}

type PanelProps = {
  stats: ListStats
  types: EntryTypeOption[]
  tags: string[]
  taskView?: TaskView
  tagQ: string
  setTagQ: (v: string) => void
  onChange: (next: { types: EntryTypeOption[]; tags: string[]; taskView?: TaskView }) => void
  style: { top: number; left: number; width: number }
}

function FilterDropdownPanel({ stats, types, tags, taskView, tagQ, setTagQ, onChange, style }: PanelProps) {
  const tagRows = useMemo(() => sortedTags(stats.tags, tagQ, tags), [stats.tags, tagQ, tags])

  const pickType = (t: EntryTypeOption) => {
    const only = types.length === 1 && types[0] === t ? [] : [t]
    onChange({ types: only, tags, taskView: only.includes('task') ? taskView : undefined })
  }

  const pickTaskView = (v: TaskView) => {
    const next = taskView === v ? undefined : v
    onChange({ types, tags, taskView: next })
  }

  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter(x => x !== tag) : [...tags, tag]
    onChange({ types, tags: next, taskView })
  }

  const clearAll = () => onChange({ types: [], tags: [], taskView: undefined })

  return (
    <section className="kb-filterDrop" style={style} onMouseDown={e => e.stopPropagation()} aria-label="Filter options">
      <input
        className="kb-filterSearch"
        placeholder="Search filters…"
        value={tagQ}
        onChange={e => setTagQ(e.target.value)}
      />
      <button type="button" className="kb-filterAll" onClick={clearAll}>
        All ({stats.total})
      </button>
      {showTaskSection(types) ? (
        <section className="kb-filterSection">
          <div className="kb-filterSection-title">Task views</div>
          {TASK_VIEWS.map(v => (
            <button
              key={v}
              type="button"
              className={taskView === v ? 'kb-filterRow kb-filterRow--on' : 'kb-filterRow'}
              onClick={() => pickTaskView(v)}
            >
              {TASK_VIEW_LABEL[v]} ({stats.taskViews[v]})
            </button>
          ))}
        </section>
      ) : null}
      <section className="kb-filterSection">
        <div className="kb-filterSection-title">Types</div>
        {ENTRY_TYPES.map(t => (
          <button
            key={t}
            type="button"
            className={types.includes(t) ? 'kb-filterRow kb-filterRow--on' : 'kb-filterRow'}
            onClick={() => pickType(t)}
          >
            {TYPE_FILTER_LABEL[t]} ({stats[t]})
          </button>
        ))}
      </section>
      <FilterDropdownTags tagRows={tagRows} selectedTags={tags} onToggle={toggleTag} />
    </section>
  )
}

export type FilterDropdownProps = {
  open: boolean
  anchorRect: DOMRect | null
  stats: ListStats
  types: EntryTypeOption[]
  tags: string[]
  taskView?: TaskView
  onChange: (next: { types: EntryTypeOption[]; tags: string[]; taskView?: TaskView }) => void
  onClose: () => void
  compact?: boolean
  pushToast?: (msg: string, type: 'success' | 'error') => void
  closeToList?: () => void
  isFullDetail?: boolean
}

export function FilterDropdown({
  open,
  anchorRect,
  stats,
  types,
  tags,
  taskView,
  onChange,
  onClose,
  compact,
  pushToast,
  closeToList,
  isFullDetail
}: FilterDropdownProps) {
  const [tagQ, setTagQ] = useState('')

  if (!open) return null

  if (compact) {
    if (anchorRect === null) return null
    const vw = typeof window === 'undefined' ? FILTER_DROPDOWN_PORTAL_FALLBACK_VIEWPORT_WIDTH_PX : window.innerWidth
    const vh = typeof window === 'undefined' ? FILTER_DROPDOWN_PORTAL_FALLBACK_VIEWPORT_HEIGHT_PX : window.innerHeight
    const { top, left, width, maxHeight } = compactFilterPortalBox(anchorRect, vw, vh)

    return createPortal(
      <div className="kb-filterStack kb-filterStack--compactPortal">
        <button type="button" className="kb-filterBackdrop" aria-label="Close filters" onClick={onClose} />
        <div className="kb-pt-filter-portal-clip" style={{ top, left, width, height: maxHeight, maxHeight }}>
          <CompactFilterOverlay
            stats={stats}
            types={types}
            tags={tags}
            taskView={taskView}
            onChange={onChange}
            onClose={onClose}
            pushToast={pushToast}
            closeToList={closeToList}
            isFullDetail={isFullDetail}
          />
        </div>
      </div>,
      document.body
    )
  }

  if (anchorRect === null) return null

  const top = anchorRect.bottom + FILTER_DROPDOWN_GAP_PX
  const left = anchorRect.left
  const width = Math.min(anchorRect.width, FILTER_DROPDOWN_MAX_WIDTH_PX)

  return (
    <div className="kb-filterStack">
      <button type="button" className="kb-filterBackdrop" aria-label="Close filters" onClick={onClose} />
      <FilterDropdownPanel
        stats={stats}
        types={types}
        tags={tags}
        taskView={taskView}
        tagQ={tagQ}
        setTagQ={setTagQ}
        onChange={onChange}
        style={{ top, left, width }}
      />
    </div>
  )
}
