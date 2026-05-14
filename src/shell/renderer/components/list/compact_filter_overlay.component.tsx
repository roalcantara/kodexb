import type { ListStats, TaskView } from '@shared/rpc'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TASK_VIEW_LABEL, TYPE_FILTER_LABEL } from '../../constants/filter_labels.const'
import type { EntryTypeOption } from './filter_dropdown.component'
import { showTaskSection, sortedTags } from './filter_dropdown.component'

const TASK_VIEWS: TaskView[] = ['actionable', 'today', 'overdue', 'this_week', 'all_pending', 'all_doing']

const ENTRY_TYPES: EntryTypeOption[] = ['bookmark', 'command', 'cheat', 'task']

type FilterRow = {
  id: string
  label: string
  count?: number
  kind: 'all' | 'taskView' | 'type' | 'tag'
  isOn: boolean
}

type FilterSnap = {
  types: EntryTypeOption[]
  tags: string[]
  taskView?: TaskView
}

function normalizeSnap(s: FilterSnap): FilterSnap {
  return {
    types: [...s.types].sort(),
    tags: [...s.tags].sort((a, b) => a.localeCompare(b)),
    taskView: s.taskView
  }
}

function snapsEqual(a: FilterSnap, b: FilterSnap): boolean {
  const x = normalizeSnap(a)
  const y = normalizeSnap(b)
  return (
    x.taskView === y.taskView &&
    x.types.length === y.types.length &&
    x.types.every((t, i) => t === y.types[i]) &&
    x.tags.length === y.tags.length &&
    x.tags.every((t, i) => t === y.tags[i])
  )
}

function matchesSearch(label: string, q: string): boolean {
  return q === '' || label.toLowerCase().includes(q)
}

function buildFilterRows(
  stats: ListStats,
  types: EntryTypeOption[],
  tags: string[],
  taskView: TaskView | undefined,
  tagRows: Array<{ tag: string; count: number }>,
  search: string
): FilterRow[] {
  const q = search.trim().toLowerCase()
  const rows: FilterRow[] = [{ id: '__all__', label: 'All', count: stats.total, kind: 'all', isOn: false }]

  if (showTaskSection(types)) {
    for (const v of TASK_VIEWS) {
      const label = TASK_VIEW_LABEL[v]
      if (matchesSearch(label, q)) {
        rows.push({ id: `tv__${v}`, label, count: stats.taskViews[v], kind: 'taskView', isOn: taskView === v })
      }
    }
  }

  for (const t of ENTRY_TYPES) {
    const label = TYPE_FILTER_LABEL[t]
    if (matchesSearch(label, q)) {
      rows.push({ id: `type__${t}`, label, count: stats[t], kind: 'type', isOn: types.includes(t) })
    }
  }

  for (const { tag, count } of tagRows) {
    rows.push({ id: `tag__${tag}`, label: `#${tag}`, count, kind: 'tag', isOn: tags.includes(tag) })
  }

  return rows
}

type RowToggleFn = (row: FilterRow) => void

function createRowToggleHandler(
  types: EntryTypeOption[],
  tags: string[],
  taskView: TaskView | undefined,
  onChange: CompactFilterOverlayProps['onChange']
): RowToggleFn {
  return (row: FilterRow) => {
    switch (row.kind) {
      case 'all':
        onChange({ types: [], tags: [], taskView: undefined })
        return
      case 'taskView': {
        const v = row.id.replace('tv__', '') as TaskView
        onChange({ types, tags, taskView: taskView === v ? undefined : v })
        return
      }
      case 'type': {
        const t = row.id.replace('type__', '') as EntryTypeOption
        const next = types.includes(t) ? types.filter(x => x !== t) : [...types, t]
        onChange({ types: next, tags, taskView: next.includes('task') ? taskView : undefined })
        return
      }
      case 'tag': {
        const tag = row.id.replace('tag__', '')
        onChange({ types, tags: tags.includes(tag) ? tags.filter(x => x !== tag) : [...tags, tag], taskView })
        return
      }
    }
  }
}

const KEY_HANDLERS: Record<string, 'arrowDown' | 'arrowUp' | 'escape' | 'enter'> = {
  ArrowDown: 'arrowDown',
  ArrowUp: 'arrowUp',
  Escape: 'escape',
  Enter: 'enter'
}

export type CompactFilterOverlayProps = {
  stats: ListStats
  types: EntryTypeOption[]
  tags: string[]
  taskView?: TaskView
  onChange: (next: { types: EntryTypeOption[]; tags: string[]; taskView?: TaskView }) => void
  onClose: () => void
  pushToast?: (msg: string, type: 'success' | 'error') => void
  closeToList?: () => void
  isFullDetail?: boolean
}

function useCompactFilterState(props: CompactFilterOverlayProps) {
  const { stats, types, tags, taskView, onChange, onClose, pushToast, closeToList, isFullDetail } = props
  const [search, setSearch] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const snapRef = useRef<FilterSnap | null>(null)

  const tagRows = useMemo(() => sortedTags(stats.tags, search), [stats.tags, search])

  const filterRows = useMemo(
    () => buildFilterRows(stats, types, tags, taskView, tagRows, search),
    [stats, types, taskView, tags, tagRows, search]
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on mount only when overlay re-opens
  useEffect(() => {
    setSearch('')
    setHighlightIndex(0)
    snapRef.current = { types: [...types], tags: [...tags], taskView }
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }, [])

  useEffect(() => {
    setHighlightIndex(prev => Math.min(Math.max(0, prev), Math.max(0, filterRows.length - 1)))
  }, [filterRows.length])

  const commitClose = useCallback(() => {
    const snap = snapRef.current
    const curr: FilterSnap = { types: [...types], tags: [...tags], taskView }
    const changed = snap !== null && !snapsEqual(snap, curr)
    if (changed) {
      pushToast?.('Filters applied', 'success')
      if (isFullDetail) closeToList?.()
    } else {
      pushToast?.('No changes', 'success')
    }
    onClose()
  }, [types, tags, taskView, pushToast, onClose, closeToList, isFullDetail])

  const handleRowToggle = useMemo(
    () => createRowToggleHandler(types, tags, taskView, onChange),
    [types, tags, taskView, onChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault()
    const action = KEY_HANDLERS[e.key]
    if (!action) return
    if (action === 'escape') {
      onClose()
      return
    }
    if (action === 'arrowDown') {
      setHighlightIndex(prev => (filterRows.length > 0 ? Math.min(prev + 1, filterRows.length - 1) : 0))
      return
    }
    if (action === 'arrowUp') {
      setHighlightIndex(prev => Math.max(prev - 1, 0))
      return
    }
    if (document.activeElement === searchInputRef.current) {
      commitClose()
    } else {
      const row = filterRows[highlightIndex]
      if (row) handleRowToggle(row)
    }
  }

  return { search, setSearch, highlightIndex, searchInputRef, filterRows, handleKeyDown, handleRowToggle }
}

export function CompactFilterOverlay(props: CompactFilterOverlayProps) {
  const { search, setSearch, highlightIndex, searchInputRef, filterRows, handleKeyDown, handleRowToggle } =
    useCompactFilterState(props)

  return (
    <div
      className="kb-pt-filter-dropdown"
      onMouseDown={e => e.stopPropagation()}
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-label="Filter options"
    >
      <input
        ref={searchInputRef}
        className="kb-pt-filter-search"
        type="search"
        placeholder="Search filters…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        spellCheck={false}
      />
      <div className="kb-pt-filter-section">Filters</div>
      {filterRows.map((row, i) => (
        <button
          key={row.id}
          type="button"
          role="option"
          aria-selected={i === highlightIndex}
          className={`kb-pt-filter-option${row.isOn ? ' kb-pt-filter-option--selected' : ''}${i === highlightIndex ? ' kb-pt-filter-option--highlight' : ''}`}
          tabIndex={-1}
          onClick={() => handleRowToggle(row)}
        >
          {row.label}
          {row.count === undefined ? '' : ` (${row.count})`}
        </button>
      ))}
      {filterRows.length === 0 ? <div className="kb-pt-filter-empty">No matching filters</div> : null}
      <button type="button" className="kb-pt-filter-option" onClick={props.onClose}>
        Close
      </button>
    </div>
  )
}
