import { fireAndForget } from '@shared/utils'
import type { ListPageShell } from '../../hooks/list/use_list_page_shell.hook'
import { SettingsPage } from '../../pages/settings/settings.page'
import { CommandPalette } from '../actions/command_palette.component'
import { ActionToastHost } from '../shared/action_toast_host.component'
import { SyncModal } from '../shared/sync_modal.component'
import { QuickLookupOverlay } from '../shortcuts/quick_lookup_overlay.component'
import { TaskSheet } from '../task/task_sheet.component'

export type ListOverlayHostsProps = {
  p: ListPageShell
  showSettings: boolean
  setShowSettings: (value: boolean | ((prev: boolean) => boolean)) => void
  focusMainSearch: () => void
}

export function ListOverlayHosts({ p, showSettings, setShowSettings, focusMainSearch }: ListOverlayHostsProps) {
  return (
    <>
      {p.taskSheetVisible ? (
        <TaskSheet key={p.taskSheetEntry?.id ?? 'new'} entry={p.taskSheetEntry} onClose={p.onCloseTaskSheet} />
      ) : null}
      {showSettings ? (
        <div className="cmp-settings-host">
          <SettingsPage
            onCloseRequest={() => setShowSettings(false)}
            onConfigSaved={cfg => {
              const ps = Number.parseInt(cfg.display.pageSize, 10)
              if (Number.isFinite(ps) && ps > 0) p.data.setPageSize(ps)
              fireAndForget(p.data.refreshList(false))
            }}
          />
        </div>
      ) : null}
      {p.palette.open && (
        <CommandPalette
          open={p.palette.open}
          actions={p.palette.actions}
          onClose={() => {
            p.palette.closePalette()
            focusMainSearch()
          }}
        />
      )}
      <SyncModal model={p.data.syncUi} onDismiss={p.data.dismissSyncModal} />
      <ActionToastHost toasts={p.actionToasts} onDismiss={p.dismissActionToast} />
      <QuickLookupOverlay
        open={p.quickLookup.open}
        search={p.quickLookup.search}
        onSearchChange={p.quickLookup.setSearch}
        onClose={p.quickLookup.closeOverlay}
      />
    </>
  )
}
