import type { RpcKnowledge } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { useCallback } from 'react'
import { resolveCurrentEntry } from '../../../../core/helpers/entry_action/resolve_current_entry.util'
import { buildEntryActionPanel } from '../../actions/build_entry_action_panel.util'
import type { EntryActionContext } from '../../actions/entry_action_panel.types'
import type { EntryActionPanelDeps } from '../../actions/entry_action_panel_deps.util'
import { primaryAction, secondaryAction } from '../../actions/entry_action_panel_resolve.util'
import {
  entryActionKindFromKeyboardEvent,
  entryActionShortcutsAllowed,
  keyTargetIsTextField
} from '../../actions/entry_action_shortcuts.util'
import { executePanelAction } from '../../actions/execute_entry_action.util'
import type { ViewState } from '../../utils/list/list_page_state.util'

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
