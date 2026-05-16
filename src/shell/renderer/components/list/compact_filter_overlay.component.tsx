import type { CompactFilterOverlayHookProps } from '../../hooks/list/use_compact_filter_overlay.hook'
import { useCompactFilterOverlay } from '../../hooks/list/use_compact_filter_overlay.hook'
import { brandSvgAssetUrl } from '../../utils/shared/brand_icon_url.util'
import type { FilterRow } from './compact_filter_overlay_build_rows.util'
import { filterRowIconBasename } from './filter_row_icon_basename.util'

export type CompactFilterOverlayProps = CompactFilterOverlayHookProps & {
  pushToast?: (msg: string, type: 'success' | 'error') => void
  closeToList?: () => void
  isFullDetail?: boolean
}

type SectionedBlock = {
  title: string
  entries: Array<{ row: FilterRow; index: number }>
}

function CompactFilterSectionList({
  sectionedRows,
  highlightIndex,
  pickRow
}: {
  sectionedRows: SectionedBlock[]
  highlightIndex: number
  pickRow: (index: number, row: FilterRow) => void
}) {
  return (
    <>
      {sectionedRows.map(block => {
        const headingId = `kb-pt-filter-sec-${block.title.replace(/\s+/g, '-').toLowerCase()}`
        const sectionClass =
          block.title === 'Task views'
            ? 'kb-pt-filter-section-block kb-pt-filter-section-block--task-views'
            : 'kb-pt-filter-section-block'
        return (
          <section key={block.title} className={sectionClass} aria-labelledby={headingId}>
            <div id={headingId} className="kb-pt-filter-section">
              {block.title}
            </div>
            {block.entries.map(({ row, index: i }) => {
              const iconBasename = filterRowIconBasename(row)
              const countLabel = row.count === undefined ? '' : `, ${row.count} matches`
              return (
                <button
                  key={row.id}
                  type="button"
                  role="option"
                  data-compact-filter-row
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }}
                  aria-selected={i === highlightIndex}
                  aria-label={`${row.label}${countLabel}`}
                  className={`kb-pt-filter-option${row.isOn ? ' kb-pt-filter-option--selected' : ''}${i === highlightIndex ? ' kb-pt-filter-option--highlight' : ''}`}
                  tabIndex={-1}
                  onClick={() => pickRow(i, row)}
                >
                  <span className="kb-pt-filter-option-mark" aria-hidden="true">
                    {row.isOn ? '✓' : '\u00a0'}
                  </span>
                  <span className="kb-pt-filter-option-icon-slot" aria-hidden="true">
                    <img src={brandSvgAssetUrl(iconBasename)} alt="" width={20} height={20} decoding="async" />
                  </span>
                  <span className="kb-pt-filter-option-label">{row.label}</span>
                  <span className="kb-pt-filter-option-count">{row.count === undefined ? '' : row.count}</span>
                </button>
              )
            })}
          </section>
        )
      })}
    </>
  )
}

export function CompactFilterOverlay(props: CompactFilterOverlayProps) {
  const {
    search,
    setSearch,
    highlightIndex,
    searchInputRef,
    scrollRootRef,
    filterRows,
    facetSectionRows,
    scrollableSectionRows,
    handleKeyDown,
    pickRow
  } = useCompactFilterOverlay(props)

  return (
    <div
      className="kb-pt-filter-dropdown"
      onMouseDown={e => e.stopPropagation()}
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-label="Filter options"
    >
      <input
        ref={searchInputRef}
        className="kb-pt-filter-search"
        type="search"
        placeholder="Search filters…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        spellCheck={false}
      />
      <div ref={scrollRootRef} className="kb-pt-filter-scroll-root" data-compact-filter-scroll-root>
        <div className="kb-pt-filter-sticky-facets">
          <CompactFilterSectionList
            sectionedRows={facetSectionRows}
            highlightIndex={highlightIndex}
            pickRow={pickRow}
          />
        </div>
        <CompactFilterSectionList
          sectionedRows={scrollableSectionRows}
          highlightIndex={highlightIndex}
          pickRow={pickRow}
        />
        {filterRows.length === 0 ? <div className="kb-pt-filter-empty">No matching filters</div> : null}
      </div>
      <button type="button" className="kb-pt-filter-option kb-pt-filter-option--footer" onClick={props.onClose}>
        Close
      </button>
    </div>
  )
}
