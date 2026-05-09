import type { ListStats, TaskView } from '@shared/rpc'
import { useMemo, useState } from 'react'
import { TASK_VIEW_LABEL, TYPE_FILTER_LABEL } from '../../constants/filter_labels.const'
import { FILTER_DROPDOWN_GAP_PX, FILTER_DROPDOWN_MAX_WIDTH_PX } from '../../constants/layout.const'
import { FilterDropdownTags } from './filter_dropdown_tags.component'

const ENTRY_TYPES = ['bookmark', 'command', 'cheat', 'task'] as const
export type EntryTypeOption = (typeof ENTRY_TYPES)[number]

const TASK_VIEWS: TaskView[] = ['actionable', 'today', 'overdue', 'this_week', 'all_pending', 'all_doing']

function sortedTags(tags: Record<string, number>, q: string): Array<{ tag: string; count: number }> {
  const needle = q.trim().toLowerCase()
  return Object.entries(tags)
    .filter(([t]) => needle === '' || t.toLowerCase().includes(needle))
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => (a.count === b.count ? a.tag.localeCompare(b.tag) : b.count - a.count))
}

function showTaskSection(types: EntryTypeOption[]): boolean {
  return types.length === 0 || types.includes('task')
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
  const tagRows = useMemo(() => sortedTags(stats.tags, tagQ), [stats.tags, tagQ])

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
}

export function FilterDropdown({
  open,
  anchorRect,
  stats,
  types,
  tags,
  taskView,
  onChange,
  onClose
}: FilterDropdownProps) {
  const [tagQ, setTagQ] = useState('')

  if (!open || anchorRect === null) return null

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
