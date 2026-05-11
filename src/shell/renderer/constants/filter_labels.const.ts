import type { TaskView } from '@shared/rpc'

export const TASK_VIEW_LABEL: Record<TaskView, string> = {
  actionable: 'Actionable',
  today: 'Today',
  overdue: 'Overdue',
  this_week: 'This Week',
  all_pending: 'All Pending',
  all_doing: 'All Doing'
}

export const TYPE_FILTER_LABEL: Record<'bookmark' | 'command' | 'cheat' | 'task', string> = {
  bookmark: 'Bookmark',
  command: 'Command',
  cheat: 'Cheat',
  task: 'Task'
}
