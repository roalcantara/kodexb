import type { RpcKnowledge } from '@shared/rpc'
import { entryActionRecordsVisit } from '../../../core/helpers/entry_action/entry_action_records_visit.util'
import { recordEntryVisitFireAndForget } from '../utils/list/list_frecency.util'
import { buildEntryActionPanel } from './build_entry_action_panel.util'
import type { EntryAction, EntryActionContext } from './entry_action_panel.types'
import { actionById } from './entry_action_panel_resolve.util'

export async function executePanelAction(
  action: EntryAction,
  entry: RpcKnowledge | null,
  ctx: EntryActionContext
): Promise<void> {
  await action.run(ctx)
  if (entry !== null && entryActionRecordsVisit(action.id)) {
    recordEntryVisitFireAndForget(entry.id)
  }
}

export async function executeEntryAction(
  entry: RpcKnowledge,
  actionId: string,
  ctx: EntryActionContext
): Promise<void> {
  const { defaultEntryActionPanelDeps } = await import('./entry_action_panel_deps.util')
  const panel = buildEntryActionPanel({ ...ctx, entry }, defaultEntryActionPanelDeps())
  const action = actionById(panel, actionId)
  if (!action) return
  await executePanelAction(action, entry, { ...ctx, entry })
}
