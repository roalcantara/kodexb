/** Stable action ids for the entry action panel (palette, Return shortcuts). */
export const ENTRY_ACTION_IDS = [
  'open-url',
  'paste-terminal',
  'edit-task',
  'cycle-status',
  'cycle-priority',
  'copy',
  'copy-desc',
  'open-editor',
  'run-terminal',
  'paste-doc',
  'sync',
  'new-task',
  'settings',
  'quit'
] as const

export type EntryActionId = (typeof ENTRY_ACTION_IDS)[number]
