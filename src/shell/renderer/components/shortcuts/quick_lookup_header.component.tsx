import type { RefObject } from 'react'

export type QuickLookupHeaderProps = {
  inputRef: RefObject<HTMLInputElement | null>
  search: string
  onSearchChange: (value: string) => void
  filterLabel: string
  mode: 'text' | 'chord'
  onOpenFilter: () => void
}

export function QuickLookupHeader({
  inputRef,
  search,
  onSearchChange,
  filterLabel,
  mode,
  onOpenFilter
}: QuickLookupHeaderProps) {
  return (
    <div className="quick-lookup-header">
      <input
        ref={inputRef}
        className="quick-lookup-input"
        type="text"
        placeholder="Search bindings or type a chord..."
        value={search}
        onChange={e => onSearchChange(e.target.value)}
      />
      <button
        type="button"
        className="quick-lookup-filter-chip"
        onClick={onOpenFilter}
        title="Filter bindings (⌘K)"
        aria-label="Open filter"
      >
        {filterLabel}
        <span className="quick-lookup-filter-chip-caret">▾</span>
      </button>
      <span className="quick-lookup-mode-badge">{mode === 'chord' ? '\u2328' : 'Aa'}</span>
    </div>
  )
}
