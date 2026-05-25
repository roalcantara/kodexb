import { ENTRY_TYPE_VALUES } from '@core/domain/constants/entry.const'
import { showTaskSection } from '@core/domain/models/knowledges/task_views/show_task_section.util'
import { TASK_VIEW_ORDER } from '@core/domain/models/knowledges/task_views/task_view_order.const'
import type { EntryType } from '@core/domain/types/entry.types'
import type { ListStats, TaskView } from '@shared/rpc'
import { TASK_VIEW_LABEL, TYPE_FILTER_LABEL } from '../../constants/filter_labels.const'

const TASK_VIEWS = TASK_VIEW_ORDER

export type FilterRow = {
  id: string
  label: string
  count?: number
  kind: 'all' | 'taskView' | 'type' | 'tag'
  isOn: boolean
}

export type FilterSectionBlock = { title: string; rows: FilterRow[] }

function matchesSearch(label: string, q: string): boolean {
  return q === '' || label.toLowerCase().includes(q)
}

/** Hide facet rows with no matching rows unless the user already selected that option. */
function includeFacetRow(count: number | undefined, isOn: boolean): boolean {
  if (isOn) return true
  return count !== undefined && count > 0
}

function appendTaskViewFacetRows(
  rows: FilterRow[],
  stats: ListStats,
  types: EntryType[],
  taskView: TaskView | undefined,
  q: string
): void {
  if (!showTaskSection(types)) return
  for (const v of TASK_VIEWS) {
    const label = TASK_VIEW_LABEL[v]
    if (!matchesSearch(label, q)) continue
    const isOn = taskView === v
    const count = stats.taskViews[v]
    if (!includeFacetRow(count, isOn)) continue
    rows.push({ id: `tv__${v}`, label, count, kind: 'taskView', isOn })
  }
}

function appendTypeFacetRows(rows: FilterRow[], stats: ListStats, types: EntryType[], q: string): void {
  for (const t of ENTRY_TYPE_VALUES) {
    const label = TYPE_FILTER_LABEL[t]
    if (!matchesSearch(label, q)) continue
    const isOn = types.includes(t)
    const count = stats[t]
    if (!includeFacetRow(count, isOn)) continue
    rows.push({ id: `type__${t}`, label, count, kind: 'type', isOn })
  }
}

function appendTagFacetRows(rows: FilterRow[], tags: string[], tagRows: Array<{ tag: string; count: number }>): void {
  for (const { tag, count } of tagRows) {
    const isOn = tags.includes(tag)
    if (!includeFacetRow(count, isOn)) continue
    rows.push({ id: `tag__${tag}`, label: `#${tag}`, count, kind: 'tag', isOn })
  }
}

export function buildFilterRows(
  stats: ListStats,
  types: EntryType[],
  tags: string[],
  taskView: TaskView | undefined,
  tagRows: Array<{ tag: string; count: number }>,
  search: string
): FilterRow[] {
  const q = search.trim().toLowerCase()
  const allIsOn = types.length === 0 && tags.length === 0 && taskView === undefined
  const rows: FilterRow[] = [{ id: '__all__', label: 'All entries', count: stats.total, kind: 'all', isOn: allIsOn }]

  appendTaskViewFacetRows(rows, stats, types, taskView, q)
  appendTypeFacetRows(rows, stats, types, q)
  appendTagFacetRows(rows, tags, tagRows)

  return rows
}

export function groupFilterRowsIntoSections(rows: FilterRow[]): FilterSectionBlock[] {
  const titleFor: Record<FilterRow['kind'], string> = {
    all: 'Quick',
    taskView: 'Task views',
    type: 'Types',
    tag: 'Tags'
  }
  const out: FilterSectionBlock[] = []
  for (const row of rows) {
    const title = titleFor[row.kind]
    const prev = out[out.length - 1]
    if (prev?.title === title) prev.rows.push(row)
    else out.push({ title, rows: [row] })
  }
  return out
}
