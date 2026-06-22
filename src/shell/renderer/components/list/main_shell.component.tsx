import type { ReactNode } from 'react'
import type { ListMainProps, ListMainViewModel } from '../../hooks/list/use_list_main.hook'
import { ListFooter } from './footer.component'
import { ListMainPanels } from './main_panels.component'
import { ListSearchFilterChrome } from './search_filter_chrome.component'

export function ListMainShell({
  props,
  vm,
  mutationBanner
}: {
  props: ListMainProps
  vm: ListMainViewModel
  mutationBanner: ReactNode
}) {
  const { listData, listFilter, listSelection, listOverlays, listActions } = props
  const { derived, handlers, onDragStripeMouseDown } = vm

  return (
    <div className={derived.powertoysClass} role="application" aria-label="Knowledge list">
      <div className="cmp-window-drag-stripe" role="presentation" aria-hidden onMouseDown={onDragStripeMouseDown} />
      <ListSearchFilterChrome
        isFullDetail={derived.isFullDetail}
        showBackWithSearch={derived.showBackWithSearch}
        closeDetailToList={handlers.closeDetailToList}
        searchInputRef={listActions.refs.searchInputRef}
        search={listData.search}
        onSearchChange={listData.setSearch}
        onSearchArrowDown={listActions.handlers.onSearchArrowDown}
        filterButtonRef={listFilter.filterButtonRef}
        filterChipCls={derived.filterChipCls}
        filterSummary={derived.filterSummary}
        onToggleFilter={handlers.toggleFilter}
        filterOpen={listFilter.filterOpen}
        stats={vm.derived.filterDropdownStats ?? listData.stats}
        types={listData.types}
        tags={listData.tags}
        taskView={listData.taskView}
        onFilterChange={listActions.handlers.onFilterChange}
        onFilterClose={() => {
          listFilter.setFilterOpen(false)
          handlers.focusMainSearch()
        }}
        pushToast={listActions.pushToast}
        anchorRect={listFilter.anchorRect}
      />
      <ListMainPanels props={props} vm={vm} />
      {mutationBanner}
      <ListFooter
        footerStatus={derived.footerStatus}
        isFullDetail={derived.isFullDetail}
        detailEntry={derived.detailEntry}
        closeDetailToList={handlers.closeDetailToList}
        viewState={derived.viewState}
        selectedId={listSelection.selectedId}
        rows={listData.rows}
        actionCtx={listActions.actionCtx}
        entryPanelDeps={listActions.entryPanelDeps}
        onOpenPalette={listOverlays.palette.openPalette}
      />
    </div>
  )
}
