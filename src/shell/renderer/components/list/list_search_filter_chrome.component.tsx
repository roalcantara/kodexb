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
  if (isFullDetail) return <div className="kb-windowDragStripe kb-windowDragStripe--detail" aria-hidden />

  return (
    <div className="kb-pt-search">
      <div className="kb-pt-search-wrap kb-pt-search-wrap--withBack">
        <button
          type="button"
          className={`kb-pt-back${showBackWithSearch ? '' : ' kb-pt-back--inactive'}`}
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
        <search className="kb-pt-bar">
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
          <span aria-hidden className="kb-pt-bar-divider" />
          <button ref={filterButtonRef} type="button" className={filterChipCls} onClick={onToggleFilter}>
            {filterSummary} ▾
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
