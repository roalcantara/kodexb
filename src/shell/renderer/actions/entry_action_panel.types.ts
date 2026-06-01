import type { EntryActionId } from '@core/helpers/entry_action/entry_action_ids.const'
import type { RpcKnowledge } from '@shared/rpc'

export type EntryActionSection = 'entry' | 'clipboard' | 'source' | 'library' | 'app'

export type EntryActionRank = 'primary' | 'secondary'

export type EntryAction = {
  id: EntryActionId
  label: string
  section: EntryActionSection
  rank?: EntryActionRank
  shortcut?: string
  run: (ctx: EntryActionContext) => void | Promise<void>
}

export type EntryActionContext = {
  entry: RpcKnowledge | null
  pushToast: (msg: string, type: 'success' | 'error') => void
  onEditTask: (entry: RpcKnowledge) => void
  onNewTask: () => void
  onSync: () => void
}
