import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'

export type ToolbarProps = {
  filterButtonRef?: RefObject<HTMLButtonElement | null>
  searchInputRef?: RefObject<HTMLInputElement | null>
  syncButtonRef?: RefObject<HTMLButtonElement | null>
  settingsButtonRef?: RefObject<HTMLButtonElement | null>
  newTaskButtonRef?: RefObject<HTMLButtonElement | null>
  search: string
  onSearchChange: (v: string) => void
  onSearchArrowDown?: () => void
  onFilterClick: () => void
  filterLabel: string
  resultCount: number
  onSync: () => void
  syncing: boolean
  syncProcessed?: number
  syncTotal?: number
  onSettings?: () => void
  onNewTask?: () => void
  onCmdK?: () => void
}

export function Toolbar({
  filterButtonRef,
  searchInputRef,
  syncButtonRef,
  settingsButtonRef,
  newTaskButtonRef,
  search,
  onSearchChange,
  onSearchArrowDown,
  onFilterClick,
  filterLabel,
  resultCount,
  onSync,
  syncing,
  syncProcessed,
  syncTotal,
  onSettings,
  onNewTask,
  onCmdK
}: ToolbarProps) {
  const syncHint =
    syncing && syncTotal !== undefined && syncProcessed !== undefined ? ` ${syncProcessed}/${syncTotal}` : ''
  const onSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowDown') return
    e.preventDefault()
    onSearchArrowDown?.()
  }
  return (
    <header className="kb-toolbar">
      <button ref={filterButtonRef} type="button" className="kb-toolbar-filter" onClick={onFilterClick}>
        kb {filterLabel} ({resultCount}) ▼
      </button>
      <input
        ref={searchInputRef}
        className="kb-toolbar-search"
        type="search"
        placeholder="Search your knowledge base…"
        value={search}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        onChange={e => onSearchChange(e.target.value)}
        onKeyDown={onSearchKeyDown}
        aria-label="Search"
      />
      <button ref={syncButtonRef} type="button" className="kb-toolbar-sync" onClick={onSync} disabled={syncing}>
        {syncing ? `⟳ Sync${syncHint}` : '↺ Sync'}
      </button>
      {onNewTask === undefined ? null : (
        <button ref={newTaskButtonRef} type="button" className="kb-toolbar-sync" onClick={onNewTask}>
          + New Task
        </button>
      )}
      {onSettings === undefined ? null : (
        <button
          ref={settingsButtonRef}
          type="button"
          className="kb-toolbar-settings"
          onClick={onSettings}
          aria-label="Settings"
        >
          ⚙
        </button>
      )}
      <button type="button" className="kb-toolbar-hint" onClick={onCmdK} title="Action palette (⌘K)">
        ⌘K
      </button>
    </header>
  )
}
