import type { EntryKey } from '../types'

/** Entry type literals — single owner for schema/runtime literals (see `entry.schema`). */
export const ENTRY_TYPE_VALUES = ['bookmark', 'command', 'cheat', 'task'] as const

/** Keys used for list/detail entry-type glyph + accent color. */
export const ENTRY_KEYS = [...ENTRY_TYPE_VALUES, 'default'] as const

/** Section keys used for grouping entries (config `sources`). */
export const SECTION_ENTRY_TYPE_VALUES = ['bookmarks', 'commands', 'cheats', 'tasks'] as const

/** Mapping of entry types to section keys. */
export const ENTRY_TYPE_SECTIONS: Record<
  (typeof ENTRY_TYPE_VALUES)[number],
  (typeof SECTION_ENTRY_TYPE_VALUES)[number]
> = {
  bookmark: 'bookmarks',
  command: 'commands',
  cheat: 'cheats',
  task: 'tasks'
} as const

/** Mapping of section keys to entry types. */
export const SECTION_ENTRY_TYPES: Record<
  (typeof SECTION_ENTRY_TYPE_VALUES)[number],
  (typeof ENTRY_TYPE_VALUES)[number]
> = {
  bookmarks: 'bookmark',
  commands: 'command',
  cheats: 'cheat',
  tasks: 'task'
} as const

/** Regular expression for normalized task tags. */
export const PATTERNS = {
  /** After normalization: lowercase ASCII letters, digits, underscores only. */
  tag: /^[a-z0-9_]+$/
} as const

/** Task priority literals — low → urgent (single owner for schema/runtime values). */
export const TASK_PRIORITY_VALUES = ['low', 'mid', 'high', 'urgent'] as const

/** Task status literals — single owner for schema/runtime values (see `task.schema`). */
export const TASK_STATUS_VALUES = ['todo', 'doing', 'done'] as const

export const ENTRY_TYPE_GLYPH: Record<(typeof ENTRY_TYPE_VALUES)[number], string> = {
  bookmark: '◆',
  command: '▸',
  cheat: '~',
  task: '✓'
} as const

/** Default icon names per entry key (renderer maps these to brand icons). */
export const DEFAULT_ENTRY_ICONS: Record<EntryKey, string> = {
  command: 'terminal',
  bookmark: 'globe',
  cheat: 'list',
  task: 'check-square',
  default: 'help-circle'
}
