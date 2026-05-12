import { useEffect, useMemo, useRef, useState } from 'react'

export type CmdkAction = {
  id: string
  label: string
  shortcut?: string
  handler: () => void
}

export type CmdkPaletteProps = {
  open: boolean
  actions: CmdkAction[]
  onClose: () => void
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: extracted from CmdkPalette to keep parent under 50 lines
function PaletteContent({
  search,
  onSearchChange,
  inputRef,
  filtered,
  selectedIndex,
  onSelectedIndexChange,
  onClose
}: {
  search: string
  onSearchChange: (value: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  filtered: CmdkAction[]
  selectedIndex: number
  onSelectedIndexChange: (i: number) => void
  onClose: () => void
}) {
  return (
    <div
      className="kb-modal"
      role="dialog"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="kb-cmdk">
        <input
          ref={inputRef}
          className="kb-cmdk-search"
          type="text"
          placeholder="Type an action..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              onClose()
              return
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              onSelectedIndexChange(Math.min(selectedIndex + 1, filtered.length - 1))
              return
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              onSelectedIndexChange(Math.max(selectedIndex - 1, 0))
              return
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              const action = filtered[selectedIndex]
              if (action) {
                action.handler()
                onClose()
              }
            }
          }}
        />
        <div className="kb-cmdk-list">
          {filtered.length === 0 ? (
            <div className="kb-cmdk-empty">No matching actions</div>
          ) : (
            filtered.map((action, i) => (
              <div
                key={action.id}
                role="option"
                aria-selected={i === selectedIndex}
                tabIndex={-1}
                className={`kb-cmdk-action${i === selectedIndex ? ' kb-cmdk-action--selected' : ''}`}
                onClick={() => {
                  action.handler()
                  onClose()
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    action.handler()
                    onClose()
                  }
                }}
              >
                <span>{action.label}</span>
                {action.shortcut ? <span className="kb-cmdk-shortcut">{action.shortcut}</span> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function CmdkPalette({ open, actions, onClose }: CmdkPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return actions
    const q = search.toLowerCase()
    return actions.filter(a => a.label.toLowerCase().includes(q))
  }, [actions, search])

  useEffect(() => {
    if (open) {
      setSearch('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  if (!open) return null

  return (
    <PaletteContent
      search={search}
      onSearchChange={v => {
        setSearch(v)
        setSelectedIndex(0)
      }}
      inputRef={inputRef}
      filtered={filtered}
      selectedIndex={selectedIndex}
      onSelectedIndexChange={setSelectedIndex}
      onClose={onClose}
    />
  )
}
