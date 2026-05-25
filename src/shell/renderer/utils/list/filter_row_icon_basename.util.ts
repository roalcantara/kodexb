import type { EntryType } from '@core/domain/types/entry.types'
import type { TaskView } from '@shared/rpc'
import { ENTRY_TYPE_DEFAULT_SVG_BASENAME } from '../../constants/entry_type_icon_basename.const'

const TASK_VIEW_ICON: Record<TaskView, string> = {
  actionable: 'task_warrior',
  today: 'calendar',
  overdue: 'important',
  this_week: 'days',
  all_pending: 'sheets',
  all_doing: 'build'
}

type FilterRowIconKind = 'all' | 'taskView' | 'type' | 'tag'

/**
 * Basename (no `.svg`) under `assets/images/` for compact filter list rows.
 */
export function filterRowIconBasename(row: { id: string; kind: FilterRowIconKind }): string {
  switch (row.kind) {
    case 'all':
      return 'list'
    case 'tag':
      return 'hash'
    case 'type': {
      const t = row.id.replace('type__', '') as EntryType
      return ENTRY_TYPE_DEFAULT_SVG_BASENAME[t]
    }
    case 'taskView': {
      const v = row.id.replace('tv__', '') as TaskView
      return TASK_VIEW_ICON[v] ?? 'list'
    }
  }
}
