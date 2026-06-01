import type { RpcKnowledge } from '@shared/rpc'
import { DetailPage } from '../../pages/detail/detail.page'

export type DetailPanelProps = {
  entryId: number | null
  allEntries: RpcKnowledge[]
  onClose: () => void
  onSelectEntry: (id: number) => void
  loadEntry?: (id: number) => Promise<RpcKnowledge | null>
}

export function DetailPanel({ entryId, allEntries, onClose, onSelectEntry, loadEntry }: DetailPanelProps) {
  const visible = entryId !== null
  return (
    <aside className={`cmp-detail-panel${visible ? ' cmp-detail-panel--visible' : ''}`} aria-label="Entry detail">
      {visible ? (
        <DetailPage
          entryId={entryId}
          allEntries={allEntries}
          onClose={onClose}
          onSelectEntry={onSelectEntry}
          loadEntry={loadEntry}
        />
      ) : null}
    </aside>
  )
}
