import { resolveCurrentEntry } from '@core/helpers/entry_action/resolve_current_entry.util'
import type { RpcKnowledge } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { buildEntryActionPanel } from '../../actions/build_entry_action_panel.util'
import type { EntryAction, EntryActionContext } from '../../actions/entry_action_panel.types'
import type { EntryActionPanelDeps } from '../../actions/entry_action_panel_deps.util'
import { primaryAction, secondaryAction } from '../../actions/entry_action_panel_resolve.util'
import { executePanelAction } from '../../actions/execute_entry_action.util'
import type { ViewState } from '../../utils/list/list_page_state.util'

export type ListFooterActionContext = {
  viewState: ViewState
  selectedId: number | null
  detailEntry: RpcKnowledge | null
  rows: RpcKnowledge[]
  actionCtx: EntryActionContext
  entryPanelDeps: EntryActionPanelDeps
}

function resolveFooterEntry(ctx: ListFooterActionContext): RpcKnowledge | null {
  return resolveCurrentEntry({
    viewState: ctx.viewState,
    selectedId: ctx.selectedId,
    detailEntry: ctx.detailEntry,
    rows: ctx.rows,
    detailPanelHasFocus: false
  })
}

type ActionRank = (panel: ReturnType<typeof buildEntryActionPanel>) => EntryAction | undefined

function resolveFooterAction(ctx: ListFooterActionContext, rank: ActionRank) {
  const entry = resolveFooterEntry(ctx)
  if (!entry) return { entry: null as RpcKnowledge | null, action: undefined as EntryAction | undefined }
  const panel = buildEntryActionPanel({ ...ctx.actionCtx, entry }, ctx.entryPanelDeps)
  return { entry, action: rank(panel) }
}

export function resolveListFooterPrimary(ctx: ListFooterActionContext) {
  return resolveFooterAction(ctx, primaryAction)
}

export function resolveListFooterSecondary(ctx: ListFooterActionContext) {
  return resolveFooterAction(ctx, secondaryAction)
}

function runFooterAction(
  resolve: (ctx: ListFooterActionContext) => { entry: RpcKnowledge | null; action: EntryAction | undefined },
  ctx: ListFooterActionContext
): void {
  const { entry, action } = resolve(ctx)
  if (!entry || !action) return
  fireAndForget(executePanelAction(action, entry, { ...ctx.actionCtx, entry }))
}

export function runListFooterPrimary(ctx: ListFooterActionContext): void {
  runFooterAction(resolveListFooterPrimary, ctx)
}

export function runListFooterSecondary(ctx: ListFooterActionContext): void {
  runFooterAction(resolveListFooterSecondary, ctx)
}
