import type { ListMainProps, ListMainViewModel } from '../../hooks/list/use_list_main.hook'
import { DetailPage } from '../../pages/detail/detail.page'
import { ListResultsBody } from './results_body.component'

const EMPTY_TAG_COUNTS: Readonly<Record<string, number>> = Object.freeze({})

export function ListMainPanels({ props, vm }: { props: ListMainProps; vm: ListMainViewModel }) {
  const { listData, listSelection, listActions } = props
  const { derived, virtual, handlers, emptySyncButtonRef } = vm

  return (
    <div className="cmp-main">
      <div className={derived.listPanelClass}>
        <ListResultsBody
          listSurfaceRef={listActions.refs.listSurfaceRef}
          listSentinelRef={listActions.refs.listSentinelRef}
          selectedId={listSelection.selectedId}
          onKeyDown={listActions.handlers.onListSurfaceKeyDown}
          emptyDb={listActions.flags.emptyDb}
          noResults={listActions.flags.noResults}
          emptyList={listActions.flags.emptyList}
          syncInfo={listData.syncInfo}
          onSync={listData.onSync}
          emptySyncButtonRef={emptySyncButtonRef}
          tagCounts={listData.stats?.tags ?? EMPTY_TAG_COUNTS}
          rows={listData.rows}
          visibleRows={virtual.visibleRows}
          virtualWindow={virtual.virtualWindow}
          sentinelSpacers={virtual.sentinelSpacersRes}
          hasMore={listData.hasMore}
          maxFrecencyScore={derived.maxFrecencyScore}
          onSelectEntry={handlers.onSelectEntry}
          onHoverEntry={handlers.onHoverEntry}
          dragDrop={listActions.dragDrop}
          onCycleStatus={handlers.handleCycleStatus}
          onCyclePriority={handlers.handleCyclePriority}
        />
      </div>

      {derived.detailEntry ? (
        <div ref={handlers.detailScrollRef} className={derived.detailPanelClass}>
          <DetailPage
            entryId={derived.detailEntry.id}
            allEntries={listData.rows}
            onClose={handlers.closeDetailToList}
            onSelectEntry={id => listSelection.selectDetailEntry(id)}
          />
        </div>
      ) : null}
    </div>
  )
}
