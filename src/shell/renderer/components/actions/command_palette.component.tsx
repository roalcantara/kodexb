import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

export type CommandPaletteSection = 'entry' | 'clipboard' | 'source' | 'library' | 'app'

export const COMMAND_PALETTE_SECTION_LABEL: Record<CommandPaletteSection, string> = {
  entry: 'This entry',
  clipboard: 'Clipboard',
  source: 'Source',
  library: 'Library',
  app: 'App'
}

export type CommandPaletteAction = {
  id: string
  label: string
  section: CommandPaletteSection
  shortcut?: string
  handler: () => void
}

export type CommandPaletteProps = {
  open: boolean
  actions: CommandPaletteAction[]
  onClose: () => void
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: extracted from CommandPalette to keep parent under 50 lines
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
  filtered: CommandPaletteAction[]
  selectedIndex: number
  onSelectedIndexChange: (i: number) => void
  onClose: () => void
}) {
  return (
    <div
      className="cmp-modal"
      role="dialog"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="cmp-command-palette">
        <input
          ref={inputRef}
          className="cmp-command-palette-search"
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
        <div className="cmp-command-palette-list" role="listbox" aria-label="Command palette actions">
          {filtered.length === 0 ? (
            <div className="cmp-command-palette-empty">No matching actions</div>
          ) : (
            filtered.map((action, i) => {
              const prev = i > 0 ? filtered[i - 1] : undefined
              const showHeader = i === 0 || action.section !== prev?.section
              return (
                <Fragment key={action.id}>
                  {showHeader ? (
                    <div className="cmp-command-palette-section" role="presentation">
                      {COMMAND_PALETTE_SECTION_LABEL[action.section]}
                    </div>
                  ) : null}
                  <div
                    role="option"
                    aria-selected={i === selectedIndex}
                    tabIndex={-1}
                    className={`cmp-command-palette-action${i === selectedIndex ? ' cmp-command-palette-action--selected' : ''}`}
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
                    {action.shortcut ? <span className="cmp-command-palette-shortcut">{action.shortcut}</span> : null}
                  </div>
                </Fragment>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export function CommandPalette({ open, actions, onClose }: CommandPaletteProps) {
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
