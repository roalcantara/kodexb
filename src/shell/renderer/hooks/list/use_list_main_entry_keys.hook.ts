import type { RpcKnowledge } from '@shared/rpc'
import type { RefObject } from 'react'
import { useCallback } from 'react'
import type { EntryActionContext } from '../../actions/entry_action_panel.types'
import type { EntryActionPanelDeps } from '../../actions/entry_action_panel_deps.util'
import type { ViewState } from '../../utils/list/view_reducer.util'
import { useEntryActionKeys } from './use_entry_action_keys.hook'
import { useRecordDetailVisit } from './use_record_detail_visit.hook'

export type ListMainEntryKeysOpts = {
  disabled: boolean
  viewState: ViewState
  rows: RpcKnowledge[]
  selectedId: number | null
  detailEntry: RpcKnowledge | null
  detailScrollRef: RefObject<HTMLDivElement | null>
  actionCtx: EntryActionContext
  entryPanelDeps: EntryActionPanelDeps
}

/** Detail visit recording + Return / mod+Return entry actions for list main. */
export function useListMainEntryKeys(opts: ListMainEntryKeysOpts): (e: KeyboardEvent) => void {
  const { detailEntry, detailScrollRef, ...rest } = opts

  useRecordDetailVisit(detailEntry)

  const detailPanelHasFocus = useCallback(() => {
    const root = detailScrollRef.current
    if (!root) return false
    const active = document.activeElement
    return active instanceof Node && root.contains(active)
  }, [detailScrollRef])

  return useEntryActionKeys({ ...rest, detailEntry, detailPanelHasFocus })
}
