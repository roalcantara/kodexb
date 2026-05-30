import type { UseChordDetailResult } from '../../hooks/shortcuts/use_chord_detail.hook'
import { ChordDetailRowList } from './chord_detail_row_list.component'
import { ChordDetailTabs } from './chord_detail_tabs.component'

export type ChordDetailRowsProps = {
  state: Pick<
    UseChordDetailResult,
    'tabs' | 'activeTab' | 'setActiveTab' | 'rows' | 'selectedRowIndex' | 'setSelectedRowIndex'
  >
  bindingsForHash: import('@shared/rpc').BindingRef[]
  displayAdvisories: boolean
}

export function ChordDetailRows({ state, bindingsForHash, displayAdvisories }: ChordDetailRowsProps) {
  return (
    <>
      <ChordDetailTabs state={state} bindingsForHash={bindingsForHash} />
      <ChordDetailRowList state={state} displayAdvisories={displayAdvisories} />
    </>
  )
}
