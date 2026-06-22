import type { RpcKnowledge } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import type { CommandPaletteAction } from '../components/actions/command_palette.types'
import type { EntryAction, EntryActionContext } from './panel/panel.types'
import { executePanelAction } from './execute.executor'

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
      fireAndForget(executePanelAction(action, entry, ctx).then(() => onAfterRun?.()))
    }
  }))
}
