import { resolveCurrentEntry } from '@core/helpers/entry_action/resolve_current_entry.util'
import type { RpcKnowledge } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { useCallback } from 'react'
import { executePanelAction } from '../../actions/execute.executor'
import { buildEntryActionPanel } from '../../actions/panel/action_builder.service'
import type { EntryActionPanelDeps } from '../../actions/panel/deps.service'
import type { EntryActionContext } from '../../actions/panel/panel.types'
import { primaryAction, secondaryAction } from '../../actions/panel/resolve.resolver'
import {
  entryActionKindFromKeyboardEvent,
  entryActionShortcutsAllowed,
  keyTargetIsTextField
} from '../../actions/shortcuts.util'
import type { ViewState } from '../../utils/list/list_page_state.util'

/**
 * The shortcut keymap and chord-detail surfaces own their own Enter / mod+Enter
 * semantics (open chord detail, reveal source). Defer to their local row
 * handlers when focus is inside one — otherwise the window-level entry-action
 * handler intercepts the keystroke first and runs the parent shortcut entry's
 * primary action instead.
 */
export function targetOwnsEnter(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('.cmp-shortcut-keymap, .cmp-chord-detail') !== null
}

export type EntryActionKeysOpts = {
  disabled: boolean
  viewState: ViewState
  rows: RpcKnowledge[]
  selectedId: number | null
  detailEntry: RpcKnowledge | null
  detailPanelHasFocus: () => boolean
  actionCtx: EntryActionContext
  entryPanelDeps: EntryActionPanelDeps
}

/** Window keydown handler for Return / mod+Return entry actions (list, split, detail). */
export function useEntryActionKeys(opts: EntryActionKeysOpts): (e: KeyboardEvent) => void {
  const { disabled, viewState, rows, selectedId, detailEntry, detailPanelHasFocus, actionCtx, entryPanelDeps } = opts

  return useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return
      const kind = entryActionKindFromKeyboardEvent(e)
      if (!kind) return
      if (targetOwnsEnter(e.target)) return
      if (
        !entryActionShortcutsAllowed({
          viewState,
          focusInTextField: keyTargetIsTextField(e.target),
          shortcutsBlocked: false
        })
      ) {
        return
      }

      const entry = resolveCurrentEntry({
        viewState,
        selectedId,
        detailEntry,
        rows,
        detailPanelHasFocus: detailPanelHasFocus()
      })
      if (!entry) return

      const panel = buildEntryActionPanel({ ...actionCtx, entry }, entryPanelDeps)
      const action = kind === 'primary' ? primaryAction(panel) : secondaryAction(panel)
      if (!action) return

      e.preventDefault()
      fireAndForget(executePanelAction(action, entry, { ...actionCtx, entry }))
    },
    [disabled, viewState, rows, selectedId, detailEntry, detailPanelHasFocus, actionCtx, entryPanelDeps]
  )
}
