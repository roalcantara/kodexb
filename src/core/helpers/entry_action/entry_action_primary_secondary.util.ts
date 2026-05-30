import type { EntryType } from '../../domain/types/entry.types'
import type { EntryActionId } from './entry_action_ids.const'

const PRIMARY_BY_TYPE: Record<EntryType, EntryActionId> = {
  bookmark: 'open-url',
  command: 'paste-terminal',
  cheat: 'copy',
  task: 'edit-task',
  shortcut: 'open-editor'
}

const SECONDARY_BY_TYPE: Record<EntryType, EntryActionId> = {
  bookmark: 'copy',
  command: 'copy',
  cheat: 'open-editor',
  task: 'cycle-status',
  shortcut: 'copy'
}

export function primaryActionIdForEntryType(type: EntryType): EntryActionId {
  return PRIMARY_BY_TYPE[type]
}

export function secondaryActionIdForEntryType(type: EntryType): EntryActionId {
  return SECONDARY_BY_TYPE[type]
}
