import { fireAndForget } from '@shared/utils'
import type { ListActions, ListData, ListOverlays } from '../../hooks/list/use_list_page_shell.hook'
import { SettingsPage } from '../../pages/settings/settings.page'
import { CommandPalette } from '../actions/command_palette.component'
import { ActionToastHost } from '../shared/primitives/action_toast_host.component'
import { SyncModal } from '../shared/sync/sync_modal.component'
import { QuickLookupOverlay } from '../shortcuts/quick_lookup_overlay.component'
import { TaskSheet } from '../task/task_sheet.component'

export type ListOverlayHostsProps = {
  listData: ListData
  listOverlays: ListOverlays
  listActions: ListActions
  showSettings: boolean
  setShowSettings: (value: boolean | ((prev: boolean) => boolean)) => void
  focusMainSearch: () => void
}

export function ListOverlayHosts({
  listData,
  listOverlays,
  listActions,
  showSettings,
  setShowSettings,
  focusMainSearch
}: ListOverlayHostsProps) {
  return (
    <>
      {listOverlays.taskSheet.taskSheetVisible ? (
        <TaskSheet
          key={listOverlays.taskSheet.taskSheetEntry?.id ?? 'new'}
          entry={listOverlays.taskSheet.taskSheetEntry}
          onClose={listOverlays.taskSheet.onCloseTaskSheet}
        />
      ) : null}
      {showSettings ? (
        <div className="cmp-settings-host">
          <SettingsPage
            onCloseRequest={() => setShowSettings(false)}
            onConfigSaved={cfg => {
              const ps = Number.parseInt(cfg.display.pageSize, 10)
              if (Number.isFinite(ps) && ps > 0) listData.setPageSize(ps)
              fireAndForget(listData.refreshList(false))
            }}
          />
        </div>
      ) : null}
      {listOverlays.palette.open && (
        <CommandPalette
          open={listOverlays.palette.open}
          actions={listOverlays.palette.actions}
          onClose={() => {
            listOverlays.palette.closePalette()
            focusMainSearch()
          }}
        />
      )}
      <SyncModal model={listData.syncUi} onDismiss={listData.dismissSyncModal} />
      <ActionToastHost toasts={listActions.actionToasts} onDismiss={listActions.dismissActionToast} />
      <QuickLookupOverlay
        open={listOverlays.quickLookup.open}
        search={listOverlays.quickLookup.search}
        onSearchChange={listOverlays.quickLookup.setSearch}
        onClose={listOverlays.quickLookup.closeOverlay}
      />
    </>
  )
}
