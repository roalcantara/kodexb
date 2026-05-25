import { ENTRY_TYPE_VALUES } from '@core/domain/constants/entry.const'
import { sortedTags } from '@core/domain/models/knowledges/tags/sorted_tags.util'
import { showTaskSection } from '@core/domain/models/knowledges/task_views/show_task_section.util'
import { TASK_VIEW_ORDER } from '@core/domain/models/knowledges/task_views/task_view_order.const'
import type { EntryType } from '@core/domain/types/entry.types'
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
  types: EntryType[]
  tags: string[]
  taskView?: TaskView
  tagQ: string
  setTagQ: (v: string) => void
  onChange: (next: { types: EntryType[]; tags: string[]; taskView?: TaskView }) => void
  style: { top: number; left: number; width: number }
}

function FilterDropdownPanel({ stats, types, tags, taskView, tagQ, setTagQ, onChange, style }: PanelProps) {
  const tagRows = useMemo(() => sortedTags(stats.tags, tagQ, tags), [stats.tags, tagQ, tags])

  const pickType = (t: EntryType) => {
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
    <section
      className="theme-filter-drop"
      style={style}
      onMouseDown={e => e.stopPropagation()}
      aria-label="Filter options"
    >
      <input
        className="theme-filter-search"
        placeholder="Search filters…"
        value={tagQ}
        onChange={e => setTagQ(e.target.value)}
      />
      <button type="button" className="theme-filter-all" onClick={clearAll}>
        All ({stats.total})
      </button>
      {showTaskSection(types) ? (
        <section className="theme-filter-section">
          <div className="theme-filter-section-title">Task views</div>
          {TASK_VIEW_ORDER.map(v => (
            <button
              key={v}
              type="button"
              className={taskView === v ? 'theme-filter-row theme-filter-row--on' : 'theme-filter-row'}
              onClick={() => pickTaskView(v)}
            >
              {TASK_VIEW_LABEL[v]} ({stats.taskViews[v]})
            </button>
          ))}
        </section>
      ) : null}
      <section className="theme-filter-section">
        <div className="theme-filter-section-title">Types</div>
        {ENTRY_TYPE_VALUES.map(t => (
          <button
            key={t}
            type="button"
            className={types.includes(t) ? 'theme-filter-row theme-filter-row--on' : 'theme-filter-row'}
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
  types: EntryType[]
  tags: string[]
  taskView?: TaskView
  onChange: (next: { types: EntryType[]; tags: string[]; taskView?: TaskView }) => void
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
      <div className="theme-filter-stack theme-filter-stack--compact-portal">
        <button type="button" className="theme-filter-backdrop" aria-label="Close filters" onClick={onClose} />
        <div className="theme-filter-portal-clip" style={{ top, left, width, height: maxHeight, maxHeight }}>
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
    <div className="theme-filter-stack">
      <button type="button" className="theme-filter-backdrop" aria-label="Close filters" onClick={onClose} />
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
