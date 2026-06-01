import type { BindingRef } from '@shared/rpc'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  type BindingsFilterOption,
  buildBindingsFilterOptions,
  groupBindingsFilterOptions
} from '../../utils/shortcuts/bindings_filter_options.util'

export type BindingsFilterModalProps = {
  bindings: BindingRef[]
  filterMode: 'all' | 'globals' | string
  onSelectFilter: (mode: 'all' | 'globals' | string) => void
  onClose: () => void
  onSearchChange: (q: string) => void
  searchQ: string
}

type BindingsFilterOptionListProps = {
  sections: Map<string, BindingsFilterOption[]>
  options: BindingsFilterOption[]
  filterMode: 'all' | 'globals' | string
  highlightIndex: number
  onSelectFilter: (mode: 'all' | 'globals' | string) => void
  onClose: () => void
}

function BindingsFilterOptionList({
  sections,
  options,
  filterMode,
  highlightIndex,
  onSelectFilter,
  onClose
}: BindingsFilterOptionListProps) {
  return (
    <div className="quick-lookup-filter-list" role="listbox">
      {Array.from(sections.entries()).map(([section, sectionOptions]) => {
        const firstOption = sectionOptions[0]
        if (!firstOption) return null

        return (
          <div key={section} className="quick-lookup-filter-section">
            <div className="quick-lookup-filter-section-header">{section}</div>
            {sectionOptions.map(opt => {
              const optIndex = options.indexOf(opt)
              const isSelected = opt.id === filterMode
              const isHighlighted = optIndex === highlightIndex
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`quick-lookup-filter-option${isSelected ? ' quick-lookup-filter-option--selected' : ''}${isHighlighted ? ' quick-lookup-filter-option--highlight' : ''}`}
                  onClick={() => {
                    onSelectFilter(opt.id as 'all' | 'globals' | string)
                    onClose()
                  }}
                >
                  <span className="quick-lookup-filter-option-mark">{isSelected ? '✓' : '\u00a0'}</span>
                  <span className="quick-lookup-filter-option-label">{opt.label}</span>
                  <span className="quick-lookup-filter-option-count">{opt.count}</span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function useBindingsFilterKeyboard(
  options: BindingsFilterOption[],
  highlightIndex: number,
  setHighlightIndex: (value: number | ((prev: number) => number)) => void,
  onSelectFilter: (mode: 'all' | 'globals' | string) => void,
  onClose: () => void
) {
  return (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(prev => Math.min(prev + 1, options.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(prev => Math.max(prev - 1, 0))
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const selected = options[highlightIndex]
      if (selected) {
        onSelectFilter(selected.id as 'all' | 'globals' | string)
        onClose()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }
}

export function BindingsFilterModal({
  bindings,
  filterMode,
  onSelectFilter,
  onClose,
  onSearchChange,
  searchQ
}: BindingsFilterModalProps) {
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [])

  const options = useMemo(() => buildBindingsFilterOptions(bindings, searchQ), [bindings, searchQ])
  const sections = useMemo(() => groupBindingsFilterOptions(options), [options])
  const handleKeyDown = useBindingsFilterKeyboard(options, highlightIndex, setHighlightIndex, onSelectFilter, onClose)

  useEffect(() => {
    setHighlightIndex(0)
  }, [])

  return createPortal(
    <div className="quick-lookup-filter-stack">
      <button type="button" className="quick-lookup-filter-backdrop" onClick={onClose} aria-label="Close filter" />
      <div
        className="quick-lookup-filter-modal"
        role="dialog"
        aria-label="Filter bindings"
        aria-modal="true"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="quick-lookup-filter-header">
          <span className="quick-lookup-filter-title">Filter bindings</span>
          <span className="quick-lookup-filter-hint">↓↑ navigate · ⇥ apply · esc cancel</span>
        </div>
        <input
          ref={inputRef}
          className="quick-lookup-filter-search"
          placeholder="Filter apps…"
          value={searchQ}
          onChange={e => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <BindingsFilterOptionList
          sections={sections}
          options={options}
          filterMode={filterMode}
          highlightIndex={highlightIndex}
          onSelectFilter={onSelectFilter}
          onClose={onClose}
        />
      </div>
    </div>,
    document.body
  )
}
