import type { RpcKnowledge } from '@shared/rpc'

/**
 * Primary clipboard content per knowledge type.
 * Bookmark → URL, Command → key (the command), Cheat → doc, Task → key
 */
export function primaryClipboardContent(entry: RpcKnowledge): string {
  switch (entry.type) {
    case 'bookmark':
      return entry.key
    case 'command':
      return entry.key
    case 'cheat':
      return entry.doc && entry.doc.length > 0 ? entry.doc : entry.key
    case 'task':
      return entry.key
  }
}
