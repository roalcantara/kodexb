export type EntryActionShortcutKind = 'primary' | 'secondary'

/** Maps Return / mod+Return to primary or secondary shortcut kind; null when not an entry action key. */
export function entryActionShortcutFromKey(
  key: string,
  metaKey: boolean,
  ctrlKey: boolean,
  altKey: boolean,
  shiftKey: boolean
): EntryActionShortcutKind | null {
  if (key !== 'Enter') return null
  if (altKey || shiftKey) return null
  if (metaKey || ctrlKey) return 'secondary'
  return 'primary'
}
