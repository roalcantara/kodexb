import type { ListPageShell } from '../../hooks/list/use_list_page_shell.hook'
import { SettingsPage } from '../../pages/settings/settings.page'
import { listFilterSummary } from '../../utils/list/list_filter_summary.util'
import { FilterDropdown } from './filter_dropdown.component'
import { ListArea } from './list_area.component'
import { Toolbar } from './toolbar.component'

export type ListMainProps = {
  p: ListPageShell
  showSettings: boolean
  setShowSettings: (value: boolean | ((prev: boolean) => boolean)) => void
}

export function ListMain({ p, showSettings, setShowSettings }: ListMainProps) {
  return (
    <>
      <Toolbar
        filterButtonRef={p.filter.filterButtonRef}
        searchInputRef={p.searchInputRef}
        syncButtonRef={p.syncButtonRef}
        settingsButtonRef={p.settingsButtonRef}
        search={p.data.search}
        onSearchChange={p.data.setSearch}
        onSearchArrowDown={p.onSearchArrowDown}
        onFilterClick={p.filter.openFilter}
        filterLabel={listFilterSummary(p.data.types, p.data.tags, p.data.taskView)}
        resultCount={p.data.stats?.total ?? p.data.rows.length}
        onSync={p.data.onSync}
        syncing={p.data.syncing}
        syncProcessed={p.data.syncProg?.processed}
        syncTotal={p.data.syncProg?.total}
        onSettings={() => setShowSettings(v => !v)}
      />
      {showSettings ? (
        <div className="kb-settingsHost">
          <SettingsPage
            onCloseRequest={() => setShowSettings(false)}
            onConfigSaved={cfg => {
              const ps = Number.parseInt(cfg.display.pageSize, 10)
              if (Number.isFinite(ps) && ps > 0) p.data.setPageSize(ps)
              p.data.refreshList(false).catch(() => undefined)
            }}
          />
        </div>
      ) : (
        <ListArea
          data={p.data}
          sel={p.sel}
          detailLayout={p.detailLayout}
          flags={p.flags}
          listSurfaceRef={p.listSurfaceRef}
          listSentinelRef={p.listSentinelRef}
          onListKeyDown={p.onListSurfaceKeyDown}
        />
      )}
      {p.data.stats === null ? null : (
        <FilterDropdown
          open={p.filter.filterOpen}
          anchorRect={p.filter.anchorRect}
          stats={p.data.stats}
          types={p.data.types}
          tags={p.data.tags}
          taskView={p.data.taskView}
          onChange={p.onFilterChange}
          onClose={() => p.filter.setFilterOpen(false)}
        />
      )}
    </>
  )
}
