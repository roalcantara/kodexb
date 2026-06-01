import { useEffect, useRef } from 'react'
import { useQuickLookupOverlay } from '../../hooks/shortcuts/use_quick_lookup_overlay.hook'
import { BindingsFilterModal } from './bindings_filter_modal.component'
import { QuickLookupHeader } from './quick_lookup_header.component'
import { QuickLookupResults } from './quick_lookup_results.component'

export type QuickLookupOverlayProps = {
  open: boolean
  search: string
  onSearchChange: (v: string) => void
  onClose: () => void
}

export function QuickLookupOverlay({ open, search, onSearchChange, onClose }: QuickLookupOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const overlay = useQuickLookupOverlay({ open, search, onClose })

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  if (!open) return null

  return (
    <section className="quick-lookup-overlay">
      <button type="button" className="quick-lookup-backdrop" onClick={onClose} aria-label="Close quick lookup" />
      <div
        className="quick-lookup-modal"
        role="dialog"
        aria-label="Quick lookup"
        aria-modal="true"
        tabIndex={-1}
        onKeyDown={overlay.handleKeyDown}
      >
        <QuickLookupHeader
          inputRef={inputRef}
          search={search}
          onSearchChange={onSearchChange}
          filterLabel={overlay.filterLabel}
          mode={overlay.mode}
          onOpenFilter={() => {
            overlay.setFilterModalOpen(true)
            overlay.setFilterSearch('')
          }}
        />

        <div className="quick-lookup-results" ref={overlay.listRef} role="listbox">
          <QuickLookupResults
            mode={overlay.mode}
            firstChordCard={overlay.firstChordCard}
            chordCards={overlay.chordCards}
            chordSteps={overlay.chordSteps}
            textRows={overlay.textRows}
            rows={overlay.rows}
            highlightIndex={overlay.highlightIndex}
            displayAdvisories={overlay.displayAdvisories}
            collisionsById={overlay.cache.collisionsById}
            onSelectIndex={index => {
              overlay.setHighlightIndex(index)
              overlay.scrollIntoView(index)
            }}
            recordVisit={overlay.recordVisit}
          />
        </div>

        <div className="quick-lookup-footer">
          <span>
            <b>↑↓</b> select
          </span>
          <span>
            <b>↵</b> detail
          </span>
          <span>
            <b>⇧⇥</b> mode
          </span>
          <span>
            <b>⌘K</b> filter
          </span>
        </div>
      </div>

      {overlay.filterModalOpen && (
        <BindingsFilterModal
          bindings={overlay.cache.all}
          filterMode={overlay.filterMode}
          onSelectFilter={overlay.handleFilterSelect}
          onClose={() => overlay.setFilterModalOpen(false)}
          onSearchChange={overlay.setFilterSearch}
          searchQ={overlay.filterSearch}
        />
      )}
    </section>
  )
}
