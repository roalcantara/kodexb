import type { RefObject } from 'react'

export type ListQuickActionsProps = {
  syncButtonRef: RefObject<HTMLButtonElement | null>
  newTaskButtonRef: RefObject<HTMLButtonElement | null>
  settingsButtonRef: RefObject<HTMLButtonElement | null>
  syncing: boolean
  onSync: () => void
  onNewTask: () => void
  onOpenSettings: () => void
}

/** Sync / new task / settings — refs match list page focus ring (toolbar.component is not mounted). */
export function ListQuickActions({
  syncButtonRef,
  newTaskButtonRef,
  settingsButtonRef,
  syncing,
  onSync,
  onNewTask,
  onOpenSettings
}: ListQuickActionsProps) {
  return (
    <div className="cmp-toolbar cmp-toolbar--quick-actions" role="toolbar" aria-label="List actions">
      <button ref={syncButtonRef} type="button" className="cmp-toolbar-sync" onClick={onSync} disabled={syncing}>
        {syncing ? '⟳ Sync' : '↺ Sync'}
      </button>
      <button ref={newTaskButtonRef} type="button" className="cmp-toolbar-sync" onClick={onNewTask}>
        + New Task
      </button>
      <button
        ref={settingsButtonRef}
        type="button"
        className="cmp-toolbar-settings"
        onClick={onOpenSettings}
        aria-label="Settings"
      >
        ⚙
      </button>
    </div>
  )
}
