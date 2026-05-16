import type { RpcKnowledge } from '@shared/rpc'
import type { CommandPaletteAction } from '../components/actions/command_palette.component'
import type { EntryAction, EntryActionContext } from './entry_action_panel.types'
import { executePanelAction } from './execute_entry_action.util'

export function mapEntryActionsToPalette(
  actions: readonly EntryAction[],
  entry: RpcKnowledge | null,
  ctx: EntryActionContext,
  onAfterRun?: () => void
): CommandPaletteAction[] {
  return actions.map(action => ({
    id: action.id,
    label: action.label,
    section: action.section,
    shortcut: action.shortcut,
    handler: () => {
      executePanelAction(action, entry, ctx)
        .then(() => onAfterRun?.())
        .catch(() => undefined)
    }
  }))
}
