import type { EntryActionId } from '@core/helpers/entry_action/entry_action_ids.const'
import {
  primaryActionIdForEntryType,
  secondaryActionIdForEntryType
} from '@core/helpers/entry_action/entry_action_primary_secondary.util'
import type { RpcKnowledge } from '@shared/rpc'
import type { EntryAction, EntryActionRank } from './panel.types'

export function actionRankForEntry(entry: RpcKnowledge, actionId: EntryActionId): EntryActionRank | undefined {
  if (primaryActionIdForEntryType(entry.type) === actionId) return 'primary'
  if (secondaryActionIdForEntryType(entry.type) === actionId) return 'secondary'
}

export function primaryAction(actions: readonly EntryAction[]): EntryAction | undefined {
  return actions.find(a => a.rank === 'primary')
}

export function secondaryAction(actions: readonly EntryAction[]): EntryAction | undefined {
  return actions.find(a => a.rank === 'secondary')
}

export function actionById(actions: readonly EntryAction[], id: string): EntryAction | undefined {
  return actions.find(a => a.id === id)
}
