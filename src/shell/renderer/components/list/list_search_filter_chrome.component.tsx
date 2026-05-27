import type { EntryType } from '@core/domain/types/entry.types'
import type { TaskView } from '@shared/rpc'
import type { RefObject } from 'react'
import { FilterDropdown } from './filter_dropdown.component'

export type ListSearchFilterChromeProps = {
  isFullDetail: boolean
  showBackWithSearch: boolean
  closeDetailToList: () => void
  searchInputRef: RefObject<HTMLInputElement | null>
  search: string
  onSearchChange: (value: string) => void
  onSearchArrowDown: () => void
  filterButtonRef: RefObject<HTMLButtonElement | null>
  filterChipCls: string
  filterSummary: string
  onToggleFilter: () => void
  filterOpen: boolean
  stats: import('@shared/rpc').ListStats | null
  types: EntryType[]
  tags: string[]
  taskView: TaskView | undefined
  onFilterChange: (next: { types: EntryType[]; tags: string[]; taskView?: TaskView }) => void
  onFilterClose: () => void
  pushToast: (msg: string, type: 'success' | 'error') => void
  anchorRect: DOMRect | null
}

function SearchMagnifierIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" role="presentation" aria-hidden>
      <path
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FilterChevronIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" role="presentation" aria-hidden>
      <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ListSearchFilterChrome({
  isFullDetail,
  showBackWithSearch,
  closeDetailToList,
  searchInputRef,
  search,
  onSearchChange,
  onSearchArrowDown,
  filterButtonRef,
  filterChipCls,
  filterSummary,
  onToggleFilter,
  filterOpen,
  stats,
  types,
  tags,
  taskView,
  onFilterChange,
  onFilterClose,
  pushToast,
  anchorRect
}: ListSearchFilterChromeProps) {
  if (isFullDetail) return null

  return (
    <div className="cmp-search">
      <div className="cmp-search-wrap cmp-search-wrap--with-back">
        <button
          type="button"
          className={`cmp-search-back${showBackWithSearch ? '' : ' cmp-search-back--inactive'}`}
          aria-label="Back to list"
          title={showBackWithSearch ? 'Back to list (Escape)' : undefined}
          aria-hidden={!showBackWithSearch}
          tabIndex={showBackWithSearch ? 0 : -1}
          onClick={() => {
            if (showBackWithSearch) closeDetailToList()
          }}
        >
          ←
        </button>
        <search className="cmp-search-bar">
          <span className="cmp-search-magnifier" aria-hidden>
            <SearchMagnifierIcon />
          </span>
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Search your knowledge base…"
            value={search}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            onChange={e => onSearchChange(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'ArrowDown') return
              e.preventDefault()
              onSearchArrowDown()
            }}
            aria-label="Search"
          />
          <span aria-hidden className="cmp-search-bar-divider" />
          <button ref={filterButtonRef} type="button" className={filterChipCls} onClick={onToggleFilter}>
            <span>{filterSummary}</span>
            <span className="cmp-filter-chip-chevron">
              <FilterChevronIcon />
            </span>
          </button>
        </search>
      </div>
      {filterOpen && stats !== null ? (
        <FilterDropdown
          open={filterOpen}
          anchorRect={anchorRect}
          stats={stats}
          types={types}
          tags={tags}
          taskView={taskView}
          onChange={onFilterChange}
          onClose={onFilterClose}
          pushToast={pushToast}
          closeToList={closeDetailToList}
          isFullDetail={isFullDetail}
          compact
        />
      ) : null}
    </div>
  )
}
