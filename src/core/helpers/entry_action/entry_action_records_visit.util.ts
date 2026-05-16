import type { EntryActionId } from './entry_action_ids.const'

const RECORDS_VISIT = new Set<EntryActionId>([
  'open-url',
  'paste-terminal',
  'edit-task',
  'cycle-status',
  'cycle-priority',
  'copy',
  'open-editor'
])

/** Whether a successful action should record an entry frecency visit. */
export function entryActionRecordsVisit(actionId: string): boolean {
  return RECORDS_VISIT.has(actionId as EntryActionId)
}
