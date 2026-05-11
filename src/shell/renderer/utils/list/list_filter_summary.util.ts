import type { TaskView } from '@shared/rpc'
import type { EntryTypeOption } from '../../components/list/filter_dropdown.component'
import { TASK_VIEW_LABEL, TYPE_FILTER_LABEL } from '../../constants/filter_labels.const'

export function listFilterSummary(types: EntryTypeOption[], tags: string[], taskView?: TaskView): string {
  if (taskView !== undefined) return TASK_VIEW_LABEL[taskView]
  if (types.length === 1) {
    const only = types[0]
    if (only !== undefined) return TYPE_FILTER_LABEL[only]
  }
  if (tags.length > 0) return tags.join(', ')
  return 'All'
}
