import type { EntryType } from '../../domain/types/entry.types'

const PRIMARY_HINT: Record<EntryType, string> = {
  bookmark: '\u21B5 Open',
  command: '\u21B5 Paste',
  cheat: '\u21B5 Copy',
  task: '\u21B5 Edit'
}

/** Compact list row hint for the primary action (Return). */
export function entryActionPrimaryRowHint(type: EntryType): string {
  return PRIMARY_HINT[type]
}
