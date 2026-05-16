import type { EntryActionShortcutKind } from '../../../core/helpers/entry_action/entry_action_shortcut_key.util'
import { entryActionShortcutFromKey } from '../../../core/helpers/entry_action/entry_action_shortcut_key.util'
import type { ViewStateForEntry } from '../../../core/helpers/entry_action/resolve_current_entry.util'

export type EntryActionShortcutsFocusState = {
  viewState: ViewStateForEntry
  focusInTextField: boolean
  shortcutsBlocked: boolean
}

export function entryActionShortcutsAllowed(state: EntryActionShortcutsFocusState): boolean {
  if (state.shortcutsBlocked) return false
  if (state.focusInTextField) return false
  return state.viewState === 'list' || state.viewState === 'split' || state.viewState === 'detail'
}

export function entryActionKindFromKeyboardEvent(e: {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}): EntryActionShortcutKind | null {
  return entryActionShortcutFromKey(
    e.key,
    e.metaKey ?? false,
    e.ctrlKey ?? false,
    e.altKey ?? false,
    e.shiftKey ?? false
  )
}

export function keyTargetIsTextField(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return true
  return t.isContentEditable
}
