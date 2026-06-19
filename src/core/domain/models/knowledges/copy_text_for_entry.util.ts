import type { Knowledge } from './schemas/knowledge.schema'

/**
 * Clipboard payload for a knowledge row: list **⌘C**, command palette **Copy**, etc.
 * `bookmark` / `command` → `key`; `cheat` / `task` → `doc` (body).
 */
export function copyTextForEntry(entry: Knowledge): string {
  if (entry.type === 'bookmark' || entry.type === 'command' || entry.type === 'shortcut') {
    return entry.key
  }
  return entry.doc ?? ''
}
