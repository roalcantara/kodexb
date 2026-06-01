import type { Knowledge } from './schemas/knowledge.schema'

/**
 * Clipboard payload for a knowledge row: list **⌘C**, command palette **Copy**, etc.
 * `bookmark` / `command` → `key`; `cheat` / `task` → `doc` (body).
 */
export function copyTextForEntry(entry: Knowledge): string {
  switch (entry.type) {
    case 'bookmark':
    case 'command':
    case 'shortcut':
      return entry.key
    case 'cheat':
    case 'task':
      return entry.doc ?? ''
  }
}
